import express from 'express';
import { protect } from '../middleware/auth.js';
import { createGroup, getUserGroups, setCurrentGroup } from '../controllers/groupController.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.patch('/current', setCurrentGroup);

export default router;
