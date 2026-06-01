const express = require('express');
const { updateKitchenStatus } = require('../controllers/kitchenController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/status/:id', protect, authorize('kitchen', 'vendor', 'admin'), updateKitchenStatus);

module.exports = router;
