import { Router } from 'express';
import Order from '../models/Order.js';

const router = Router();

/** GET /api/admin/price-index?from&to&category=Carrara */
router.get('/price-index', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { from, to, category } = req.query;
  const match = {};
  if (from || to) match['o.createdAt'] = {};
  if (from) match['o.createdAt'].$gte = new Date(from);
  if (to)   match['o.createdAt'].$lte = new Date(to);
  if (category) match['p.category'] = category;

  const rows = await Order.aggregate([
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
    { $unwind: '$p' },
    { $replaceRoot: { newRoot: { o: '$$ROOT', p: '$p' } } },
    { $match: match },
    { $group: {
      _id: { period: { $dateTrunc: { date: '$o.createdAt', unit: 'month' } }, category: '$p.category' },
      avgPrice: { $avg: '$o.unitPrice' },
      volume: { $sum: '$o.quantity' }
    }},
    { $sort: { '_id.period': 1, '_id.category': 1 } }
  ]);

  res.json({ ok: true, index: rows.map(r => ({
    period: r._id.period,
    category: r._id.category,
    avgPrice: Math.round(r.avgPrice * 100) / 100,
    volume: r.volume
  })) });
});

export default router;
