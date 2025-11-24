import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';

// Create a new order (when bid is accepted)
export const createOrder = async (req, res) => {
    try {
        const { bidId, shippingAddress, paymentMethod, deliveryMethod, notes } = req.body;
        const sellerId = req.user.id;

        // Validate required fields
        if (!bidId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: bidId'
            });
        }

        // Get the bid and verify it's accepted
        const bid = await Bid.findById(bidId).populate('product');
        if (!bid) {
            return res.status(404).json({
                success: false,
                message: 'Bid not found'
            });
        }

        if (bid.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Bid must be accepted to create an order'
            });
        }

        // Check if user is the seller of the product
        if (bid.product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create order for this bid'
            });
        }

        // Check if order already exists for this bid
        const existingOrder = await Order.findOne({ bid: bidId });
        if (existingOrder) {
            return res.status(400).json({
                success: false,
                message: 'Order already exists for this bid'
            });
        }

        // Calculate order amounts
        const unitPrice = bid.bidAmount;
        const quantity = bid.quantity;
        const totalAmount = unitPrice * quantity;
        const shippingCost = bid.product.shipping?.shippingCost || 0;
        const finalAmount = totalAmount + shippingCost;

        // Create new order
        const order = new Order({
            buyer: bid.bidder,
            seller: sellerId,
            product: bid.product._id,
            bid: bidId,
            orderDetails: {
                quantity,
                unitPrice,
                totalAmount,
                shippingCost,
                finalAmount
            },
            shippingAddress: shippingAddress || {},
            payment: {
                method: paymentMethod || 'cash',
                status: 'pending'
            },
            delivery: {
                method: deliveryMethod || 'pickup',
                estimatedDelivery: bid.product.shipping?.estimatedDelivery
                    ? new Date(Date.now() + bid.product.shipping.estimatedDelivery * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
            },
            notes: {
                buyer: notes?.buyer || '',
                seller: notes?.seller || ''
            }
        });

        await order.save();

        // Populate order with related data
        await order.populate([
            { path: 'buyer', select: 'name email phone' },
            { path: 'seller', select: 'name email phone' },
            { path: 'product', select: 'title price images' },
            { path: 'bid', select: 'bidAmount quantity message' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// Get orders for seller (vendor)
export const getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { seller: sellerId };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(filter)
            .populate('buyer', 'name email phone')
            .populate('product', 'title price images')
            .populate('bid', 'bidAmount quantity message')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalOrders: total
            }
        });

    } catch (error) {
        console.error('Get seller orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching seller orders',
            error: error.message
        });
    }
};

// Get orders for buyer
export const getBuyerOrders = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { buyer: buyerId };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(filter)
            .populate('seller', 'name email phone')
            .populate('product', 'title price images')
            .populate('bid', 'bidAmount quantity message')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalOrders: total
            }
        });

    } catch (error) {
        console.error('Get buyer orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching buyer orders',
            error: error.message
        });
    }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await Order.findById(id)
            .populate('buyer', 'name email phone')
            .populate('seller', 'name email phone')
            .populate('product', 'title price images specifications')
            .populate('bid', 'bidAmount quantity message');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is either buyer or seller
        if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, reason } = req.body;
        const userId = req.user.id;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is either buyer or seller
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        // Validate status
        if (!['Active', 'Completed', 'Canceled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Active, Completed, or Canceled'
            });
        }

        // Update order based on status
        const updateData = { status };

        if (status === 'Completed') {
            updateData.completion = {
                completedAt: Date.now(),
                completedBy: order.seller.toString() === userId ? 'seller' : 'buyer',
                completionNotes: notes || ''
            };
        } else if (status === 'Canceled') {
            updateData.cancellation = {
                reason: reason || 'No reason provided',
                canceledBy: order.seller.toString() === userId ? 'seller' : 'buyer',
                canceledAt: Date.now(),
                refundAmount: order.orderDetails.finalAmount,
                refundStatus: 'pending'
            };
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'buyer', select: 'name email phone' },
            { path: 'seller', select: 'name email phone' },
            { path: 'product', select: 'title price images' },
            { path: 'bid', select: 'bidAmount quantity message' }
        ]);

        res.json({
            success: true,
            message: `Order ${status.toLowerCase()} successfully`,
            data: updatedOrder
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Update order details (shipping, payment, etc.)
export const updateOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { shippingAddress, payment, delivery, notes } = req.body;
        const userId = req.user.id;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is either buyer or seller
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        // Build update object
        const updateData = {};
        if (shippingAddress) updateData.shippingAddress = shippingAddress;
        if (payment) updateData.payment = { ...order.payment, ...payment };
        if (delivery) updateData.delivery = { ...order.delivery, ...delivery };
        if (notes) updateData.notes = { ...order.notes, ...notes };

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'buyer', select: 'name email phone' },
            { path: 'seller', select: 'name email phone' },
            { path: 'product', select: 'title price images' },
            { path: 'bid', select: 'bidAmount quantity message' }
        ]);

        res.json({
            success: true,
            message: 'Order details updated successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Update order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order details',
            error: error.message
        });
    }
};

// Add rating to completed order
export const addOrderRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        const userId = req.user.id;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is completed
        if (order.status !== 'Completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed orders'
            });
        }

        // Check if user is buyer or seller
        const isBuyer = order.buyer.toString() === userId;
        const isSeller = order.seller.toString() === userId;

        if (!isBuyer && !isSeller) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to rate this order'
            });
        }

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Update rating
        const updateData = {};
        if (isBuyer) {
            updateData['completion.rating.buyerRating'] = {
                rating,
                review: review || '',
                ratedAt: Date.now()
            };
        } else if (isSeller) {
            updateData['completion.rating.sellerRating'] = {
                rating,
                review: review || '',
                ratedAt: Date.now()
            };
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'buyer', select: 'name email phone' },
            { path: 'seller', select: 'name email phone' },
            { path: 'product', select: 'title price images' },
            { path: 'bid', select: 'bidAmount quantity message' }
        ]);

        res.json({
            success: true,
            message: 'Rating added successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Add order rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding rating',
            error: error.message
        });
    }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query; // 'seller' or 'buyer'

        let filter = {};
        if (type === 'seller') {
            filter = { seller: userId };
        } else if (type === 'buyer') {
            filter = { buyer: userId };
        } else {
            // Get stats for both if no type specified
            filter = { $or: [{ seller: userId }, { buyer: userId }] };
        }

        const stats = await Order.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$orderDetails.finalAmount' },
                    averageAmount: { $avg: '$orderDetails.finalAmount' }
                }
            }
        ]);

        const formattedStats = {
            Active: { count: 0, totalAmount: 0, averageAmount: 0 },
            Completed: { count: 0, totalAmount: 0, averageAmount: 0 },
            Canceled: { count: 0, totalAmount: 0, averageAmount: 0 }
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
        console.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order statistics',
            error: error.message
        });
    }
};
