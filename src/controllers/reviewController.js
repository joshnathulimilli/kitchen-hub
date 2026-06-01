const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');

const addReview = asyncHandler(async (req, res) => {
  const { orderId, rating, foodRating, deliveryRating, comment } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You cannot review this order');
  }

  if (order.orderStatus !== 'delivered') {
    throw new ApiError(400, 'Only delivered orders can be reviewed');
  }

  const existingReview = await Review.findOne({ user: req.user._id, order: order._id });
  if (existingReview) {
    throw new ApiError(409, 'You have already reviewed this order');
  }

  const review = await Review.create({
    user: req.user._id,
    restaurant: order.restaurant,
    order: order._id,
    rating,
    foodRating,
    deliveryRating,
    comment
  });

  const stats = await Review.aggregate([
    { $match: { restaurant: order.restaurant } },
    {
      $group: {
        _id: '$restaurant',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  if (stats[0]) {
    await Restaurant.findByIdAndUpdate(order.restaurant, {
      ratingAverage: Number(stats[0].ratingAverage.toFixed(1)),
      ratingCount: stats[0].ratingCount
    });
  }

  res.status(201).json({
    success: true,
    review
  });
});

module.exports = {
  addReview
};
