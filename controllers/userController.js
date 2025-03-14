const User = require("../models/user.model");
const Post = require("../models/post.model");
const redisClient = require("../services/redisClient");
const mongoose = require("mongoose");

exports.getUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }

    const userId = req.user.userId;
    // console.log("User ID:", userId);

    //  Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    //  Redis Cache Check
    const cacheKey = `user:${userId}`;

    const cachedData = await redisClient.get(cacheKey);
    // console.log(cachedData);
    if (cachedData) {
      console.log("🔵 Serving from Cache");
      return res.json(JSON.parse(cachedData));
    }

    //  User fetch with populated posts
    const user = await User.findById(userId).populate("posts").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const responseData = {
      _id: user._id,
      username: user.username,
      profilePic: user.profilePic,
      bio: user.bio,
      posts: user.posts,
      liked: user.liked,
      stats: {
        posts: user.posts.length,
        followers: user.followers.length,
        following: user.following.length,
      },
    };

    //  Redis me store karo (60 min ke liye)
    await redisClient.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.json(responseData);
  } catch (error) {
    console.log(" Error in getUserProfile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  Get User Posts with Redis Cache
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    //  Check Redis cache
    const cachedPosts = await redisClient.get(`userPosts:${userId}`);
    if (cachedPosts) {
      return res.json({ success: true, posts: JSON.parse(cachedPosts) });
    }

    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });

    //  Save in cache for 30 mins
    await redisClient.set(
      `userPosts:${userId}`,
      JSON.stringify(posts),
      "EX",
      1800
    );

    res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

//  Logout User
exports.logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken; // Optional chaining for safety

    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }

    // Add refresh token to global blacklist
    global.blacklistedTokens = global.blacklistedTokens || new Set();
    global.blacklistedTokens.add(refreshToken);

    // Clear the refreshToken cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(" Logout Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getSpecificUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is missing!" });
    }

    //  Check if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const user = await User.findById(userId)
      .select("-password -refreshToken") //  refreshToken aur password hata diya
      .populate("posts"); //posts populate kiye

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params; // Jisko follow karna hai
    console.log("userId:", userId);
    const loggedInUserId = req.user.userId; // Login User ID
    console.log("logged In user:", loggedInUserId);

    if (userId === loggedInUserId) {
      return res
        .status(400)
        .json({ success: false, message: "You can't follow yourself!" });
    }

    const userToFollow = await User.findById(userId);
    const currentUser = await User.findById(loggedInUserId);

    if (!userToFollow)
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });

    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      await User.findByIdAndUpdate(loggedInUserId, {
        $pull: { following: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { followers: loggedInUserId },
      });
    } else {
      await User.findByIdAndUpdate(loggedInUserId, {
        $push: { following: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $push: { followers: loggedInUserId },
      });
    }

    //  Cache Invalidate + Update
    await redisClient.del(`user:${loggedInUserId}`);
    await redisClient.del(`user:${userId}`);
    await redisClient.del("allUsers");

    return res.json({
      success: true,
      message: isFollowing ? "User unfollowed!" : "User followed!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const profilePic = req.file?.buffer;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { username, bio, ...(profilePic && { profilePic }) },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await redisClient.del(`user:${req.user.userId}`);
    await redisClient.del("allUsers");

    return res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    await Post.deleteMany({ user: userId });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    await redisClient.del("postsCache");
    await redisClient.del(`user:${userId}`);
    await redisClient.del("allUsers");
    await redisClient.del(`userPosts:${userId}`);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const cachedUsers = await redisClient.get("allUsers");
    if (cachedUsers) {
      return res.json(JSON.parse(cachedUsers));
    }

    const allUsers = await User.find().select("-password -refreshToken");
    await redisClient.set("allUsers", JSON.stringify(allUsers), "EX", 3600);

    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};
