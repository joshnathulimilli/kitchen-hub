const express = require('express');
const { createPayment, verifyPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create', protect, authorize('customer', 'admin'), createPayment);
router.post('/verify', protect, authorize('customer', 'admin'), verifyPayment);

module.exports = router;
