const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Post = require("../models/post.model"); // Post model ko import karo

require("dotenv").config();

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    profilePic: {
      type: String,
      default:
        "https://plus.unsplash.com/premium_photo-1676068243734-cfdb9fc4ef59?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGxpZ2h0JTIwYmx1ZSUyMGJhY2tncm91bmQlMjBpbWd8ZW58MHx8MHx8fDA%3D",
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    refreshToken: { type: String },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true }
);

// ✅ Password Hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { userId: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || "1h" }
  );
};

// 🔑 Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = jwt.sign(
    { userId: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
  );
  this.refreshToken = refreshToken;
  return refreshToken;
};

// ✅ Verify Token Static Method
userSchema.statics.verifyToken = function (token, type = "access") {
  try {
    const secret =
      type === "refresh" ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

// // ✅ Jab bhi koi user delete ho, uski saari posts bhi delete ho jayein
// userSchema.pre("findOneAndDelete", async function (next) {
//   const user = await this.model.findOne(this.getFilter());
//   if (user) {
//     await Post.deleteMany({ user: user._id }); // ✅ Delete all posts of the user
//   }
//   next();
// });




userSchema.pre("findOneAndDelete", async function (next) {
  try {
    console.log("Middleware Triggered: findOneAndDelete");

    // Find the user before deletion
    const user = await this.model.findOne(this.getFilter());

    if (!user) {
      console.log("User not found!");
      return next();
    }

    console.log("Deleting posts for user:", user._id);
    await Post.deleteMany({ user: user._id });

    console.log("All posts deleted for user:", user._id);
    next();
  } catch (error) {
    console.error("Error in findOneAndDelete middleware:", error);
    next(error);
  }
});


module.exports = mongoose.model("User", userSchema);
