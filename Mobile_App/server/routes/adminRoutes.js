import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Bid from '../models/Bid.js';
import { linearRegression, predictNext } from '../utils/regression.js';
import {
  listDriverKycRequests,
  getDriverKycRequest,
  approveDriverKyc,
  rejectDriverKyc,
} from '../controllers/kycController.js';

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

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

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

router.get('/users', async (req, res) => {
  try {
    const {
      search = '',
      role,
      page = '1',
      limit = '20',
      sort = '-createdAt'
    } = req.query;

    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (numericPage - 1) * numericLimit;

    const match = {};
    if (role) match.role = role;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      match.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const allowedSortFields = new Set(['createdAt', 'name', 'role', 'lastActive']);
    const sortField = sort?.replace('-', '') || 'createdAt';
    const sortDirection = sort?.startsWith('-') ? -1 : 1;
    const finalSortField = allowedSortFields.has(sortField) ? sortField : 'createdAt';

    const [total, users] = await Promise.all([
      User.countDocuments(match),
      User.find(match)
        .sort({ [finalSortField]: sortDirection })
        .skip(skip)
        .limit(numericLimit)
        .select('-password')
        .lean()
    ]);

    const userIds = users.map((user) => user._id);

    const defaultSummary = {
      products: { total: 0, active: 0, sold: 0 },
      bidsPlaced: 0,
      proposalsReceived: 0
    };

    if (userIds.length) {
      const [productStats, bidStats, sellerProductDocs] = await Promise.all([
        Product.aggregate([
          { $match: { seller: { $in: userIds } } },
          {
            $group: {
              _id: '$seller',
              totalProducts: { $sum: 1 },
              activeProducts: {
                $sum: {
                  $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                }
              },
              soldProducts: {
                $sum: {
                  $cond: [{ $eq: ['$isSold', true] }, 1, 0]
                }
              }
            }
          }
        ]),
        Bid.aggregate([
          { $match: { bidder: { $in: userIds } } },
          { $group: { _id: '$bidder', totalBids: { $sum: 1 } } }
        ]),
        Product.find({ seller: { $in: userIds } })
          .select('_id seller')
          .lean()
      ]);

      const productStatsMap = productStats.reduce((acc, row) => {
        acc.set(row._id.toString(), row);
        return acc;
      }, new Map());

      const bidStatsMap = bidStats.reduce((acc, row) => {
        acc.set(row._id.toString(), row.totalBids);
        return acc;
      }, new Map());

      const productSellerMap = sellerProductDocs.reduce((acc, doc) => {
        acc.set(doc._id.toString(), doc.seller.toString());
        return acc;
      }, new Map());

      const productIds = sellerProductDocs.map((doc) => doc._id);
      let proposalStats = [];
      if (productIds.length) {
        proposalStats = await Bid.aggregate([
          { $match: { product: { $in: productIds } } },
          { $group: { _id: '$product', totalProposals: { $sum: 1 } } }
        ]);
      }

      const proposalsByUser = proposalStats.reduce((acc, row) => {
        const sellerId = productSellerMap.get(row._id.toString());
        if (sellerId) {
          acc.set(sellerId, (acc.get(sellerId) || 0) + row.totalProposals);
        }
        return acc;
      }, new Map());

      users.forEach((user) => {
        const key = user._id.toString();
        const productData = productStatsMap.get(key);
        user.activitySummary = {
          products: {
            total: productData?.totalProducts || 0,
            active: productData?.activeProducts || 0,
            sold: productData?.soldProducts || 0
          },
          bidsPlaced: bidStatsMap.get(key) || 0,
          proposalsReceived: proposalsByUser.get(key) || 0
        };
      });
    } else {
      users.forEach((user) => {
        user.activitySummary = {
          products: { ...defaultSummary.products },
          bidsPlaced: defaultSummary.bidsPlaced,
          proposalsReceived: defaultSummary.proposalsReceived
        };
      });
    }

    return res.json({
      success: true,
      data: users,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit) || 0
      }
    });
  } catch (error) {
    console.error('Failed to load admin users:', error);
    return res.status(500).json({ success: false, message: 'Failed to load users', error: error.message });
  }
});

router.get('/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [productSummaryRow, totalBids, productIdDocs] = await Promise.all([
      Product.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$seller',
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            soldProducts: {
              $sum: { $cond: [{ $eq: ['$isSold', true] }, 1, 0] }
            }
          }
        }
      ]),
      Bid.countDocuments({ bidder: userId }),
      Product.find({ seller: userId }).select('_id').lean()
    ]);

    const productIds = productIdDocs.map((doc) => doc._id);

    const [products, bids, proposals, proposalCount] = await Promise.all([
      Product.find({ seller: userId })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      Bid.find({ bidder: userId })
        .sort({ createdAt: -1 })
        .limit(25)
        .populate('product', 'title price quantity isActive isSold seller')
        .lean(),
      productIds.length
        ? Bid.find({ product: { $in: productIds } })
            .sort({ createdAt: -1 })
            .limit(25)
            .populate('bidder', 'name email phone location')
            .populate('product', 'title price quantity seller')
            .lean()
        : [],
      productIds.length ? Bid.countDocuments({ product: { $in: productIds } }) : 0
    ]);

    const summary = {
      products: {
        total: productSummaryRow?.[0]?.totalProducts || 0,
        active: productSummaryRow?.[0]?.activeProducts || 0,
        sold: productSummaryRow?.[0]?.soldProducts || 0
      },
      bidsPlaced: totalBids || 0,
      proposalsReceived: proposalCount || 0
    };

    return res.json({
      success: true,
      data: {
        user,
        summary,
        products,
        bids,
        proposals
      }
    });
  } catch (error) {
    console.error('Failed to load admin user activity:', error);
    return res.status(500).json({ success: false, message: 'Failed to load user activity', error: error.message });
  }
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const updatableFields = ['name', 'email', 'phone', 'role', 'bio', 'location', 'language', 'isKYCVerified'];
    const updates = {};
    updatableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body?.driverProfile?.verificationStatus) {
      updates['driverProfile.verificationStatus'] = req.body.driverProfile.verificationStatus;
      if (req.body.driverProfile.verificationStatus === 'verified') {
        updates['driverProfile.verifiedAt'] = new Date();
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Failed to update user:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const products = await Product.find({ seller: userId }).select('_id');
    const productIds = products.map((product) => product._id);

    await Promise.all([
      Bid.deleteMany({ bidder: userId }),
      productIds.length ? Bid.deleteMany({ product: { $in: productIds } }) : Promise.resolve(),
      productIds.length ? Product.deleteMany({ _id: { $in: productIds } }) : Promise.resolve()
    ]);

    await user.deleteOne();

    return res.json({
      success: true,
      message: 'User and related records deleted',
      removedProducts: productIds.length
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
});

router.patch('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    const allowedFields = [
      'title',
      'description',
      'price',
      'quantity',
      'unit',
      'category',
      'tags',
      'location',
      'availability',
      'shipping',
      'isActive',
      'isSold',
      'soldPrice',
      'soldAt'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No valid product fields provided' });
    }

    updates.updatedAt = new Date();

    const product = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('Failed to update product:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
});

router.delete('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Promise.all([
      Bid.deleteMany({ product: productId }),
      product.deleteOne()
    ]);

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
});

router.get('/drivers/kyc', listDriverKycRequests);
router.get('/drivers/kyc/:kycId', getDriverKycRequest);
router.post('/drivers/kyc/:kycId/approve', approveDriverKyc);
router.post('/drivers/kyc/:kycId/reject', rejectDriverKyc);

export default router;
