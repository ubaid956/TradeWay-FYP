import mongoose from 'mongoose';

const industryUpdateSchema = new mongoose.Schema({
  title: String,
  summary: String,
  source: String,
  link: String,
  tags: [String],
  publishedAt: Date,
  published: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('IndustryUpdate', industryUpdateSchema);
