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

// 4. Render Mobile Checkout Page for WebBrowser
exports.renderCheckoutPage = async (req, res) => {
  const { order_id, key_id, amount, token } = req.query;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Off Campus Premium Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      background-color: #0F0817;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(194, 255, 61, 0.3);
      border-radius: 24px;
      padding: 32px 24px;
      text-align: center;
      max-width: 360px;
      width: 100%;
    }
    .badge {
      background: rgba(194, 255, 61, 0.12);
      color: #C2FF3D;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 16px;
      border: 1px solid rgba(194, 255, 61, 0.3);
    }
    h1 { font-size: 24px; font-weight: 900; margin: 0 0 8px 0; }
    p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0 0 24px 0; }
    .pay-btn {
      background: #C2FF3D;
      color: #000000;
      font-size: 16px;
      font-weight: 900;
      border: none;
      border-radius: 20px;
      padding: 16px;
      width: 100%;
      cursor: pointer;
    }
    .status { margin-top: 16px; font-size: 13px; color: #C2FF3D; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">OFF CAMPUS PREMIUM</div>
    <h1>Student Pass Pass</h1>
    <p>Complete your ₹99 membership payment via Razorpay</p>
    <button id="pay-button" class="pay-btn">Open Payment Gateway</button>
    <div id="status-msg" class="status">Verifying payment...</div>
  </div>

  <script>
    const options = {
      key: "${key_id || process.env.RAZORPAY_KEY_ID}",
      amount: ${amount || 9900},
      currency: "INR",
      name: "Off Campus Premium",
      description: "Student Pass (1 Month)",
      order_id: "${order_id}",
      theme: { color: "#C2FF3D" },
      handler: function (response) {
        document.getElementById('pay-button').style.display = 'none';
        document.getElementById('status-msg').style.display = 'block';
        document.getElementById('status-msg').innerText = 'Payment Successful! Verifying...';

        fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${token}'
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success || data.is_premium) {
            document.getElementById('status-msg').innerText = 'Premium Activated! Returning to App...';
            setTimeout(() => {
              window.location.href = '/premium-success?session_id=' + response.razorpay_payment_id;
            }, 1200);
          } else {
            alert(data.detail || 'Verification failed');
          }
        })
        .catch(err => {
          alert('Verification error: ' + err.message);
        });
      },
      modal: {
        ondismiss: function() {
          console.log('Payment dismissed');
        }
      }
    };

    const rzp = new Razorpay(options);

    document.getElementById('pay-button').onclick = function() {
      rzp.open();
    };

    // Auto open on load
    window.onload = function() {
      rzp.open();
    };
  </script>
</body>
</html>
  `;

  res.send(html);
};

// 5. Get Premium Status
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

