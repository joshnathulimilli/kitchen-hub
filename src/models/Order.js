const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
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
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 40,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryAddress: {
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
    specialInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
      default: 'placed'
    },
    kitchenStatus: {
      type: String,
      enum: ['queued', 'accepted', 'preparing', 'ready'],
      default: 'queued'
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'nearby', 'delivered'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
