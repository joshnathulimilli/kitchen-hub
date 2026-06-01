const express = require('express');
const { createPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create', protect, authorize('customer', 'admin'), createPayment);

module.exports = router;
