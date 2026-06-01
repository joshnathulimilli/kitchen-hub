const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');

const createMenuItem = asyncHandler(async (req, res) => {
  const {
    restaurantId,
    items,
    name,
    description,
    category,
    price,
    imageUrl,
    isVegetarian,
    isAvailable,
    preparationTimeMinutes
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new ApiError(400, 'Enter a valid restaurant ID');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const isOwner = String(restaurant.owner) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'You can add menu items only to your own restaurant');
  }

  const rawItems = Array.isArray(items)
    ? items
    : [
        {
          name,
          description,
          category,
          price,
          imageUrl,
          isVegetarian,
          isAvailable,
          preparationTimeMinutes
        }
      ];

  if (!rawItems.length) {
    throw new ApiError(400, 'At least one menu item is required');
  }

  const menuItems = rawItems.map((item) => ({
    restaurant: restaurant._id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price,
    imageUrl: item.imageUrl,
    isVegetarian: item.isVegetarian,
    isAvailable: item.isAvailable,
    preparationTimeMinutes: item.preparationTimeMinutes
  }));

  const createdItems = await FoodItem.insertMany(menuItems, { ordered: true });
  const item = createdItems[0];

  res.status(201).json({
    success: true,
    count: createdItems.length,
    items: createdItems,
    item
  });
});

const getMenuByRestaurant = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.restaurantId)) {
    throw new ApiError(400, 'Enter a valid restaurant ID');
  }

  const { category, available = 'true' } = req.query;
  const query = {
    restaurant: req.params.restaurantId
  };

  if (category) query.category = new RegExp(category, 'i');
  if (available !== 'all') query.isAvailable = available === 'true';

  const items = await FoodItem.find(query).sort({ category: 1, name: 1 });

  res.json({
    success: true,
    count: items.length,
    items
  });
});

const getMenuItemById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Enter a valid menu item ID');
  }

  const item = await FoodItem.findById(req.params.id).populate('restaurant', 'name status address');
  if (!item) {
    throw new ApiError(404, 'Menu item not found');
  }

  res.json({
    success: true,
    item
  });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Enter a valid menu item ID');
  }

  const item = await FoodItem.findById(req.params.id).populate('restaurant', 'owner isActive');
  if (!item) {
    throw new ApiError(404, 'Menu item not found');
  }

  const isOwner = String(item.restaurant?.owner) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'You can delete menu items only from your own restaurant');
  }

  item.isAvailable = false;
  await item.save();

  res.json({
    success: true,
    message: 'Menu item deleted successfully'
  });
});

module.exports = {
  createMenuItem,
  getMenuByRestaurant,
  getMenuItemById,
  deleteMenuItem
};
