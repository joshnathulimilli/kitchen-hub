const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');

const createSupportTicket = asyncHandler(async (req, res) => {
  const { orderId, category = 'other', message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, 'Support message is required');
  }

  const ticket = {
    user: req.user._id,
    category,
    message: String(message).trim()
  };

  if (orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Enter a valid order ID');
    }

    const order = await Order.findById(orderId).populate('restaurant', 'owner');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (req.user.role === 'customer') {
      if (String(order.user) !== String(req.user._id)) {
        throw new ApiError(403, 'You can only attach support requests to your own orders');
      }
    } else if (req.user.role === 'vendor') {
      if (!order.restaurant || String(order.restaurant.owner) !== String(req.user._id)) {
        throw new ApiError(403, 'Vendors can only attach support requests to orders for their own restaurant');
      }
    }

    ticket.order = order._id;
  }

  const supportTicket = await SupportTicket.create(ticket);

  res.status(201).json({
    success: true,
    ticket: supportTicket
  });
});

const getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id })
    .populate('order', 'orderStatus kitchenStatus deliveryStatus total restaurant')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: tickets.length,
    tickets
  });
});

const getSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find()
    .populate('user', 'name email role')
    .populate('order', 'orderStatus kitchenStatus deliveryStatus total restaurant')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: tickets.length,
    tickets
  });
});

const updateSupportTicketStatus = asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    throw new ApiError(400, 'Invalid support ticket status');
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Enter a valid support ticket ID');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, 'Support ticket not found');
  }

  ticket.status = status;
  if (resolution !== undefined) {
    ticket.resolution = String(resolution).trim();
  }

  await ticket.save();

  res.json({
    success: true,
    ticket
  });
});

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getSupportTickets,
  updateSupportTicketStatus
};
