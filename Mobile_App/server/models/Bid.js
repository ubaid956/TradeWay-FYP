import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
    default: 'pending'
  },
  isHighestBid: {
    type: Boolean,
    default: false
  },
  validUntil: {
    type: Date,
    default: function () {
      // Bid expires in 7 days by default
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  sellerResponse: {
    message: String,
    respondedAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
bidSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
bidSchema.index({ product: 1, bidAmount: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });
bidSchema.index({ status: 1, createdAt: -1 });

const Bid = mongoose.model("Bid", bidSchema);
export default Bid;