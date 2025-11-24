import express from 'express';
import {
    createOrder,
    getSellerOrders,
    getBuyerOrders,
    getOrderById,
    updateOrderStatus,
    updateOrderDetails,
    addOrderRating,
    getOrderStats
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.use(protect);

// Order creation and management
router.post('/', createOrder); // Create new order from accepted bid
router.get('/seller', getSellerOrders); // Get seller's orders
router.get('/buyer', getBuyerOrders); // Get buyer's orders
router.get('/stats', getOrderStats); // Get order statistics
router.get('/:id', getOrderById); // Get single order by ID
router.patch('/:id/status', updateOrderStatus); // Update order status
router.patch('/:id/details', updateOrderDetails); // Update order details
router.patch('/:id/rating', addOrderRating); // Add rating to completed order

export default router;
