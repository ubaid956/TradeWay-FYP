import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Bid from '../models/Bid.js';
import { generateAIRecommendations } from '../services/aiRecommendationService.js';

const buildUserProfile = async (userId) => {
  if (!userId) {
    return {
      userId: 'guest',
      role: 'buyer',
      favoriteCategories: ['marble'],
      averageBudget: 0,
      recentActions: [],
    };
  }

  const [orders, bids] = await Promise.all([
    Order.find({ buyer: userId })
      .populate('product', 'category price title tags')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Bid.find({ bidder: userId })
      .populate('product', 'category price title tags')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const categoryFrequency = {};
  const pricePoints = [];
  const recentActions = [];

  const collect = (records, type) => {
    records.forEach((record) => {
      if (!record.product) {
        return;
      }
      const category = record.product.category || 'unknown';
      categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
      if (record.product.price) {
        pricePoints.push(record.product.price);
      }
      recentActions.push({
        type,
        category,
        price: record.product.price,
        title: record.product.title,
      });
    });
  };

  collect(orders, 'order');
  collect(bids, 'bid');

  const favoriteCategories = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);

  const averageBudget = pricePoints.length
    ? Math.round(pricePoints.reduce((sum, value) => sum + value, 0) / pricePoints.length)
    : 0;

  return {
    userId: userId.toString(),
    role: 'buyer',
    favoriteCategories: favoriteCategories.length ? favoriteCategories : ['marble'],
    averageBudget,
    recentActions,
  };
};

const buildCandidateProducts = async () => {
  const products = await Product.find({
    category: { $in: ['marble', 'granite', 'limestone', 'onyx', 'travertine'] },
    isActive: true,
  })
    .populate('seller', 'name')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  const now = Date.now();

  return products.map((product) => {
    const freshnessDays = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 1 - freshnessDays / 90); // decay after 3 months

    const primaryImage = Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;

    return {
      productId: product._id.toString(),
      title: product.title,
      category: product.category,
      tags: product.tags || [],
      price: product.price,
      location: product.location,
      image: primaryImage,
      sellerName: typeof product.seller === 'object' ? product.seller?.name : undefined,
      freshnessScore: Number(freshnessScore.toFixed(2)),
      isSold: product.isSold,
    };
  });
};

export const getAIRecommendationsController = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const [userProfile, candidateProducts] = await Promise.all([
      buildUserProfile(userId),
      buildCandidateProducts(),
    ]);

    const recommendations = await generateAIRecommendations({
      userProfile,
      products: candidateProducts,
      limit: Number(req.query.limit) || 5,
    });

    const productsById = candidateProducts.reduce((acc, product) => {
      acc[product.productId] = product;
      return acc;
    }, {});

    const hydrated = recommendations
      .map((rec) => ({
        ...rec,
        product: productsById[rec.productId] || null,
      }))
      .filter((rec) => rec.product);

    res.json({
      success: true,
      count: hydrated.length,
      data: hydrated,
    });
  } catch (error) {
    next(error);
  }
};
