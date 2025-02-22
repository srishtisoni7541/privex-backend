const express = require("express");
const { register, login, verifyOTP } = require("../controllers/authController");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");

const router = express.Router();

// Rate Limiting for Brute-force Protection
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 attempts per 10 mins
  message: "Too many attempts, please try again later.",
});

// Input Validation Middleware
const validateRegister = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be 3-20 characters long"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Prevent XSS & NoSQL Injection globally on auth routes
router.use(xss());
router.use(mongoSanitize());

// Routes
router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/verify-otp", authLimiter, verifyOTP);

module.exports = router;
