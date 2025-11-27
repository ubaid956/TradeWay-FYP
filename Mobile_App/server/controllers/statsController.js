import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get comprehensive vendor statistics
export const getVendorStats = async (req, res) => {
    try {
        const vendorId = new mongoose.Types.ObjectId(req.user.id);

        // Get product stats (total listings)
        const productStats = await Product.aggregate([
            { $match: { seller: vendorId } },
            {
                $group: {
                    _id: null,
                    totalListings: { $sum: 1 },
                    activeListings: {
                        $sum: { $cond: [{ $and: ['$isActive', { $not: '$isSold' }] }, 1, 0] }
                    }
                }
            }
        ]);

        // Get order stats (total orders as vendor/seller)
        const orderStats = await Order.aggregate([
            { $match: { seller: vendorId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                    totalRevenue: { $sum: '$orderDetails.finalAmount' }
                }
            }
        ]);

        // Get vendor rating from User model
        const vendor = await User.findById(vendorId).select('rating');

        const stats = {
            totalListings: productStats[0]?.totalListings || 0,
            activeListings: productStats[0]?.activeListings || 0,
            totalOrders: orderStats[0]?.totalOrders || 0,
            completedOrders: orderStats[0]?.completedOrders || 0,
            totalRevenue: orderStats[0]?.totalRevenue || 0,
            rating: vendor?.rating || 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get vendor stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor statistics',
            error: error.message
        });
    }
};

// Get comprehensive buyer statistics
export const getBuyerStats = async (req, res) => {
    try {
        const buyerId = new mongoose.Types.ObjectId(req.user.id);

        // Get order stats (total orders as buyer)
        const orderStats = await Order.aggregate([
            { $match: { buyer: buyerId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                    totalSpent: { $sum: '$orderDetails.finalAmount' }
                }
            }
        ]);

        // Get buyer rating from User model
        const buyer = await User.findById(buyerId).select('rating');

        const stats = {
            totalOrders: orderStats[0]?.totalOrders || 0,
            completedOrders: orderStats[0]?.completedOrders || 0,
            totalSpent: orderStats[0]?.totalSpent || 0,
            rating: buyer?.rating || 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get buyer stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching buyer statistics',
            error: error.message
        });
    }
};
