const mongoose = require('mongoose');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');
const { emitOrderUpdate, emitKitchenUpdate } = require('../services/socketService');

const kitchenToOrderStatus = {
  queued: 'placed',
  accepted: 'accepted',
  preparing: 'preparing',
  ready: 'ready'
};

const updateKitchenStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowedStatuses = Object.keys(kitchenToOrderStatus);

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Kitchen status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Enter a valid order ID');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.kitchenStatus === status) {
    return res.json({
      success: true,
      message: `Kitchen status is already ${status}`,
      order
    });
  }

  order.kitchenStatus = status;
  order.orderStatus = kitchenToOrderStatus[status];
  order.statusHistory.push({
    status: `kitchen:${status}`,
    note,
    updatedBy: req.user._id
  });

  await order.save();
  emitKitchenUpdate(order);
  emitOrderUpdate(order);

  res.json({
    success: true,
    order
  });
});

module.exports = {
  updateKitchenStatus
};
