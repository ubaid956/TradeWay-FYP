import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  type: {
    type: String,
    enum: ['Work', 'Friends', 'Family', 'Custom', 'dispute'],
    default: 'Custom'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
// groupSchema.index({ name: 1 });
// groupSchema.index({ type: 1 });
// groupSchema.index({ members: 1 });
// groupSchema.index({ createdBy: 1 });

// Virtual for message count
groupSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'group',
  count: true
});

const Group = mongoose.model('Group', groupSchema);
export default Group;