import express from 'express';
import { getAIRecommendationsController } from '../controllers/recommendationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getAIRecommendationsController);

export default router;
