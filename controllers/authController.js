const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const sendOTP = require("../utils/sendMail");
const { validationResult } = require("express-validator");
const mongoSanitize = require("express-mongo-sanitize");
const jwt = require('jsonwebtoken');

// ✅ Remove xss-clean and only use mongoSanitize
const sanitizeInput = (input) => mongoSanitize.sanitize(input);
exports.register = async (req, res) => {
  try {
    // Validate Input Fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let { username, email, password } = req.body;
    username = sanitizeInput(username);
    email = sanitizeInput(email);

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Create User
    const user = await User.create({ username, email, password });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

  // ✅ Refresh token ko HTTP-only Cookie me Store Kar
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    sameSite: "Strict", 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });


    // Send tokens and user info in response
    res.status(201).json({
      message: "User registered successfully.",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    // Validate Input Fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let { email, password } = req.body;

    email = sanitizeInput(email); // ✅ Email sanitize karo
    password = sanitizeInput(password);

    // console.log("User Input:", { email, password });

    // ✅ Ensure password is retrieved from DB
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate Access Token and Refresh Token
    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });


     // ✅ Refresh token ko HTTP-only Cookie me Store Kar
     res.cookie("refreshToken", refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "Strict", 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


    // Generate OTP (6-digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    await user.save();

    // Send OTP to email
    await sendOTP(email, otp);

    res.status(200).json({ 
      message: "OTP sent to your email", 
      accessToken, 
      user 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.verifyOTP = async (req, res) => {
  try {
    let { email, otp } = req.body;
    email = sanitizeInput(email);
    otp = sanitizeInput(otp);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Secure OTP Comparison
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate JWT Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.otp = null; // Reset OTP after successful login
    await user.save();

    res.cookie("accesstoken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    res.json({ accessToken, message: "Login successful" });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
