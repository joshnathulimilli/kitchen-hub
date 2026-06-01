const express = require('express');
const { createOrder, getMyOrders, getOperationalOrders, confirmDelivered, getOrderById } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, authorize('customer', 'admin'), createOrder);
router.get('/my-orders', protect, authorize('customer', 'admin'), getMyOrders);
router.get('/manage', protect, authorize('admin', 'vendor', 'kitchen', 'delivery'), getOperationalOrders);
router.put('/:id/confirm-delivered', protect, authorize('customer'), confirmDelivered);
router.get('/:id', protect, getOrderById);

module.exports = router;
