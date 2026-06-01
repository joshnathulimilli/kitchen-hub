const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [120, 'Restaurant name is too long']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description is too long']
    },
    cuisineTypes: [
      {
        type: String,
        trim: true
      }
    ],
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: String,
    ratingAverage: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'paused'],
      default: 'open'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

restaurantSchema.index({ name: 'text', cuisineTypes: 'text', 'address.city': 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
