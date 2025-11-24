import { Router } from 'express';
import Order from '../models/Order.js';
import { linearRegression, predictNext } from '../utils/regression.js';

const router = Router();

/** GET /api/admin/forecast?target=price|demand&category=&h=3 */
router.get('/forecast', async (req, res) => {
  const { target = 'price', category, h = '3' } = req.query;
  const horizon = Math.max(1, parseInt(h, 10));

  const pipeline = [
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
    { $unwind: '$p' },
    ...(category ? [{ $match: { 'p.category': category } }] : []),
    { $group: {
      _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
      avgPrice: { $avg: '$unitPrice' },
      demand: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ];
  const rows = await Order.aggregate(pipeline);

  const y = rows.map(r => target === 'price' ? r.avgPrice : r.demand);
  if (y.length < 2) return res.json({ ok: true, target, predictions: [] });

  const model = linearRegression(y);
  const preds = predictNext(model, horizon);

  res.json({ ok: true, target, fromPeriods: rows.length, predictions: preds });
});

export default router;
