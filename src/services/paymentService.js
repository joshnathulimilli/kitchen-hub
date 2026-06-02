const crypto = require('crypto');
const Razorpay = require('razorpay');

const getRazorpayConfig = () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET
});

const hasRazorpayCredentials = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return Boolean(keyId && keySecret);
};

const createPaymentOrder = async ({ amount, currency, orderId, userId }) => {
  if (!hasRazorpayCredentials()) {
    return {
      provider: 'mock',
      providerOrderId: `mock_order_${Date.now()}`,
      providerPaymentId: `mock_payment_${Date.now()}`,
      clientSecret: 'mock_client_secret_for_local_development',
      keyId: null,
      status: 'succeeded'
    };
  }

  const { keyId, keySecret } = getRazorpayConfig();
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(Number(amount) * 100),
    currency: String(currency || 'INR').toUpperCase(),
    receipt: String(orderId),
    notes: {
      orderId: String(orderId),
      userId: String(userId)
    }
  });

  return {
    provider: 'razorpay',
    providerOrderId: razorpayOrder.id,
    providerPaymentId: null,
    clientSecret: null,
    keyId,
    status: 'pending',
    razorpayOrder
  };
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature));
};

module.exports = {
  createPaymentOrder,
  verifyRazorpaySignature
};
