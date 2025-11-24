import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRouter from './routes/auth.js';
import adminOverviewRouter from './routes/admin.overview.js';
import adminPriceRouter from './routes/admin.price.js';
import adminForecastRouter from './routes/admin.forecast.js';
import adminSellersRouter from './routes/admin.sellers.js';
import industryUpdatesRouter from './routes/industryUpdates.js';
import { auth, requireRoles } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);

// Secure all /api/admin/* and /api/industry/* with auth
app.use('/api/admin', auth, requireRoles('admin', 'analyst'), adminOverviewRouter);
app.use('/api/admin', auth, requireRoles('admin', 'analyst'), adminPriceRouter);
app.use('/api/admin', auth, requireRoles('admin', 'analyst'), adminForecastRouter);
app.use('/api/admin', auth, requireRoles('admin', 'analyst'), adminSellersRouter);
app.use('/api/industry', auth, requireRoles('admin', 'analyst'), industryUpdatesRouter);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Admin API running on :${PORT}`)))
  .catch(err => console.error('Mongo connection error:', err));
