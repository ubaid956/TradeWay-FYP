import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true, index: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','analyst','seller','buyer','driver'], default: 'analyst' },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
