import express from 'express';
import { register, login, getAllUsers, getUserById, emailVerify, verifyOtp, updatePassword, googleSignIn, updateProfile, getProfile, testCloudinary } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleSignIn);


router.get('/users', getAllUsers)

router.get('/users/:id', getUserById)
router.post('/users/forgot', emailVerify);

router.get('/users/profile', protect, getProfile);
router.put('/users/profile', protect, updateProfile);
router.get('/test-cloudinary', testCloudinary);

router.post('/users/verifyOtp', verifyOtp);
router.patch('/users/updatePassword', protect, updatePassword);

export default router;