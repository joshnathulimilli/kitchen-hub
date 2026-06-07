const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    category: {
      type: String,
      enum: ['order', 'delivery', 'payment', 'menu', 'other'],
      default: 'other'
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    resolution: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

supportTicketSchema.index({ user: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ order: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
