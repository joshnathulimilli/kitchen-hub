const express = require('express');
const { createMenuItem, createBulkMenuItems, getMenuByRestaurant, getMenuItemById, deleteMenuItem } = require('../controllers/menuController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, authorize('vendor', 'admin'), createMenuItem);
router.post('/bulk', protect, authorize('vendor', 'admin'), createBulkMenuItems);
router.get('/item/:id', getMenuItemById);
router.delete('/item/:id', protect, authorize('vendor', 'admin'), deleteMenuItem);
router.get('/:restaurantId', getMenuByRestaurant);

module.exports = router;
