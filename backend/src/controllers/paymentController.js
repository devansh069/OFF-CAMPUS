const stripe = require('stripe')(process.env.STRIPE_API_KEY || 'sk_test_emergent');
const { User } = require('../models');

/**
 * Creates a Stripe checkout session for premium upgrade
 */
const createCheckout = async (req, res) => {
  const { success_url, cancel_url } = req.body;
  const user = req.user;

  if (!success_url || !cancel_url) {
    return res.status(400).json({ detail: 'Success and cancel URLs are required' });
  }

  try {
    // Generate Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Off Campus Premium Monthly Plan',
              description: 'Access to inter-campus swiping, global stories, and global vibe leaderboard.'
            },
            unit_amount: 9900 // ₹99.00 in paise
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        user_id: user.user_id,
        user_email: user.email,
        plan: 'premium_monthly'
      }
    });

    res.json({
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({ detail: `Payment initialization error: ${error.message}` });
  }
};

/**
 * Checks payment status and upgrades user to premium on success
 */
const checkPaymentStatus = async (req, res) => {
  const { session_id } = req.params;
  const user = req.user;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      user.is_premium = true;
      user.premium_until = premiumUntil;
      await user.save();

      return res.json({
        status: 'completed',
        is_premium: true
      });
    }

    res.json({
      status: session.payment_status,
      is_premium: false
    });
  } catch (error) {
    console.error('Stripe status check error:', error);
    res.status(500).json({ detail: `Payment validation error: ${error.message}` });
  }
};

module.exports = {
  createCheckout,
  checkPaymentStatus
};
