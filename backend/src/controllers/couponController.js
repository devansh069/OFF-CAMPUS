const { Op } = require('sequelize');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const User = require('../models/User');

// ============================================================
// USER-FACING ENDPOINT
// ============================================================

// POST /api/coupons/apply — Validate & calculate discounted price
exports.applyCoupon = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { code, planMonths, amount } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ detail: 'Coupon code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Number(amount) || 99;
    const months = Number(planMonths) || 1;

    // 1. Find coupon
    const coupon = await Coupon.findOne({ where: { code: cleanCode } });
    if (!coupon) {
      return res.status(404).json({ detail: 'Invalid coupon code.' });
    }

    // 2. Check if active
    if (!coupon.is_active) {
      return res.status(400).json({ detail: 'This coupon is no longer active.' });
    }

    // 3. Check date validity
    const now = new Date();
    if (now < new Date(coupon.valid_from)) {
      return res.status(400).json({ detail: 'This coupon is not yet valid.' });
    }
    if (now > new Date(coupon.valid_until)) {
      return res.status(400).json({ detail: 'This coupon has expired.' });
    }

    // 4. Check usage limit
    if (coupon.current_usages >= coupon.max_usages) {
      return res.status(400).json({ detail: 'This coupon has been fully redeemed.' });
    }

    // 5. Check if user already used this coupon
    const existingUsage = await CouponUsage.findOne({
      where: { coupon_id: coupon.coupon_id, user_id: userId }
    });
    if (existingUsage) {
      return res.status(400).json({ detail: 'You have already used this coupon.' });
    }

    // 6. Check minimum order amount
    if (orderAmount < coupon.min_order_amount) {
      return res.status(400).json({ detail: `Minimum order of ₹${coupon.min_order_amount} required for this coupon.` });
    }

    // 7. Check applicable plans
    if (coupon.applicable_plans && Array.isArray(coupon.applicable_plans) && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(months)) {
        const planNames = coupon.applicable_plans.map(m => `${m} month`).join(', ');
        return res.status(400).json({ detail: `This coupon is only valid for: ${planNames} plan(s).` });
      }
    }

    // 8. Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round((orderAmount * coupon.discount_value) / 100);
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      // flat
      discountAmount = Math.round(coupon.discount_value);
    }

    // Ensure discount doesn't exceed order
    if (discountAmount >= orderAmount) {
      discountAmount = orderAmount - 1; // minimum ₹1 payment
    }

    const finalAmount = orderAmount - discountAmount;

    return res.status(200).json({
      valid: true,
      coupon_id: coupon.coupon_id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
      original_amount: orderAmount,
      final_amount: finalAmount,
      message: coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}% OFF applied! You save ₹${discountAmount}`
        : `₹${discountAmount} OFF applied!`
    });
  } catch (error) {
    console.error('[Apply Coupon Error]:', error);
    return res.status(500).json({ detail: 'Failed to apply coupon: ' + error.message });
  }
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// POST /api/admin/coupons — Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, applicablePlans,
      validFrom, validUntil, maxUsages
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ detail: 'Coupon code is required.' });
    }
    if (!discountValue || Number(discountValue) <= 0) {
      return res.status(400).json({ detail: 'Discount value must be greater than 0.' });
    }
    if (!validFrom || !validUntil) {
      return res.status(400).json({ detail: 'Valid from and valid until dates are required.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check for duplicate code
    const existing = await Coupon.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(409).json({ detail: `Coupon code "${cleanCode}" already exists.` });
    }

    const couponId = `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const coupon = await Coupon.create({
      coupon_id: couponId,
      code: cleanCode,
      description: description || '',
      discount_type: discountType || 'percentage',
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrderAmount) || 0,
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      applicable_plans: applicablePlans && applicablePlans.length > 0 ? applicablePlans : null,
      valid_from: new Date(validFrom),
      valid_until: new Date(validUntil),
      max_usages: Number(maxUsages) || 100,
      current_usages: 0,
      is_active: true
    });

    return res.status(201).json({
      message: `Coupon "${cleanCode}" created successfully!`,
      coupon
    });
  } catch (error) {
    console.error('[Create Coupon Error]:', error);
    return res.status(500).json({ detail: 'Failed to create coupon: ' + error.message });
  }
};

// GET /api/admin/coupons — List all coupons
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ coupons });
  } catch (error) {
    console.error('[Get All Coupons Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch coupons: ' + error.message });
  }
};

// PUT /api/admin/coupons/:couponId — Update a coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) {
      return res.status(404).json({ detail: 'Coupon not found.' });
    }

    const {
      description, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, applicablePlans,
      validFrom, validUntil, maxUsages, isActive
    } = req.body;

    if (description !== undefined) coupon.description = description;
    if (discountType !== undefined) coupon.discount_type = discountType;
    if (discountValue !== undefined) coupon.discount_value = Number(discountValue);
    if (minOrderAmount !== undefined) coupon.min_order_amount = Number(minOrderAmount);
    if (maxDiscountAmount !== undefined) coupon.max_discount_amount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    if (applicablePlans !== undefined) coupon.applicable_plans = applicablePlans && applicablePlans.length > 0 ? applicablePlans : null;
    if (validFrom !== undefined) coupon.valid_from = new Date(validFrom);
    if (validUntil !== undefined) coupon.valid_until = new Date(validUntil);
    if (maxUsages !== undefined) coupon.max_usages = Number(maxUsages);
    if (isActive !== undefined) coupon.is_active = isActive;

    await coupon.save();

    return res.status(200).json({
      message: `Coupon "${coupon.code}" updated successfully.`,
      coupon
    });
  } catch (error) {
    console.error('[Update Coupon Error]:', error);
    return res.status(500).json({ detail: 'Failed to update coupon: ' + error.message });
  }
};

// DELETE /api/admin/coupons/:couponId — Delete a coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) {
      return res.status(404).json({ detail: 'Coupon not found.' });
    }

    await CouponUsage.destroy({ where: { coupon_id: couponId } });
    await coupon.destroy();

    return res.status(200).json({ message: `Coupon "${coupon.code}" deleted successfully.` });
  } catch (error) {
    console.error('[Delete Coupon Error]:', error);
    return res.status(500).json({ detail: 'Failed to delete coupon: ' + error.message });
  }
};

// GET /api/admin/coupons/:couponId/usages — View users who used a coupon
exports.getCouponUsages = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) {
      return res.status(404).json({ detail: 'Coupon not found.' });
    }

    const usages = await CouponUsage.findAll({
      where: { coupon_id: couponId },
      order: [['created_at', 'DESC']]
    });

    // Enrich with user names
    const enrichedUsages = [];
    for (const usage of usages) {
      const user = await User.findByPk(usage.user_id, {
        attributes: ['user_id', 'name', 'email', 'phone_number']
      });
      enrichedUsages.push({
        ...usage.toJSON(),
        user_name: user?.name || 'Unknown',
        user_email: user?.email || '',
        user_phone: user?.phone_number || ''
      });
    }

    return res.status(200).json({
      coupon,
      usages: enrichedUsages,
      total_usages: enrichedUsages.length
    });
  } catch (error) {
    console.error('[Get Coupon Usages Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch coupon usages: ' + error.message });
  }
};
