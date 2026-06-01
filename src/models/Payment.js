const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    provider: {
      type: String,
      enum: ['stripe', 'cod', 'mock'],
      default: 'stripe'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'inr',
      lowercase: true
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'succeeded', 'failed', 'refunded'],
      default: 'created'
    },
    providerPaymentId: String,
    clientSecret: String,
    metadata: {
      type: Map,
      of: String
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ user: 1, order: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
