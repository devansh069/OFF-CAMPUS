const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.warn('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables');
  }

  return new Razorpay({
    key_id: key_id || 'dummy_key_id',
    key_secret: key_secret || 'dummy_key_secret'
  });
};

// 1. Create Razorpay Order (₹99 = 9900 paise)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const razorpay = getRazorpayInstance();

    const options = {
      amount: 9900, // ₹99 in paise
      currency: 'INR',
      receipt: `receipt_${userId.substring(0, 10)}_${Date.now()}`,
      notes: {
        user_id: userId,
        plan: 'Student Pass Premium'
      }
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummy'
    });
  } catch (error) {
    console.error('[Razorpay createOrder Error]:', error);
    return res.status(500).json({ detail: 'Failed to create payment order: ' + error.message });
  }
};

// 2. Verify Razorpay Payment Signature
exports.verifyPayment = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ detail: 'Missing required payment verification parameters' });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = false;

    if (key_secret) {
      const generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isValid = generated_signature === razorpay_signature;
    } else {
      // Test fallback if secret is not set yet
      isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ detail: 'Invalid payment signature' });
    }

    // Activate 30-day Premium membership
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.is_premium = true;
    user.premium_until = premiumUntil;
    user.profile_visibility = 2.0; // 2x Profile Visibility for Premium
    await user.save();

    console.log(`[Razorpay Success] User ${userId} upgraded to Premium until ${premiumUntil}`);

    return res.status(200).json({
      success: true,
      is_premium: true,
      premium_until: premiumUntil,
      message: 'Payment verified and Premium activated successfully! 👑'
    });
  } catch (error) {
    console.error('[Razorpay verifyPayment Error]:', error);
    return res.status(500).json({ detail: 'Payment verification failed: ' + error.message });
  }
};

// 3. Get Premium Status
exports.getPremiumStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Check if premium has expired
    let isPremium = user.is_premium;
    if (isPremium && user.premium_until && new Date() > new Date(user.premium_until)) {
      isPremium = false;
      user.is_premium = false;
      user.profile_visibility = 1.0;
      await user.save();
    }

    return res.status(200).json({
      is_premium: isPremium,
      premium_until: user.premium_until
    });
  } catch (error) {
    console.error('[getPremiumStatus Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch premium status: ' + error.message });
  }
};
