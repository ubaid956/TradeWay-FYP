import mongoose from 'mongoose';

const industryUpdateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  source: { type: String, default: '' },
  link: { type: String, default: '' },
  tags: [{ type: String }],
  publishedAt: { type: Date, default: Date.now },
  published: { type: Boolean, default: true }
}, { timestamps: true });

const IndustryUpdate = mongoose.model('IndustryUpdate', industryUpdateSchema);
export default IndustryUpdate;
