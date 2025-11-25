import mongoose from "mongoose";
import {
  PRODUCT_GRADE_VALUES,
  REQUIREMENT_UNIT_VALUES,
  DEFAULT_REQUIREMENT_UNIT
} from '../../shared/taxonomy.js';

const requirementSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  productType: { type: String, required: true, trim: true },
  gradePreference: { type: String, trim: true, enum: PRODUCT_GRADE_VALUES },
  quantity: {
    amount: { type: Number, required: true, min: 1 },
    unit: {
      type: String,
      enum: REQUIREMENT_UNIT_VALUES,
      default: DEFAULT_REQUIREMENT_UNIT,
    },
  },
  location: {
    city: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
  },
  budget: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
  },
  description: { type: String, trim: true },
  needByDate: { type: Date },
  contactPreference: {
    type: String,
    enum: ['chat', 'phone', 'email', 'any'],
    default: 'chat',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'fulfilled', 'cancelled', 'expired'],
    default: 'open',
  },
  tags: [{ type: String, trim: true }],
}, {
  timestamps: true,
});

const Requirement = mongoose.model('Requirement', requirementSchema);
export default Requirement;