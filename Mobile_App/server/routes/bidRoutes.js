import express from 'express';
import {
    createBid,
    getBidsForProduct,
    getBidsByBidder,
    acceptBid,
    rejectBid,
    withdrawBid,
    getBidStats,
    getBidderStats,
    getVendorProposals
} from '../controllers/bidController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All bid routes require authentication
router.use(protect);

// Bidder routes (for buyers)
router.post('/', createBid); // Create new bid
router.get('/my-bids', getBidsByBidder); // Get bidder's own bids
router.get('/my-stats', getBidderStats); // Get bidder's bid statistics
router.patch('/:bidId/withdraw', withdrawBid); // Withdraw a bid

// Seller routes (for product owners)
router.get('/vendor/proposals', getVendorProposals); // Get all proposals for vendor
router.get('/product/:productId', getBidsForProduct); // Get bids for a specific product
router.get('/stats', getBidStats); // Get seller's bid statistics
router.patch('/:bidId/accept', acceptBid); // Accept a bid
router.patch('/:bidId/reject', rejectBid); // Reject a bid

export default router;
