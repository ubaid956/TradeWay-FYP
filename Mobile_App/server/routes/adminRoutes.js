import { Router } from 'express';
import Product from '../models/Product.js';
import { linearRegression, predictNext } from '../utils/regression.js';

const router = Router();

const salePriceExpr = { $ifNull: ['$soldPrice', '$price'] };
const saleQuantityExpr = { $ifNull: ['$quantity', 1] };
const saleAmountExpr = { $multiply: [salePriceExpr, saleQuantityExpr] };
const saleDateExpr = { $ifNull: ['$soldAt', '$createdAt'] };
const statusExpr = {
  $switch: {
    branches: [
      { case: { $eq: ['$isSold', true] }, then: 'Completed' },
      { case: { $eq: ['$isActive', false] }, then: 'Canceled' }
    ],
    default: 'Active'
  }
};
const categoryExpr = { $ifNull: ['$specifications.color', '$category'] };

const withDerivedFields = {
  $addFields: {
    salePrice: salePriceExpr,
    saleQuantity: saleQuantityExpr,
    saleAmount: saleAmountExpr,
    saleDate: saleDateExpr,
    status: statusExpr,
    categoryKey: categoryExpr
  }
};

function buildDateMatch(from, to) {
  if (!from && !to) return {};
  const saleDate = {};
  if (from) saleDate.$gte = new Date(from);
  if (to) saleDate.$lte = new Date(to);
  return { saleDate };
}

function formatPeriod(value, granularity = 'month') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (granularity === 'week') {
    return date.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

function roundCurrency(value = 0) {
  return Math.round(value * 100) / 100;
}

const CATEGORY_ALIAS = {
  Carrara: 'White',
  Travertine: 'Beige',
  Emperador: 'Brown',
  Calacatta: 'Cream',
  Statuario: 'Grey'
};

function normalizeCategory(category) {
  if (!category) return null;
  const trimmed = category.trim();
  return CATEGORY_ALIAS[trimmed] || trimmed;
}

router.get('/overview/cards', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateMatch = buildDateMatch(from, to);
    const [agg] = await Product.aggregate([
      withDerivedFields,
      {
        $match: {
          status: { $in: ['Completed', 'Canceled'] },
          ...dateMatch
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Canceled'] }, 1, 0] } },
          gmv: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$saleAmount', 0] } },
          asp: { $avg: { $cond: [{ $eq: ['$status', 'Completed'] }, '$salePrice', null] } }
        }
      }
    ]);

    const totalOrders = agg?.orders || 0;
    const delivered = agg?.delivered || 0;
    const cancelled = agg?.cancelled || 0;
    const deliveredPct = totalOrders ? Math.round((delivered / totalOrders) * 1000) / 10 : 0;

    return res.json({
      ok: true,
      totalOrders,
      delivered,
      cancelled,
      deliveredPct,
      GMV: roundCurrency(agg?.gmv || 0),
      ASP: roundCurrency(agg?.asp || 0)
    });
  } catch (error) {
    console.error('Failed to load admin overview cards:', error);
    return res.status(500).json({ message: 'Failed to load overview cards' });
  }
});

router.get('/overview/charts', async (req, res) => {
  try {
    const { from, to, gran = 'month' } = req.query;
    const match = buildDateMatch(from, to);
    const unit = gran === 'week' ? 'week' : 'month';
    const rows = await Product.aggregate([
      withDerivedFields,
      {
        $match: {
          status: { $in: ['Completed', 'Canceled'] },
          ...match
        }
      },
      {
        $group: {
          _id: { $dateTrunc: { date: '$saleDate', unit } },
          orders: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          gmv: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$saleAmount', 0] } },
          aspSum: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$salePrice', 0] } },
          aspCount: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const labels = rows.map((row) => formatPeriod(row._id, unit));

    return res.json({
      ok: true,
      labels,
      orders: rows.map((row) => row.orders || 0),
      gmv: rows.map((row) => roundCurrency(row.gmv || 0)),
      asp: rows.map((row) => {
        if (!row.aspCount) return 0;
        return roundCurrency((row.aspSum || 0) / row.aspCount);
      })
    });
  } catch (error) {
    console.error('Failed to load admin overview charts:', error);
    return res.status(500).json({ message: 'Failed to load overview charts' });
  }
});

router.get('/price-index', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { from, to, category } = req.query;
    const match = buildDateMatch(from, to);
    const normalizedCategory = normalizeCategory(category);

    const rows = await Product.aggregate([
      withDerivedFields,
      {
        $match: {
          status: 'Completed',
          ...match,
          ...(normalizedCategory ? { categoryKey: normalizedCategory } : {})
        }
      },
      {
        $group: {
          _id: {
            period: { $dateTrunc: { date: '$saleDate', unit: 'month' } },
            category: '$categoryKey'
          },
          avgPrice: { $avg: '$salePrice' },
          volume: { $sum: '$saleQuantity' }
        }
      },
      { $sort: { '_id.period': 1 } }
    ]);

    return res.json({
      ok: true,
      index: rows.map((row) => ({
        period: formatPeriod(row._id.period),
        category: row._id.category || 'Uncategorized',
        avgPrice: roundCurrency(row.avgPrice || 0),
        volume: row.volume || 0
      }))
    });
  } catch (error) {
    console.error('Failed to load admin price index:', error);
    return res.status(500).json({ message: 'Failed to load price index' });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    const { target = 'price', category, h = '3' } = req.query;
    const horizon = Math.max(1, parseInt(h, 10) || 3);

    const normalizedCategory = normalizeCategory(category);

    const rows = await Product.aggregate([
      withDerivedFields,
      {
        $match: {
          status: 'Completed',
          ...(normalizedCategory ? { categoryKey: normalizedCategory } : {})
        }
      },
      {
        $group: {
          _id: { $dateTrunc: { date: '$saleDate', unit: 'month' } },
          avgPrice: { $avg: '$salePrice' },
          demand: { $sum: '$saleQuantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const series = rows.map((row) =>
      target === 'price' ? row.avgPrice || 0 : row.demand || 0
    );

    if (series.length < 2) {
      return res.json({ ok: true, target, predictions: [] });
    }

    const model = linearRegression(series);
    const preds = predictNext(model, horizon);
    const lastPeriod = rows[rows.length - 1]._id
      ? new Date(rows[rows.length - 1]._id)
      : new Date();

    const predictions = preds.map((rawValue, idx) => {
      const value = target === 'price' ? roundCurrency(rawValue) : Math.max(0, Math.round(rawValue));
      const periodDate = new Date(lastPeriod);
      periodDate.setMonth(periodDate.getMonth() + idx + 1);
      return {
        period: formatPeriod(periodDate),
        value
      };
    });

    return res.json({ ok: true, target, predictions });
  } catch (error) {
    console.error('Failed to load admin forecast:', error);
    return res.status(500).json({ message: 'Failed to load forecast' });
  }
});

router.get('/sellers/table', async (req, res) => {
  try {
    const { from, to, sort = '-gmv', limit = '20', offset = '0' } = req.query;
    const match = buildDateMatch(from, to);

    let sortField = sort.replace('-', '');
    const sortDirection = sort.startsWith('-') ? -1 : 1;
    const allowedSortFields = new Set(['gmv', 'orders', 'deliveredPct', 'cancelRate', 'asp']);
    if (!allowedSortFields.has(sortField)) {
      sortField = 'gmv';
    }

    const rows = await Product.aggregate([
      withDerivedFields,
      {
        $match: {
          status: { $in: ['Completed', 'Canceled'] },
          ...match
        }
      },
      {
        $group: {
          _id: '$seller',
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Canceled'] }, 1, 0] } },
          gmv: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$saleAmount', 0] } },
          aspSum: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$salePrice', 0] } },
          aspCount: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          deliveredPct: {
            $cond: [
              { $eq: ['$orders', 0] },
              0,
              { $divide: ['$delivered', '$orders'] }
            ]
          },
          cancelRate: {
            $cond: [
              { $eq: ['$orders', 0] },
              0,
              { $divide: ['$cancelled', '$orders'] }
            ]
          },
          asp: {
            $cond: [
              { $eq: ['$aspCount', 0] },
              0,
              { $divide: ['$aspSum', '$aspCount'] }
            ]
          }
        }
      },
      { $sort: { [sortField]: sortDirection } },
      { $skip: Math.max(0, parseInt(offset, 10) || 0) },
      { $limit: Math.max(1, parseInt(limit, 10) || 20) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }
      },
      {
        $unwind: {
          path: '$seller',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    const formatted = rows.map((row) => ({
      seller: row.seller
        ? {
            name: row.seller.name,
            email: row.seller.email,
            location: row.seller.location
          }
        : null,
      orders: row.orders || 0,
      delivered: row.delivered || 0,
      cancelled: row.cancelled || 0,
      deliveredPct: Math.round(((row.deliveredPct || 0) * 1000)) / 10,
      cancelRate: Math.round(((row.cancelRate || 0) * 1000)) / 10,
      gmv: roundCurrency(row.gmv || 0),
      asp: roundCurrency(row.asp || 0)
    }));

    return res.json({ ok: true, rows: formatted });
  } catch (error) {
    console.error('Failed to load admin sellers table:', error);
    return res.status(500).json({ message: 'Failed to load sellers table' });
  }
});

export default router;
