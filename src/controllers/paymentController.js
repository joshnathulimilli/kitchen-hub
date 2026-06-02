const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');
const { createPaymentOrder, verifyRazorpaySignature } = require('../services/paymentService');
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

  const intent = await createPaymentOrder({
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
    providerOrderId: intent.providerOrderId,
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
    clientSecret: payment.clientSecret,
    keyId: intent.keyId,
    razorpayOrder: intent.razorpayOrder || null
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new ApiError(400, 'Enter a valid payment ID');
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (String(payment.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You cannot verify this payment');
  }

  if (payment.provider === 'mock') {
    payment.status = 'succeeded';
    await payment.save();
  } else {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(400, 'Razorpay verification details are required');
    }

    if (payment.providerOrderId !== razorpay_order_id) {
      throw new ApiError(400, 'Razorpay order ID does not match this payment');
    }

    const validSignature = verifyRazorpaySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    if (!validSignature) {
      payment.status = 'failed';
      await payment.save();
      throw new ApiError(400, 'Payment verification failed');
    }

    payment.status = 'succeeded';
    payment.providerPaymentId = razorpay_payment_id;
    await payment.save();
  }

  const order = await Order.findById(payment.order);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.payment = payment._id;
  order.paymentStatus = 'paid';
  await order.save();
  emitOrderUpdate(order);

  res.json({
    success: true,
    payment,
    order
  });
});

module.exports = {
  createPayment,
  verifyPayment
};
