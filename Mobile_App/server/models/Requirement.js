import mongoose from "mongoose";

const requirementSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  description: String,
  quantity: Number,
  location: String,
  status: { type: String, enum: ['open', 'fulfilled', 'cancelled'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

const Requirement = mongoose.model("Requirement", requirementSchema)
export default Requirement