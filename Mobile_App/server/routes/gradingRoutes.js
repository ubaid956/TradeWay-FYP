import express from 'express';
import { gradeMarbleController } from '../controllers/gradingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.post('/marble', gradeMarbleController);

export default router;
