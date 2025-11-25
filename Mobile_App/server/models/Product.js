// models/Product.js
import mongoose from 'mongoose';
import {
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_UNIT_VALUES,
  PRODUCT_FINISH_VALUES,
  PRODUCT_GRADE_VALUES,
  DEFAULT_PRODUCT_UNIT,
  DEFAULT_PRODUCT_CATEGORY
} from '../../shared/taxonomy.js';

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    required: true,
    enum: PRODUCT_CATEGORY_VALUES,
    default: DEFAULT_PRODUCT_CATEGORY
  },
  tags: [String],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: PRODUCT_UNIT_VALUES,
    default: DEFAULT_PRODUCT_UNIT
  },
  images: [String],
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  specifications: {
    color: String,
    finish: { type: String, enum: PRODUCT_FINISH_VALUES },
    thickness: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    origin: String,
    grade: {
      type: String,
      enum: PRODUCT_GRADE_VALUES,
      lowercase: true,
      trim: true
    }
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableQuantity: Number,
    minimumOrder: Number
  },
  shipping: {
    isShippingAvailable: { type: Boolean, default: false },
    shippingCost: Number,
    estimatedDelivery: Number // in days
  },
  grading: {
    status: {
      type: String,
      enum: ['not_requested', 'pending', 'completed', 'failed'],
      default: 'not_requested'
    },
    grade: {
      type: String,
      enum: [...PRODUCT_GRADE_VALUES, 'reject'],
      lowercase: true,
      trim: true
    },
    confidence: Number,
    summary: String,
    issues: [
      {
        label: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        details: String
      }
    ],
    recommendations: [String],
    evaluatedImages: [
      {
        url: String,
        label: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    metadata: {
      model: {
        name: String,
        version: String,
        provider: String
      },
      promptVersion: String
    },
    rawResponse: mongoose.Schema.Types.Mixed,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: Date,
    completedAt: Date,
    lastError: String
  },
  isActive: { type: Boolean, default: true },
  isSold: { type: Boolean, default: false },
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: Date,
  soldPrice: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
