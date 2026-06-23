# Multi-Vendor Food Ordering and Kitchen Coordination API

Production-ready Node.js, Express.js, MongoDB, Mongoose, JWT, Swagger, Razorpay, and Socket.IO backend for a multi-vendor food ordering and kitchen coordination system.

## Features

- User registration, login, profile lookup, and password reset
- Role-based access for `customer`, `vendor`, `kitchen`, `delivery`, and `admin`
- Restaurant creation, listing, lookup, and admin deletion
- Menu item creation, bulk menu creation, listing, lookup, and deletion
- Customer cart and checkout flow
- Customer order history
- Operational order dashboard for vendors, kitchen staff, delivery users, and admins
- Kitchen order status updates
- Delivery status updates
- Customer delivery confirmation
- Razorpay payment creation and verification
- Reviews for delivered orders
- Support ticket creation and admin support management
- Restaurant image uploads
- Swagger API documentation
- Live order updates with Socket.IO
- Static frontend served from `public/`

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Socket.IO
- Razorpay
- Swagger UI
- Multer
- Nodemailer
- Docker

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
    supportController.js
    uploadController.js
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
    SupportTicket.js
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
    supportRoutes.js
    uploadRoutes.js
  services/
    emailService.js
    paymentService.js
    socketService.js
  swagger/
    swagger.js
  utils/
    apiError.js
    generateToken.js
```

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string
- npm

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/food_ordering
JWT_SECRET=change-this-secret
CLIENT_URL=http://localhost:5000

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

3. Start MongoDB if you are using a local database.

4. Start the API:

```bash
npm run dev
```

The API and frontend run at:

```text
http://localhost:5000
```

Swagger documentation is available at:

```text
http://localhost:5000/api-docs
```

Health check:

```text
GET /health
```

## Scripts

```bash
npm run dev          # Start with nodemon
npm start            # Start with node
npm run create-admin # Create an admin user
```

## Main Routes

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password/:token
GET    /api/auth/me

POST   /api/restaurants
GET    /api/restaurants
GET    /api/restaurants/:id
DELETE /api/restaurants/:id

POST   /api/menu
POST   /api/menu/bulk
GET    /api/menu/:restaurantId
GET    /api/menu/item/:id
DELETE /api/menu/item/:id

POST   /api/cart/add
GET    /api/cart

POST   /api/orders
GET    /api/orders/my-orders
GET    /api/orders/manage
GET    /api/orders/:id
PUT    /api/orders/:id/confirm-delivered

PUT    /api/kitchen/status/:id
PUT    /api/delivery/status/:id

POST   /api/payments/create
POST   /api/payments/verify

POST   /api/reviews/add

POST   /api/support
GET    /api/support/my
GET    /api/support/manage
PUT    /api/support/:id/status

POST   /api/upload/image
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

Server emits events such as:

```js
socket.on('order:update', handler);
socket.on('kitchen:update', handler);
```

## Payment Integration

`POST /api/payments/create` creates a Razorpay order when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are configured.

`POST /api/payments/verify` verifies the Razorpay payment signature after checkout.

## Order Flow

1. Customer registers or logs in.
2. Customer browses restaurants and menu items.
3. Customer adds food items to cart.
4. Customer places an order.
5. Payment is created and verified through Razorpay.
6. Kitchen or vendor updates preparation status.
7. Delivery user updates delivery status.
8. Customer confirms delivery.
9. Customer can add a review after delivery.

## Render Deployment

This project includes `render.yaml`.

Deployment steps:

1. Push the project to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Set these environment variables in Render:

```text
MONGO_URI=<your MongoDB Atlas URI>
JWT_SECRET=<long random production secret>
RAZORPAY_KEY_ID=<your Razorpay key id>
RAZORPAY_KEY_SECRET=<your Razorpay key secret>
CLIENT_URL=<your frontend URL>
NODE_ENV=production
```

4. Deploy. Render will run:

```bash
npm install
npm start
```

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

## Notes

- Restaurants and menu items are modeled for vendor and admin management.
- Cart checkout is designed around restaurant-based ordering.
- Orders emit live status updates for customers, restaurants, and kitchen dashboards.
- Reviews are restricted to delivered orders and update restaurant rating averages.
- Password reset supports email-based reset links with a tokenized reset flow.
- Vendors see only their own restaurant orders in the operational dashboard.
- Orders are grouped into active and delivered orders in the UI.
- Special order instructions are captured and displayed on order cards.
- Uploaded restaurant images are stored under `public/uploads/restaurants`.
- Supported upload formats are JPG, JPEG, PNG, WebP, and GIF.
- Maximum image upload size is 3 MB.
- Do not commit real secrets or payment keys.
