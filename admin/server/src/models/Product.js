import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  title: String,
  type: { type: String, enum: ['raw','processed'] },
  category: String,    // e.g., Carrara, Travertine
  grade: String,
  pricePerUnit: Number
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
