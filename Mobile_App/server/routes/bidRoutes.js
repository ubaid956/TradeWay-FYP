import express from 'express';
import {
    createBid,
    getBidsForProduct,
    getBidsByBidder,
    acceptBid,
    rejectBid,
    withdrawBid,
    updateBid,
    getBidStats,
    getBidderStats,
    getVendorProposals,
    counterBid
} from '../controllers/bidController.js';
import { protect, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// All bid routes require authentication
router.use(protect);

// Bidder routes (for buyers)
router.post('/', requireRoles('buyer'), createBid); // Create new bid
router.get('/my-bids', requireRoles('buyer'), getBidsByBidder); // Get bidder's own bids
router.get('/my-stats', requireRoles('buyer'), getBidderStats); // Get bidder's bid statistics
router.patch('/:bidId', requireRoles('buyer'), updateBid); // Update a pending bid
router.patch('/:bidId/withdraw', requireRoles('buyer'), withdrawBid); // Withdraw a bid
router.patch('/:bidId/counter', requireRoles('buyer', 'vendor'), counterBid); // General counter offer

// Seller routes (for product owners)
router.get('/vendor/proposals', requireRoles('vendor'), getVendorProposals); // Get all proposals for vendor
router.get('/product/:productId', requireRoles('vendor'), getBidsForProduct); // Get bids for a specific product
router.get('/stats', requireRoles('vendor'), getBidStats); // Get seller's bid statistics
router.patch('/:bidId/accept', requireRoles('vendor'), acceptBid); // Accept a bid
router.patch('/:bidId/reject', requireRoles('vendor'), rejectBid); // Reject a bid

export default router;
