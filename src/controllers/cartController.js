const Cart = require('../models/Cart');
const FoodItem = require('../models/FoodItem');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');

const addToCart = asyncHandler(async (req, res) => {
  const { foodItemId, quantity = 1 } = req.body;

  if (!foodItemId || Number(quantity) < 1) {
    throw new ApiError(400, 'foodItemId and a positive quantity are required');
  }

  const foodItem = await FoodItem.findById(foodItemId).populate('restaurant');
  if (!foodItem || !foodItem.isAvailable || !foodItem.restaurant?.isActive) {
    throw new ApiError(404, 'Food item is not available');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      restaurant: foodItem.restaurant._id,
      items: []
    });
  }

  if (cart.restaurant && String(cart.restaurant) !== String(foodItem.restaurant._id)) {
    throw new ApiError(400, 'Cart can contain items from one restaurant only');
  }

  cart.restaurant = foodItem.restaurant._id;
  const existingItem = cart.items.find((item) => String(item.foodItem) === String(foodItem._id));

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({
      foodItem: foodItem._id,
      name: foodItem.name,
      price: foodItem.price,
      quantity: Number(quantity)
    });
  }

  cart.recalculate();
  await cart.save();
  await cart.populate('items.foodItem restaurant');

  res.status(201).json({
    success: true,
    cart
  });
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.foodItem restaurant');

  res.json({
    success: true,
    cart: cart || {
      user: req.user._id,
      restaurant: null,
      items: [],
      subtotal: 0
    }
  });
});

module.exports = {
  addToCart,
  getCart
};
