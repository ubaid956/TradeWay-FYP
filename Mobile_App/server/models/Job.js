import mongoose from "mongoose";
const jobSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cargoDetails: {
    weight: Number,
    size: String,
    cargoType: String
  },
  source: String,
  destination: String,
  price: Number,
  status: { type: String, enum: ['open', 'in_transit', 'delivered', 'cancelled'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});


const Job = mongoose.model('Job', jobSchema)
export default Job