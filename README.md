# Multi-Vendor Food Ordering and Kitchen Coordination API

Production-ready Node.js, Express.js, MongoDB, Mongoose, JWT, Swagger, and Socket.IO backend for a multi-vendor food ordering system.

## Folder Structure

```text
src/
  app.js
  server.js
  config/
    db.js
  controllers/
    authController.js
    cartController.js
    deliveryController.js
    kitchenController.js
    menuController.js
    orderController.js
    paymentController.js
    restaurantController.js
    reviewController.js
  middlewares/
    asyncHandler.js
    authMiddleware.js
    errorMiddleware.js
  models/
    Cart.js
    FoodItem.js
    Order.js
    Payment.js
    Restaurant.js
    Review.js
    User.js
  routes/
    authRoutes.js
    cartRoutes.js
    deliveryRoutes.js
    kitchenRoutes.js
    menuRoutes.js
    orderRoutes.js
    paymentRoutes.js
    restaurantRoutes.js
    reviewRoutes.js
  services/
    paymentService.js
    socketService.js
  swagger/
    swagger.js
  utils/
    apiError.js
    generateToken.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

3. Use local MongoDB:

```env
MONGO_URI=mongodb://127.0.0.1:27017/food_ordering
```

4. Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

The website runs at:

```text
http://localhost:5000
```

Swagger documentation is available at:

```text
http://localhost:5000/api-docs
```

## Main Routes

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/restaurants
GET    /api/restaurants/:id
GET    /api/menu/:restaurantId
GET    /api/menu/item/:id
POST   /api/cart/add
GET    /api/cart
POST   /api/orders
GET    /api/orders/my-orders
GET    /api/orders/:id
PUT    /api/kitchen/status/:id
PUT    /api/delivery/status/:id
POST   /api/payments/create
POST   /api/reviews/add
```

## Authentication

Protected routes require:

```text
Authorization: Bearer <jwt_token>
```

Available user roles:

```text
customer, vendor, kitchen, delivery, admin
```

## Socket.IO Events

Clients can join rooms:

```js
socket.emit('join:user', userId);
socket.emit('join:restaurant', restaurantId);
socket.emit('join:order', orderId);
```

Server emits:

```js
socket.on('order:update', handler);
socket.on('kitchen:update', handler);
```

## Payment Integration

`POST /api/payments/create` creates a Stripe PaymentIntent when `STRIPE_SECRET` is configured.

For local development, if `STRIPE_SECRET` is empty, the API returns a mock payment object so the order flow still works.

## Render Deployment

This project includes `render.yaml`.

Deployment steps:

1. Push the project to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Set these environment variables in Render:

```text
MONGO_URI=<your MongoDB Atlas URI>
JWT_SECRET=<long random production secret>
STRIPE_SECRET=<your Stripe secret key>
CLIENT_URL=<your frontend URL>
NODE_ENV=production
```

4. Deploy. Render will run:

```bash
npm install
npm start
```

## Notes

- Restaurants and menu items are modeled for vendor/admin management. The requested public routes read restaurants and menu items.
- Cart enforces one restaurant per checkout.
- Orders emit live status updates for customers, restaurants, and kitchen dashboards.
- Reviews are restricted to delivered orders and update restaurant rating averages.
