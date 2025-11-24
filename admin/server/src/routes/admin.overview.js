import { Router } from 'express';
import Order from '../models/Order.js';

const router = Router();

/** Helper: match by date */
function dateMatch(from, to) {
  const match = {};
  if (from || to) match.createdAt = {};
  if (from) match.createdAt.$gte = new Date(from);
  if (to)   match.createdAt.$lte = new Date(to);
  return match;
}

/** GET /api/admin/overview/cards?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get('/overview/cards', async (req, res) => {
  const { from, to } = req.query;
  const match = dateMatch(from, to);

  const [agg] = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      orders: { $sum: 1 },
      delivered: { $sum: { $cond: [ { $eq: ['$status','delivered'] }, 1, 0 ] } },
      cancelled: { $sum: { $cond: [ { $eq: ['$status','cancelled'] }, 1, 0 ] } },
      gmv: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
      asp: { $avg: '$unitPrice' }
    }}
  ]);

  const deliveredPct = (agg?.orders || 0) ? Math.round((agg.delivered / agg.orders) * 1000) / 10 : 0;

  res.json({ ok: true, cards: {
    orders: agg?.orders || 0,
    delivered: agg?.delivered || 0,
    cancelled: agg?.cancelled || 0,
    deliveredPct,
    gmv: Math.round((agg?.gmv || 0) * 100) / 100,
    asp: Math.round((agg?.asp || 0) * 100) / 100
  }});
});

/** GET /api/admin/overview/charts?from&to&gran=month|week */
router.get('/overview/charts', async (req, res) => {
  const { from, to, gran = 'month' } = req.query;
  const match = dateMatch(from, to);

  const unit = gran === 'week' ? 'week' : 'month';
  const dateExpr = { $dateTrunc: { date: '$createdAt', unit } };

  const rows = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: dateExpr,
      orders: { $sum: 1 },
      gmv: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
      asp: { $avg: '$unitPrice' }
    }},
    { $sort: { _id: 1 } }
  ]);

  res.json({ ok: true, series: rows.map(r => ({
    period: r._id,
    orders: r.orders,
    gmv: Math.round(r.gmv * 100) / 100,
    asp: Math.round(r.asp * 100) / 100
  }))});
});

export default router;
