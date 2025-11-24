import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    bid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid',
        required: true
    },
    orderDetails: {
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        shippingCost: {
            type: Number,
            default: 0
        },
        finalAmount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Canceled'],
        default: 'Active'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date
    },
    actualDeliveryDate: {
        type: Date
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        phone: String
    },
    payment: {
        method: {
            type: String,
            enum: ['cash', 'bank_transfer', 'check', 'other'],
            default: 'cash'
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        paidAt: Date,
        transactionId: String,
        notes: String
    },
    delivery: {
        method: {
            type: String,
            enum: ['pickup', 'delivery', 'shipping'],
            default: 'pickup'
        },
        trackingNumber: String,
        carrier: String,
        estimatedDelivery: Date,
        actualDelivery: Date,
        deliveryNotes: String
    },
    notes: {
        buyer: String,
        seller: String,
        internal: String
    },
    cancellation: {
        reason: String,
        canceledBy: {
            type: String,
            enum: ['buyer', 'seller', 'admin']
        },
        canceledAt: Date,
        refundAmount: Number,
        refundStatus: {
            type: String,
            enum: ['pending', 'processed', 'completed'],
            default: 'pending'
        }
    },
    completion: {
        completedAt: Date,
        completedBy: {
            type: String,
            enum: ['buyer', 'seller', 'admin']
        },
        completionNotes: String,
        rating: {
            buyerRating: {
                rating: { type: Number, min: 1, max: 5 },
                review: String,
                ratedAt: Date
            },
            sellerRating: {
                rating: { type: Number, min: 1, max: 5 },
                review: String,
                ratedAt: Date
            }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Generate order number before saving
orderSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Index for efficient queries
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ product: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
