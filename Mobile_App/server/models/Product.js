// models/Product.js
import mongoose from 'mongoose';

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
    enum: ['marble', 'granite', 'limestone', 'travertine', 'onyx', 'quartz', 'other']
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
    enum: ['pieces', 'tons', 'cubic_meters', 'square_meters', 'kg', 'lbs'],
    default: 'pieces'
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
    finish: { type: String, enum: ['polished', 'honed', 'brushed', 'leathered', 'natural'] },
    thickness: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    origin: String,
    grade: { type: String, enum: ['premium', 'standard', 'commercial'] }
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
