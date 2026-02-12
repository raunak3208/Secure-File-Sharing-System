const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash password
exports.hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
};

// Compare password
exports.comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error comparing password: ' + error.message);
  }
};

// Generate token
exports.generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate device fingerprint
exports.generateFingerprint = (userAgent, screenRes, timezone, language) => {
  const data = `${userAgent}-${screenRes}-${timezone}-${language}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 20);
};
