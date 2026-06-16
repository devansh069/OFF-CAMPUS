const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Saves a base64 encoded image string as a file on the server.
 * @param {string} base64String - The base64 image data
 * @param {string} subFolder - Folder under public/uploads/
 * @returns {string} Relative URL path to access the saved file
 */
const saveBase64Image = (base64String, subFolder = 'photos') => {
  if (!base64String) return null;
  
  // If already a URL, return it directly
  if (base64String.startsWith('http://') || base64String.startsWith('https://') || base64String.startsWith('/uploads/')) {
    return base64String;
  }
  
  let mimeType = 'image/jpeg';
  let rawBase64 = base64String;
  
  // Check if string contains base64 metadata header
  if (base64String.startsWith('data:image/')) {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      rawBase64 = matches[2];
    }
  }
  
  const buffer = Buffer.from(rawBase64, 'base64');
  
  // Determine extension based on mime type
  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('gif')) ext = 'gif';
  else if (mimeType.includes('webp')) ext = 'webp';
  
  const uploadDir = path.join(__dirname, '../../public/uploads', subFolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  
  // Return the relative URL path accessible by the frontend
  return `/uploads/${subFolder}/${fileName}`;
};

module.exports = { saveBase64Image };
