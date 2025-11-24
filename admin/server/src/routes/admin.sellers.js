import { Router } from 'express';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/admin/sellers/table?from&to&sort=gmv|-cancelRate&limit=20&offset=0
 */
router.get('/sellers/table', async (req, res) => {
  const { from, to, sort = '-gmv', limit = '20', offset = '0' } = req.query;

  const match = {};
  if (from || to) match.createdAt = {};
  if (from) match.createdAt.$gte = new Date(from);
  if (to)   match.createdAt.$lte = new Date(to);

  const sortStage = {};
  const sortKey = sort.replace('-', '');
  sortStage[sortKey] = sort.startsWith('-') ? -1 : 1;

  const rows = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: '$sellerId',
      orders: { $sum: 1 },
      delivered: { $sum: { $cond: [{ $eq: ['$status','delivered'] }, 1, 0] } },
      cancelled: { $sum: { $cond: [{ $eq: ['$status','cancelled'] }, 1, 0] } },
      gmv: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
      asp: { $avg: '$unitPrice' }
    }},
    { $addFields: {
      cancelRate: {
        $cond: [{ $eq: ['$orders', 0] }, 0, { $divide: ['$cancelled', '$orders'] }]
      },
      deliveredPct: {
        $cond: [{ $eq: ['$orders', 0] }, 0, { $divide: ['$delivered', '$orders'] }]
      }
    }},
    { $sort: sortStage },
    { $skip: parseInt(offset, 10) },
    { $limit: parseInt(limit, 10) },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
    { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } }
  ]);

  res.json({ ok: true, rows: rows.map(r => ({
    sellerId: r._id,
    sellerName: r.seller?.fullName || '(unknown)',
    email: r.seller?.email || '',
    orders: r.orders,
    delivered: r.delivered,
    cancelled: r.cancelled,
    deliveredPct: Math.round((r.deliveredPct || 0) * 1000) / 10,
    cancelRate: Math.round((r.cancelRate || 0) * 1000) / 10,
    gmv: Math.round((r.gmv || 0) * 100) / 100,
    asp: Math.round((r.asp || 0) * 100) / 100
  }))});
});

export default router;
