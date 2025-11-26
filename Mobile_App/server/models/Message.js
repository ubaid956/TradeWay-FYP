import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: function() { return !this.isPrivate; } // Only required for non-private messages
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.isPrivate; } // Required for private messages
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'invoice'],
    default: 'text'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isPrivate: {
    type: Boolean,
    default: false
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

// Indexes for optimized queries
// messageSchema.index({ group: 1, createdAt: -1 });
// messageSchema.index({ sender: 1 });
// messageSchema.index({ createdAt: -1 });

// Middleware to update group's last message timestamp
// messageSchema.post('save', async function(doc) {
//   await mongoose.model('Group').findByIdAndUpdate(doc.group, {
//     lastMessageAt: doc.createdAt
//   });
// });

const Message = mongoose.model('Message', messageSchema);
export default Message;