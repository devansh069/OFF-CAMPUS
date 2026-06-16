const crypto = require('crypto');

/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * 
    Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Generates a unique referral code.
 */
const generateReferralCode = (name) => {
  const cleanName = (name || 'USER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 4) || 'USER';
    
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    suffix += chars[randomIndex];
  }
  
  return `${cleanName}${suffix}`;
};

module.exports = { calculateDistance, generateReferralCode };
