import Bid from '../models/Bid.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

// Create a new bid
export const createBid = async (req, res) => {
    try {
        const { productId, bidAmount, quantity, message } = req.body;
        const bidderId = req.user._id || req.user.id;

        // Validate required fields
        if (!productId || !bidAmount || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: productId, bidAmount, quantity'
            });
        }

        // Check if product exists and is available
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is active and not sold
        if (!product.isActive || product.isSold) {
            return res.status(400).json({
                success: false,
                message: 'Product is not available for bidding'
            });
        }

        // Check if user is not the seller
        if (product.seller.toString() === bidderId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot bid on your own product'
            });
        }

        // Check if bid amount is valid
        if (bidAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Bid amount must be greater than 0'
            });
        }

        // Check if quantity is available
        if (quantity > product.availability.availableQuantity) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity exceeds available quantity'
            });
        }

        // Check if user already has a pending bid on this product
        const existingBid = await Bid.findOne({
            bidder: bidderId,
            product: productId,
            status: 'pending'
        });

        if (existingBid) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending bid on this product'
            });
        }

        // Create new bid
        const bid = new Bid({
            bidder: bidderId,
            product: productId,
            bidAmount,
            quantity,
            message: message || ''
        });

        await bid.save();

        // Populate bid with user and product information
        await bid.populate([
            { path: 'bidder', select: 'name email phone' },
            { path: 'product', select: 'title price seller' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Bid created successfully',
            data: bid
        });

    } catch (error) {
        console.error('Create bid error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating bid',
            error: error.message
        });
    }
};

// Get all bids for a product (for sellers)
export const getBidsForProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user._id || req.user.id;

        // Verify that the user is the seller of the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view bids for this product'
            });
        }

        const { page = 1, limit = 10, status } = req.query;

        const filter = { product: productId };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bids = await Bid.find(filter)
            .populate('bidder', 'name email phone location')
            .sort({ bidAmount: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Bid.countDocuments(filter);

        res.json({
            success: true,
            data: bids,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalBids: total
            }
        });

    } catch (error) {
        console.error('Get bids for product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bids',
            error: error.message
        });
    }
};

// Get bids by bidder (for buyers)
export const getBidsByBidder = async (req, res) => {
    try {
        const bidderId = req.user._id || req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { bidder: bidderId };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bids = await Bid.find(filter)
            .populate('product', 'title price images seller')
            .populate('product.seller', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Bid.countDocuments(filter);

        res.json({
            success: true,
            data: bids,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalBids: total
            }
        });

    } catch (error) {
        console.error('Get bids by bidder error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bids',
            error: error.message
        });
    }
};

// Accept a bid (seller action)
export const acceptBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const sellerId = req.user._id || req.user.id;

        const bid = await Bid.findById(bidId).populate('product');
        if (!bid) {
            return res.status(404).json({
                success: false,
                message: 'Bid not found'
            });
        }

        // Check if user is the seller of the product
        if (bid.product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to accept this bid'
            });
        }

        // Check if bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bid is no longer pending'
            });
        }

        // Check if product is still available
        if (!bid.product.isActive || bid.product.isSold) {
            return res.status(400).json({
                success: false,
                message: 'Product is no longer available'
            });
        }

        // Update bid status
        bid.status = 'accepted';
        bid.sellerResponse = {
            message: req.body.message || 'Bid accepted',
            respondedAt: Date.now()
        };
        await bid.save();

        // Reject all other pending bids for this product
        await Bid.updateMany(
            {
                product: bid.product._id,
                _id: { $ne: bidId },
                status: 'pending'
            },
            {
                status: 'rejected',
                sellerResponse: {
                    message: 'Another bid was accepted',
                    respondedAt: Date.now()
                }
            }
        );

        // Mark product as sold
        await Product.findByIdAndUpdate(bid.product._id, {
            isSold: true,
            soldTo: bid.bidder,
            soldPrice: bid.bidAmount,
            soldAt: Date.now(),
            isActive: false
        });

        // Create order automatically when bid is accepted
        const unitPrice = bid.bidAmount;
        const quantity = bid.quantity;
        const totalAmount = unitPrice * quantity;
        const shippingCost = bid.product.shipping?.shippingCost || 0;
        const finalAmount = totalAmount + shippingCost;

        const order = new Order({
            buyer: bid.bidder,
            seller: bid.product.seller,
            product: bid.product._id,
            bid: bidId,
            orderDetails: {
                quantity,
                unitPrice,
                totalAmount,
                shippingCost,
                finalAmount
            },
            payment: {
                method: 'cash',
                status: 'pending'
            },
            delivery: {
                method: 'pickup',
                estimatedDelivery: bid.product.shipping?.estimatedDelivery
                    ? new Date(Date.now() + bid.product.shipping.estimatedDelivery * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
            }
        });

        await order.save();

        // Populate the accepted bid
        await bid.populate([
            { path: 'bidder', select: 'name email phone' },
            { path: 'product', select: 'title price' }
        ]);

        res.json({
            success: true,
            message: 'Bid accepted successfully',
            data: bid
        });

    } catch (error) {
        console.error('Accept bid error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting bid',
            error: error.message
        });
    }
};

// Reject a bid (seller action)
export const rejectBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const sellerId = req.user._id || req.user.id;

        const bid = await Bid.findById(bidId).populate('product');
        if (!bid) {
            return res.status(404).json({
                success: false,
                message: 'Bid not found'
            });
        }

        // Check if user is the seller of the product
        if (bid.product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to reject this bid'
            });
        }

        // Check if bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bid is no longer pending'
            });
        }

        // Update bid status
        bid.status = 'rejected';
        bid.sellerResponse = {
            message: req.body.message || 'Bid rejected',
            respondedAt: Date.now()
        };
        await bid.save();

        // Populate the rejected bid
        await bid.populate([
            { path: 'bidder', select: 'name email phone' },
            { path: 'product', select: 'title price' }
        ]);

        res.json({
            success: true,
            message: 'Bid rejected successfully',
            data: bid
        });

    } catch (error) {
        console.error('Reject bid error:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting bid',
            error: error.message
        });
    }
};

// Withdraw a bid (bidder action)
export const withdrawBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const bidderId = req.user._id || req.user.id;

        const bid = await Bid.findById(bidId);
        if (!bid) {
            return res.status(404).json({
                success: false,
                message: 'Bid not found'
            });
        }

        // Check if user is the bidder
        if (bid.bidder.toString() !== bidderId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to withdraw this bid'
            });
        }

        // Check if bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bid is no longer pending'
            });
        }

        // Update bid status
        bid.status = 'withdrawn';
        await bid.save();

        res.json({
            success: true,
            message: 'Bid withdrawn successfully',
            data: bid
        });

    } catch (error) {
        console.error('Withdraw bid error:', error);
        res.status(500).json({
            success: false,
            message: 'Error withdrawing bid',
            error: error.message
        });
    }
};

// Get all proposals for vendor (across all their products)
export const getVendorProposals = async (req, res) => {
    try {
        const sellerId = req.user._id || req.user.id;
        const { page = 1, limit = 20, status } = req.query;

        // Get all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select('_id title');
        const productIds = sellerProducts.map(product => product._id);

        if (productIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalProposals: 0
                }
            });
        }

        // Build filter
        const filter = { product: { $in: productIds } };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bids = await Bid.find(filter)
            .populate('bidder', 'name email phone pic location')
            .populate('product', 'title price images seller')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Bid.countDocuments(filter);

        res.json({
            success: true,
            data: bids,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalProposals: total
            }
        });

    } catch (error) {
        console.error('Get vendor proposals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor proposals',
            error: error.message
        });
    }
};

// Get bid statistics for seller
export const getBidStats = async (req, res) => {
    try {
        const sellerId = req.user._id || req.user.id;

        // Get all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select('_id');

        const productIds = sellerProducts.map(product => product._id);

        const stats = await Bid.aggregate([
            { $match: { product: { $in: productIds } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$bidAmount' },
                    averageAmount: { $avg: '$bidAmount' }
                }
            }
        ]);

        const formattedStats = {
            pending: { count: 0, totalAmount: 0, averageAmount: 0 },
            accepted: { count: 0, totalAmount: 0, averageAmount: 0 },
            rejected: { count: 0, totalAmount: 0, averageAmount: 0 },
            withdrawn: { count: 0, totalAmount: 0, averageAmount: 0 }
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = {
                count: stat.count,
                totalAmount: stat.totalAmount,
                averageAmount: Math.round(stat.averageAmount * 100) / 100
            };
        });

        res.json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Get bid stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bid statistics',
            error: error.message
        });
    }
};

// Get bid statistics for bidder
export const getBidderStats = async (req, res) => {
    try {
        const bidderId = req.user._id || req.user.id;

        const stats = await Bid.aggregate([
            { $match: { bidder: bidderId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$bidAmount' },
                    averageAmount: { $avg: '$bidAmount' }
                }
            }
        ]);

        const formattedStats = {
            pending: { count: 0, totalAmount: 0, averageAmount: 0 },
            accepted: { count: 0, totalAmount: 0, averageAmount: 0 },
            rejected: { count: 0, totalAmount: 0, averageAmount: 0 },
            withdrawn: { count: 0, totalAmount: 0, averageAmount: 0 }
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = {
                count: stat.count,
                totalAmount: stat.totalAmount,
                averageAmount: Math.round(stat.averageAmount * 100) / 100
            };
        });

        res.json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Get bidder stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bidder statistics',
            error: error.message
        });
    }
};
