const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');
const { createPaymentIntent } = require('../services/paymentService');
const { emitOrderUpdate } = require('../services/socketService');

const createPayment = asyncHandler(async (req, res) => {
  const { orderId, currency = 'inr' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, 'Enter a valid order ID');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You cannot pay for this order');
  }

  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Order is already paid');
  }

  const intent = await createPaymentIntent({
    amount: order.total,
    currency,
    orderId: order._id,
    userId: req.user._id
  });

  const payment = await Payment.create({
    user: req.user._id,
    order: order._id,
    provider: intent.provider,
    amount: order.total,
    currency,
    status: intent.status,
    providerPaymentId: intent.providerPaymentId,
    clientSecret: intent.clientSecret,
    metadata: {
      orderId: String(order._id)
    }
  });

  order.payment = payment._id;
  order.paymentStatus = payment.status === 'succeeded' ? 'paid' : 'pending';
  await order.save();
  emitOrderUpdate(order);

  res.status(201).json({
    success: true,
    payment,
    clientSecret: payment.clientSecret
  });
});

module.exports = {
  createPayment
};
