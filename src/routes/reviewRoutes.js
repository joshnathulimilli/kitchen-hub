const express = require('express');
const { addReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/add', protect, authorize('customer', 'admin'), addReview);

module.exports = router;
