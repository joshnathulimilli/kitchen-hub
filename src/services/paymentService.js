const Stripe = require('stripe');

const createPaymentIntent = async ({ amount, currency, orderId, userId }) => {
  if (!process.env.STRIPE_SECRET) {
    return {
      provider: 'mock',
      providerPaymentId: `mock_${Date.now()}`,
      clientSecret: 'mock_client_secret_for_local_development',
      status: 'succeeded'
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: {
      orderId: String(orderId),
      userId: String(userId)
    },
    automatic_payment_methods: {
      enabled: true
    }
  });

  return {
    provider: 'stripe',
    providerPaymentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending'
  };
};

module.exports = {
  createPaymentIntent
};
