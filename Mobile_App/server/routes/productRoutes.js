import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    getProductsBySeller,
    updateProduct,
    deleteProduct,
    markProductAsSold,
    getCategories,
    getProductStats,
    getProductTaxonomy
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getProducts); // Get all products with filtering
router.get('/categories', getCategories); // Get product categories
router.get('/taxonomy', getProductTaxonomy); // Get entire taxonomy payload
router.get('/seller/my-products', protect, getProductsBySeller); // Get seller's own products
router.get('/seller/stats', protect, getProductStats); // Get seller's product statistics
router.get('/:id', getProductById); // Get single product by ID

// Protected routes (require authentication)
router.use(protect);

// Product management routes (for vendors)
router.post('/', createProduct); // Create new product
router.put('/:id', updateProduct); // Update product
router.delete('/:id', deleteProduct); // Delete product (soft delete)
router.patch('/:id/sold', markProductAsSold); // Mark product as sold

export default router;
