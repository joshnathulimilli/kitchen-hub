const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    foodRating: {
      type: Number,
      min: 1,
      max: 5
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment is too long']
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ user: 1, order: 1 }, { unique: true });
reviewSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
