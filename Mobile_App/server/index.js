import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import { createServer } from 'http';
import fileUpload from 'express-fileupload';
import admin from 'firebase-admin';

import connectDB from './config/db.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { stripeWebhook } from './controllers/paymentController.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import productRoutes from './routes/productRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import industryRoutes from './routes/industryRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import { protect, requireRoles } from './middleware/auth.js';
// import groupRoutes from './routes/groupRoutes.js';
// import errorHandler from './middleware/errorHandler.js';
// import initSocket from './utils/socket.js';

dotenv.config();

// ✅ Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert('./tradeway-89ff8-firebase-adminsdk-fbsvc-a13ee98017.json'),
    });
}

const app = express();
const httpServer = createServer(app);

// ✅ Middleware
app.use(helmet());
app.use(morgan('dev'));

// Preserve raw body for Stripe webhook verification
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use(cors({
    origin: '*'
}));


// ✅ File upload
app.use(fileUpload({
    useTempFiles: false, // Keep files in memory for Cloudinary
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}));

// ✅ Cloudinary config is handled in cloudinaryConfig.js

// ✅ Routes
app.use('/api/auth', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', protect, requireRoles('admin'), adminRoutes);
app.use('/api/industry', protect, requireRoles('admin'), industryRoutes);
// Payments
app.use('/api/payments', paymentRoutes);

// Stripe webhook endpoint (must be reachable by Stripe)
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
// app.use('/api/groups', groupRoutes);

// ✅ Error handling middleware (optional)
// app.use(errorHandler);

// ✅ Initialize Socket.io (optional)
// initSocket(httpServer);

// ✅ Start server after DB connection
connectDB()
    .then(() => {
        const PORT = process.env.PORT || 5000;
        httpServer.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err);
    });
