const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const Review = require('../models/Review');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../middlewares/asyncHandler');

const createRestaurant = asyncHandler(async (req, res) => {
  const { name, description, cuisineTypes, address, phone, imageUrl, status } = req.body;

  const restaurant = await Restaurant.create({
    owner: req.user._id,
    name,
    description,
    cuisineTypes,
    address,
    phone,
    imageUrl,
    status
  });

  res.status(201).json({
    success: true,
    restaurant
  });
});

const getRestaurants = asyncHandler(async (req, res) => {
  const { city, cuisine, search, status = 'open', page = 1, limit = 20 } = req.query;
  const query = { isActive: true };

  if (status) query.status = status;
  if (city) query['address.city'] = new RegExp(city, 'i');
  if (cuisine) query.cuisineTypes = new RegExp(cuisine, 'i');
  if (search) query.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [restaurants, total] = await Promise.all([
    Restaurant.find(query).sort({ ratingAverage: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    Restaurant.countDocuments(query)
  ]);

  res.json({
    success: true,
    count: restaurants.length,
    total,
    page: Number(page),
    restaurants
  });
});

const getRestaurantById = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name email phone');
  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant not found');
  }

  res.json({
    success: true,
    restaurant
  });
});

const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant || !restaurant.isActive) {
    throw new ApiError(404, 'Restaurant not found');
  }

  restaurant.isActive = false;
  restaurant.status = 'closed';
  await restaurant.save();

  await FoodItem.updateMany(
    { restaurant: restaurant._id },
    {
      isAvailable: false
    }
  );

  res.json({
    success: true,
    message: 'Restaurant deleted successfully'
  });
});

module.exports = {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  deleteRestaurant
};
