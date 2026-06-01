const express = require('express');
const { updateDeliveryStatus } = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/status/:id', protect, authorize('delivery', 'admin'), updateDeliveryStatus);

module.exports = router;
