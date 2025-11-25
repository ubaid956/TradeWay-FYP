import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import {
	createRequirement,
	deleteRequirement,
	getRequirementById,
	getRequirements,
	getUserRequirements,
	updateRequirement,
} from '../controllers/requirementController.js';

const router = express.Router();

router.use(protect);

router.get('/', getRequirements);
router.get('/user', getUserRequirements);
router.get('/:requirementId', getRequirementById);

router.post('/', requireRoles('buyer', 'admin'), createRequirement);
router.put('/:requirementId', requireRoles('buyer', 'admin'), updateRequirement);
router.delete('/:requirementId', requireRoles('buyer', 'admin'), deleteRequirement);

export default router;
