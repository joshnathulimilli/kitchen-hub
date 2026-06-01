const express = require('express');
const { addToCart, getCart } = require('../controllers/cartController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/add', protect, authorize('customer', 'admin'), addToCart);
router.get('/', protect, authorize('customer', 'admin'), getCart);

module.exports = router;
