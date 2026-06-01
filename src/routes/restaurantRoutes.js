const express = require('express');
const {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  deleteRestaurant
} = require('../controllers/restaurantController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, authorize('vendor', 'admin'), createRestaurant);
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);
router.delete('/:id', protect, authorize('admin'), deleteRestaurant);

module.exports = router;
