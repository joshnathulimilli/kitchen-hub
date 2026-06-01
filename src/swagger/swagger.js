const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Multi-Vendor Food Ordering API',
    version: '1.0.0',
    description: 'Backend API for restaurants, menus, carts, orders, kitchen coordination, delivery tracking, payments, and reviews.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string', example: 'MG Road' },
          city: { type: 'string', example: 'Bengaluru' },
          state: { type: 'string', example: 'Karnataka' },
          postalCode: { type: 'string', example: '560001' },
          country: { type: 'string', example: 'India' }
        }
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Asha Rao' },
          email: { type: 'string', example: 'asha@example.com' },
          password: { type: 'string', example: 'secret123' },
          phone: { type: 'string', example: '+919999999999' },
          role: {
            type: 'string',
            enum: ['customer', 'vendor', 'kitchen', 'delivery', 'admin'],
            example: 'customer'
          },
          address: { $ref: '#/components/schemas/Address' }
        }
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'asha@example.com' },
          password: { type: 'string', example: 'secret123' }
        }
      },
      CreateRestaurantInput: {
        type: 'object',
        required: ['name', 'address', 'phone'],
        properties: {
          name: { type: 'string', example: 'Spice Garden' },
          description: { type: 'string', example: 'Fresh Indian meals and quick kitchen coordination.' },
          cuisineTypes: {
            type: 'array',
            items: { type: 'string' },
            example: ['Indian', 'North Indian']
          },
          address: { $ref: '#/components/schemas/Address' },
          phone: { type: 'string', example: '+919888888888' },
          imageUrl: { type: 'string', example: 'https://example.com/spice-garden.jpg' },
          status: { type: 'string', enum: ['open', 'closed', 'paused'], example: 'open' }
        }
      },
      CreateMenuItemInput: {
        type: 'object',
        required: ['restaurantId', 'name', 'category', 'price'],
        properties: {
          restaurantId: { type: 'string', example: '665e4c5fa86c6b7267136710' },
          name: { type: 'string', example: 'Paneer Butter Masala' },
          description: { type: 'string', example: 'Creamy paneer curry served hot.' },
          category: { type: 'string', example: 'Main Course' },
          price: { type: 'number', example: 249 },
          imageUrl: { type: 'string', example: 'https://example.com/paneer.jpg' },
          isVegetarian: { type: 'boolean', example: true },
          isAvailable: { type: 'boolean', example: true },
          preparationTimeMinutes: { type: 'number', example: 20 }
        }
      },
      FoodItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          restaurant: { type: 'string' },
          name: { type: 'string', example: 'Paneer Butter Masala' },
          description: { type: 'string' },
          category: { type: 'string', example: 'Main Course' },
          price: { type: 'number', example: 249 },
          isVegetarian: { type: 'boolean', example: true },
          isAvailable: { type: 'boolean', example: true },
          preparationTimeMinutes: { type: 'number', example: 20 }
        }
      },
      AddCartInput: {
        type: 'object',
        required: ['foodItemId'],
        properties: {
          foodItemId: { type: 'string', example: '665e4c5fa86c6b7267136710' },
          quantity: { type: 'number', example: 2 }
        }
      },
      CreateOrderInput: {
        type: 'object',
        required: ['deliveryAddress'],
        properties: {
          deliveryAddress: { $ref: '#/components/schemas/Address' },
          deliveryFee: { type: 'number', example: 40 }
        }
      },
      StatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string' },
          note: { type: 'string', example: 'Order is moving forward' }
        }
      },
      PaymentInput: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string', example: '665e4c5fa86c6b7267136711' },
          currency: { type: 'string', example: 'inr' }
        }
      },
      ReviewInput: {
        type: 'object',
        required: ['orderId', 'rating'],
        properties: {
          orderId: { type: 'string' },
          rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', example: 'Great food and fast delivery.' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' }
            }
          }
        },
        responses: {
          201: { description: 'Registered successfully' },
          409: { description: 'Email already exists' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' }
            }
          }
        },
        responses: {
          200: { description: 'Logged in successfully' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/restaurants': {
      post: {
        tags: ['Restaurants'],
        summary: 'Create a restaurant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRestaurantInput' }
            }
          }
        },
        responses: {
          201: { description: 'Restaurant created' },
          401: { description: 'Unauthorized' },
          403: { description: 'Vendor or admin role required' }
        }
      },
      get: {
        tags: ['Restaurants'],
        summary: 'List restaurants',
        parameters: [
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'cuisine', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'closed', 'paused'] } }
        ],
        responses: {
          200: { description: 'Restaurants returned' }
        }
      }
    },
    '/api/restaurants/{id}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get restaurant details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Restaurant returned' },
          404: { description: 'Restaurant not found' }
        }
      }
    },
    '/api/menu': {
      post: {
        tags: ['Menu'],
        summary: 'Create a menu item',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMenuItemInput' }
            }
          }
        },
        responses: {
          201: { description: 'Menu item created' },
          403: { description: 'Vendor can only add items to their own restaurant' },
          404: { description: 'Restaurant not found' }
        }
      }
    },
    '/api/menu/{restaurantId}': {
      get: {
        tags: ['Menu'],
        summary: 'Get menu by restaurant',
        parameters: [
          { name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'available', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] } }
        ],
        responses: {
          200: { description: 'Menu returned' }
        }
      }
    },
    '/api/menu/item/{id}': {
      get: {
        tags: ['Menu'],
        summary: 'Get menu item details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Menu item returned' },
          404: { description: 'Menu item not found' }
        }
      }
    },
    '/api/cart/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add an item to cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddCartInput' }
            }
          }
        },
        responses: {
          201: { description: 'Item added' },
          400: { description: 'Invalid cart request' }
        }
      }
    },
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current user cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cart returned' }
        }
      }
    },
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order from the cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderInput' }
            }
          }
        },
        responses: {
          201: { description: 'Order created' },
          400: { description: 'Cart is empty or invalid address' }
        }
      }
    },
    '/api/orders/my-orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get authenticated customer orders',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Orders returned' }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order returned' },
          403: { description: 'Forbidden' },
          404: { description: 'Order not found' }
        }
      }
    },
    '/api/kitchen/status/{id}': {
      put: {
        tags: ['Kitchen'],
        summary: 'Update kitchen status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/StatusInput' },
                  {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['queued', 'accepted', 'preparing', 'ready'] }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          200: { description: 'Kitchen status updated' }
        }
      }
    },
    '/api/delivery/status/{id}': {
      put: {
        tags: ['Delivery'],
        summary: 'Update delivery status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/StatusInput' },
                  {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['pending', 'assigned', 'picked_up', 'nearby', 'delivered'] }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          200: { description: 'Delivery status updated' }
        }
      }
    },
    '/api/payments/create': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe payment intent',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentInput' }
            }
          }
        },
        responses: {
          201: { description: 'Payment intent created' }
        }
      }
    },
    '/api/reviews/add': {
      post: {
        tags: ['Reviews'],
        summary: 'Add a review for a delivered order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReviewInput' }
            }
          }
        },
        responses: {
          201: { description: 'Review created' },
          400: { description: 'Order is not delivered' }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: []
});

module.exports = swaggerSpec;
