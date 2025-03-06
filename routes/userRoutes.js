
const express = require("express");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const upload = require("../utils/multer"); // ✅ Multer imported

const {
  followUser,
  getUserProfile,
  updateUserProfile,
  getUserPosts,
  getAllUser,
  logoutUser,
  deleteUserAccount,
  getSpecificUser,
} = require("../controllers/userController");

const isLoggedIn = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Rate Limiting for Brute-force Protection
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 attempts per 10 mins
  message: "Too many attempts, please try again later.",
});

// ✅ Security Middleware
router.use(xss());
router.use(mongoSanitize());

// ✅ Routes
router.get("/allUsers", getAllUser);

router.get("/profile", isLoggedIn, getUserProfile); // Get user profile
router.get("/logout", isLoggedIn, logoutUser);
router.get('/:id',isLoggedIn,getSpecificUser) 
router.post("/update-profile", isLoggedIn, upload.single("profileImg"), updateUserProfile); // ✅ Profile Update
router.post("/follow/:userId", isLoggedIn, followUser); // Follow/Unfollow user
router.get("/posts/:userId", isLoggedIn, getUserPosts); // Get user posts
router.delete("/delete-account/:userId", isLoggedIn, deleteUserAccount);

module.exports = router;
