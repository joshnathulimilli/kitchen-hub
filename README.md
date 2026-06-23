# Multi-Vendor Food Ordering & Kitchen Coordination API

A backend API for a food ordering platform where customers can order food from multiple restaurants, vendors can manage menus and orders, kitchen staff can update preparation status, and delivery agents can track deliveries in real time.

## Tech Stack

* Node.js
* Express.js
* MongoDB & Mongoose
* JWT Authentication
* Socket.IO
* Swagger
* Stripe (Optional)

---

## Features

### Authentication

* User registration and login
* JWT-based authentication
* Role-based access control
* Password reset via email

### Restaurant & Menu Management

* View restaurants
* View restaurant menus
* Vendor-managed restaurants and menu items

### Cart & Orders

* Add items to cart
* Place orders
* Track order status
* View order history
* One restaurant per checkout

### Kitchen & Delivery

* Kitchen staff update preparation status
* Delivery agents update delivery status
* Real-time order updates using Socket.IO

### Reviews & Ratings

* Customers can review delivered orders
* Restaurant ratings update automatically

### Payments

* Stripe PaymentIntent support
* Mock payments available for local development

---

## Project Structure

```text
src/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
├── swagger/
├── utils/
├── app.js
└── server.js
```

---

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/food_ordering
JWT_SECRET=your_secret
STRIPE_SECRET=your_stripe_secret
CLIENT_URL=http://localhost:3000
```

### 3. Run the Server

```bash
npm run dev
```

Server URL:

```text
http://localhost:5000
```

---

## API Documentation

Swagger Documentation:

```text
http://localhost:5000/api-docs
```

---

## Main API Routes

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| POST   | /api/auth/register       | Register user          |
| POST   | /api/auth/login          | Login user             |
| GET    | /api/restaurants         | Get restaurants        |
| GET    | /api/restaurants/:id     | Get restaurant details |
| GET    | /api/menu/:restaurantId  | Get menu               |
| GET    | /api/menu/item/:id       | Get food item          |
| POST   | /api/cart/add            | Add to cart            |
| GET    | /api/cart                | View cart              |
| POST   | /api/orders              | Create order           |
| GET    | /api/orders/my-orders    | My orders              |
| GET    | /api/orders/:id          | Order details          |
| PUT    | /api/kitchen/status/:id  | Update kitchen status  |
| PUT    | /api/delivery/status/:id | Update delivery status |
| POST   | /api/payments/create     | Create payment         |
| POST   | /api/reviews/add         | Add review             |

---

## Authentication

Protected routes require:

```http
Authorization: Bearer <jwt_token>
```

### User Roles

* customer
* vendor
* kitchen
* delivery
* admin

---

## Real-Time Events

### Join Rooms

```javascript
socket.emit("join:user", userId);
socket.emit("join:restaurant", restaurantId);
socket.emit("join:order", orderId);
```

### Listen for Updates

```javascript
socket.on("order:update", handler);
socket.on("kitchen:update", handler);
```

---

## Deployment (Render)

1. Push project to GitHub.
2. Create a Render Web Service or Blueprint.
3. Add environment variables:

   * MONGO_URI
   * JWT_SECRET
   * STRIPE_SECRET
   * CLIENT_URL
4. Deploy.

Render will automatically run:

```bash
npm install
npm start
```

---

## Additional Features

* Vendor-specific order dashboard
* Active and delivered order grouping
* Special order instructions
* Delivered-order-only reviews
* Live order tracking and notifications

---

