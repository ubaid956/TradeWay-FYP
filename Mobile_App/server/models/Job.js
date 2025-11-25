import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    latitude: Number,
    longitude: Number,
    instructions: { type: String, trim: true }
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const statusEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_transit', 'delivered', 'cancelled']
    },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    cargoDetails: {
      weight: Number,
      unit: { type: String, default: 'kg' },
      dimensions: { type: String, trim: true },
      cargoType: { type: String, trim: true },
      notes: { type: String, trim: true }
    },
    origin: locationSchema,
    destination: locationSchema,
    pickupContact: contactSchema,
    deliveryContact: contactSchema,
    price: Number,
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_transit', 'delivered', 'cancelled'],
      default: 'open'
    },
    visibleTo: { type: String, enum: ['all', 'private'], default: 'all' },
    statusHistory: { type: [statusEntrySchema], default: [] },
    notes: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

jobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isNew && !this.statusHistory?.length) {
    this.statusHistory = [{ status: this.status, updatedAt: new Date(), updatedBy: this.vendor }];
  }
  next();
});

const Job = mongoose.model('Job', jobSchema)
export default Job