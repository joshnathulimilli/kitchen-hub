const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [800, 'Description is too long']
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    imageUrl: String,
    isVegetarian: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    preparationTimeMinutes: {
      type: Number,
      min: 1,
      default: 20
    }
  },
  {
    timestamps: true
  }
);

foodItemSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });

module.exports = mongoose.model('FoodItem', foodItemSchema);
