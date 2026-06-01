const mongoose = require('mongoose');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');
const { emitOrderUpdate } = require('../services/socketService');

const deliveryToOrderStatus = {
  pending: undefined,
  assigned: undefined,
  picked_up: 'picked_up',
  nearby: 'picked_up',
  delivered: 'picked_up'
};

const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowedStatuses = Object.keys(deliveryToOrderStatus);

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Delivery status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Enter a valid order ID');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.deliveryStatus === status) {
    return res.json({
      success: true,
      message: `Delivery status is already ${status}`,
      order
    });
  }

  order.deliveryStatus = status;
  if (deliveryToOrderStatus[status]) {
    order.orderStatus = deliveryToOrderStatus[status];
  }

  order.statusHistory.push({
    status: `delivery:${status}`,
    note,
    updatedBy: req.user._id
  });

  await order.save();
  emitOrderUpdate(order);

  res.json({
    success: true,
    order
  });
});

module.exports = {
  updateDeliveryStatus
};
