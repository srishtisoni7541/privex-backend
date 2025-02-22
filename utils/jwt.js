const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES });
};

module.exports = { generateAccessToken, generateRefreshToken };
