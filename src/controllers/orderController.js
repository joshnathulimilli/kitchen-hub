const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');
const { emitOrderUpdate, emitKitchenUpdate } = require('../services/socketService');

const createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, deliveryFee = 40 } = req.body;

  if (!deliveryAddress?.street || !deliveryAddress?.city) {
    throw new ApiError(400, 'Delivery address with street and city is required');
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }

  const tax = Number((cart.subtotal * 0.05).toFixed(2));
  const total = Number((cart.subtotal + Number(deliveryFee) + tax).toFixed(2));

  const order = await Order.create({
    user: req.user._id,
    restaurant: cart.restaurant,
    items: cart.items,
    subtotal: cart.subtotal,
    deliveryFee: Number(deliveryFee),
    tax,
    total,
    deliveryAddress,
    statusHistory: [
      {
        status: 'placed',
        note: 'Order placed by customer',
        updatedBy: req.user._id
      }
    ]
  });

  cart.items = [];
  cart.restaurant = undefined;
  cart.subtotal = 0;
  await cart.save();

  emitOrderUpdate(order);
  emitKitchenUpdate(order);

  res.status(201).json({
    success: true,
    order
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('restaurant', 'name phone address')
    .sort({ createdAt: -1 });

  const reviews = await Review.find({
    user: req.user._id,
    order: { $in: orders.map((order) => order._id) }
  }).select('order');
  const reviewedOrderIds = new Set(reviews.map((review) => String(review.order)));

  res.json({
    success: true,
    count: orders.length,
    orders: orders.map((order) => ({
      ...order.toObject(),
      isReviewed: reviewedOrderIds.has(String(order._id))
    }))
  });
});

const getOperationalOrders = asyncHandler(async (req, res) => {
  const query = {};

  if (req.user.role === 'vendor') {
    const restaurants = await Restaurant.find({ owner: req.user._id, isActive: true }).select('_id');
    query.restaurant = { $in: restaurants.map((restaurant) => restaurant._id) };
  }

  const orders = await Order.find(query)
    .populate('restaurant', 'name phone address')
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(100);

  if (req.user.role === 'admin') {
    const orderIds = orders.map((order) => order._id);
    const reviews = await Review.find({ order: { $in: orderIds } })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    const reviewsByOrder = new Map(reviews.map((review) => [String(review.order), review]));

    return res.json({
      success: true,
      count: orders.length,
      orders: orders.map((order) => ({
        ...order.toObject(),
        customerReview: reviewsByOrder.get(String(order._id)) || null
      }))
    });
  }

  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

const confirmDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You can confirm only your own order');
  }

  if (order.orderStatus === 'delivered') {
    return res.json({
      success: true,
      message: 'Order is already marked delivered',
      order
    });
  }

  if (!['picked_up', 'nearby', 'delivered'].includes(order.deliveryStatus)) {
    throw new ApiError(400, 'Order can be confirmed delivered only after it is out for delivery');
  }

  order.deliveryStatus = 'delivered';
  order.orderStatus = 'delivered';
  order.statusHistory.push({
    status: 'customer:delivered',
    note: 'Delivery confirmed by customer',
    updatedBy: req.user._id
  });

  await order.save();
  emitOrderUpdate(order);

  res.json({
    success: true,
    order
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('restaurant', 'name phone address')
    .populate('user', 'name email phone')
    .populate('payment');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const isOwner = String(order.user._id) === String(req.user._id);
  const privileged = ['admin', 'vendor', 'kitchen', 'delivery'].includes(req.user.role);

  if (!isOwner && !privileged) {
    throw new ApiError(403, 'You cannot access this order');
  }

  res.json({
    success: true,
    order
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOperationalOrders,
  confirmDelivered,
  getOrderById
};
