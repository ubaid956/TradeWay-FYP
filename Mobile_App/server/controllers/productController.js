import Product from '../models/Product.js';
import User from '../models/User.js';
import cloudinary from '../cloudinaryConfig.js';

// Create a new product (vendor posting)
export const createProduct = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            tags,
            price,
            quantity,
            unit,
            location,
            coordinates,
            specifications,
            availability,
            shipping
        } = req.body;

        // Validate required fields
        if (!title || !description || !category || !price || !quantity || !location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, description, type, category, price, quantity, location'
            });
        }

        // Get seller from authenticated user
        const seller = req.user.id;

        // Handle image uploads if any
        let images = [];
        if (req.files && req.files.images) {
            try {
                const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

                for (const file of files) {
                    console.log('Product image received:', {
                        name: file.name,
                        size: file.size,
                        mimetype: file.mimetype,
                        hasData: !!file.data,
                        isBuffer: Buffer.isBuffer(file.data)
                    });

                    console.log('Uploading to Cloudinary...');

                    // Use upload_stream for in-memory buffer (same as profile picture)
                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'auto',
                                folder: 'tradeway-products'
                            },
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary upload stream error:', error);
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            }
                        ).end(file.data);
                    });

                    console.log('Cloudinary upload successful:', result.secure_url);
                    images.push(result.secure_url);
                }
            } catch (uploadError) {
                console.error('Error uploading product images:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading images',
                    error: uploadError.message
                });
            }
        }

        // Create new product
        const product = new Product({
            seller,
            title,
            description,
            category,
            tags: tags || [],
            price,
            quantity,
            unit: unit || 'pieces',
            images,
            location,
            coordinates: coordinates || {},
            specifications: specifications || {},
            availability: {
                isAvailable: true,
                availableQuantity: quantity,
                minimumOrder: availability?.minimumOrder || 1,
                ...availability
            },
            shipping: shipping || {
                isShippingAvailable: false,
                shippingCost: 0,
                estimatedDelivery: 0
            }
        });

        await product.save();

        // Populate seller information
        await product.populate('seller', 'name email phone');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

// Get all products with filtering and pagination
export const getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            type,
            minPrice,
            maxPrice,
            location,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isActive: true, isSold: false };

        if (category) filter.category = category;
        if (type) filter.type = type;
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }
        if (location) filter.location = { $regex: location, $options: 'i' };
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find(filter)
            .populate('seller', 'name email phone')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: products,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalProducts: total,
                hasNext: skip + products.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// Get single product by ID
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate('seller', 'name email phone location')
            .populate('soldTo', 'name email phone');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
};

// Get products by seller (vendor's own products)
export const getProductsBySeller = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { seller: sellerId };
        if (status === 'active') filter.isActive = true;
        if (status === 'sold') filter.isSold = true;
        if (status === 'inactive') filter.isActive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find(filter)
            .populate('soldTo', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: products,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalProducts: total
            }
        });

    } catch (error) {
        console.error('Get products by seller error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching seller products',
            error: error.message
        });
    }
};

// Update product (only by seller)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user is the seller
        if (product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this product'
            });
        }

        // Check if product is already sold
        if (product.isSold) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update sold product'
            });
        }

        // Handle image uploads if any
        if (req.files && req.files.images) {
            try {
                const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                const newImages = [];

                for (const file of files) {
                    console.log('Product image received:', {
                        name: file.name,
                        size: file.size,
                        mimetype: file.mimetype,
                        hasData: !!file.data,
                        isBuffer: Buffer.isBuffer(file.data)
                    });

                    console.log('Uploading to Cloudinary...');

                    // Use upload_stream for in-memory buffer (same as profile picture)
                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'auto',
                                folder: 'tradeway-products'
                            },
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary upload stream error:', error);
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            }
                        ).end(file.data);
                    });

                    console.log('Cloudinary upload successful:', result.secure_url);
                    newImages.push(result.secure_url);
                }
                req.body.images = [...(product.images || []), ...newImages];
            } catch (uploadError) {
                console.error('Error uploading product images:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading images',
                    error: uploadError.message
                });
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).populate('seller', 'name email phone');

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
};

// Delete product (only by seller)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user is the seller
        if (product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this product'
            });
        }

        // Soft delete by setting isActive to false
        await Product.findByIdAndUpdate(id, {
            isActive: false,
            updatedAt: Date.now()
        });

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
};

// Mark product as sold
export const markProductAsSold = async (req, res) => {
    try {
        const { id } = req.params;
        const { soldTo, soldPrice } = req.body;
        const sellerId = req.user.id;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user is the seller
        if (product.seller.toString() !== sellerId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to mark this product as sold'
            });
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                isSold: true,
                soldTo,
                soldPrice: soldPrice || product.price,
                soldAt: Date.now(),
                isActive: false,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('soldTo', 'name email phone');

        res.json({
            success: true,
            message: 'Product marked as sold successfully',
            data: updatedProduct
        });

    } catch (error) {
        console.error('Mark product as sold error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking product as sold',
            error: error.message
        });
    }
};

// Get product categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Product.distinct('category', { isActive: true });

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get product statistics for seller
export const getProductStats = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const stats = await Product.aggregate([
            { $match: { seller: sellerId } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    activeProducts: {
                        $sum: { $cond: [{ $and: ['$isActive', { $not: '$isSold' }] }, 1, 0] }
                    },
                    soldProducts: { $sum: { $cond: ['$isSold', 1, 0] } },
                    totalRevenue: { $sum: { $cond: ['$isSold', '$soldPrice', 0] } },
                    averagePrice: { $avg: '$price' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                totalProducts: 0,
                activeProducts: 0,
                soldProducts: 0,
                totalRevenue: 0,
                averagePrice: 0
            }
        });

    } catch (error) {
        console.error('Get product stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product statistics',
            error: error.message
        });
    }
};
