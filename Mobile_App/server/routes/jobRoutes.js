import express from 'express';
import {
	createJob,
	getVendorJobs,
	getDriverJobs,
	getJobById,
	assignJob,
	updateJobStatus
} from '../controllers/jobController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createJob);
router.get('/vendor', getVendorJobs);
router.get('/driver', getDriverJobs);
router.get('/:jobId', getJobById);
router.post('/:jobId/assign', assignJob);
router.patch('/:jobId/status', updateJobStatus);

export default router;
