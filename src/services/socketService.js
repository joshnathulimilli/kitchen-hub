let ioInstance;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('join:user', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('join:restaurant', (restaurantId) => {
      if (restaurantId) socket.join(`restaurant:${restaurantId}`);
    });

    socket.on('join:order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
  });
};

const getIO = () => ioInstance;

const emitOrderUpdate = (order) => {
  if (!ioInstance || !order) return;

  const payload = {
    orderId: order._id,
    restaurant: order.restaurant,
    user: order.user,
    orderStatus: order.orderStatus,
    kitchenStatus: order.kitchenStatus,
    deliveryStatus: order.deliveryStatus,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt
  };

  ioInstance
    .to(`order:${order._id}`)
    .to(`user:${order.user}`)
    .to(`restaurant:${order.restaurant}`)
    .emit('order:update', payload);
};

const emitKitchenUpdate = (order) => {
  if (!ioInstance || !order) return;

  ioInstance.to(`restaurant:${order.restaurant}`).emit('kitchen:update', {
    orderId: order._id,
    restaurant: order.restaurant,
    kitchenStatus: order.kitchenStatus,
    orderStatus: order.orderStatus,
    updatedAt: order.updatedAt
  });
};

module.exports = {
  initSocket,
  getIO,
  emitOrderUpdate,
  emitKitchenUpdate
};
