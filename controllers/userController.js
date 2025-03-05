


const User = require("../models/user.model");
const Post = require("../models/post.model");
const redisClient = require("../services/redisClient");

// ✅ Follow/Unfollow User
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params; // Jisko follow karna hai
    const loggedInUserId = req.user.id; // Login User ID

    if (userId === loggedInUserId) {
      return res.status(400).json({ success: false, message: "You can't follow yourself!" });
    }

    const userToFollow = await User.findById(userId);
    const currentUser = await User.findById(loggedInUserId);

    if (!userToFollow) return res.status(404).json({ success: false, message: "User not found!" });

    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      await User.findByIdAndUpdate(loggedInUserId, { $pull: { following: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { followers: loggedInUserId } });
      await redisClient.del(`user:${loggedInUserId}`); // ✅ Cache Invalidation
      await redisClient.del(`user:${userId}`);
      return res.json({ success: true, message: "User unfollowed!" });
    } else {
      await User.findByIdAndUpdate(loggedInUserId, { $push: { following: userId } });
      await User.findByIdAndUpdate(userId, { $push: { followers: loggedInUserId } });
      await redisClient.del(`user:${loggedInUserId}`); // ✅ Cache Invalidation
      await redisClient.del(`user:${userId}`);
      return res.json({ success: true, message: "User followed!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// // ✅ Get User Profile with Redis Cache
// exports.getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.userId;
    
//     // ✅ Pehle Redis se check karo
//     const cachedData = await redisClient.get(`user:${userId}`);
//     if (cachedData) {
//       return res.json(JSON.parse(cachedData));
//     }

//     const user = await User.findById(userId).populate("posts");
//     if (!user) return res.status(404).json({ error: "User not found" });

//     const responseData = {
//       _id: user._id,
//       username: user.username,
//       profilePic: user.profilePic,
//       bio: user.bio,
//       posts: user.posts,
//       liked: user.liked,
//       stats: {
//         posts: user.posts.length,
//         followers: user.followers.length,
//         following: user.following.length,
//       },
//     };

//     console.log("sended data:",responseData);
//     // ✅ Data Redis me store karo (60 min ke liye)
//     await redisClient.set(`user:${userId}`, JSON.stringify(responseData),'EX',3600, );

//     res.json(responseData);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // ✅ Pehle Redis se check karo
    const cachedData = await redisClient.get(`user:${userId}`);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // ✅ User fetch karo with populated posts
    const user = await User.findById(userId).populate("posts").lean().exec();
    if (!user) return res.status(404).json({ error: "User not found" });

    const responseData = {
      _id: user._id,
      username: user.username,
      profilePic: user.profilePic,
      bio: user.bio,
      posts: user.posts, // ✅ Ab ye properly populated hoga
      liked: user.liked,
      stats: {
        posts: user.posts.length,
        followers: user.followers.length,
        following: user.following.length,
      },
    };

    console.log("sended data:", responseData);

    // ✅ Redis me store karo (60 min ke liye)
    await redisClient.set(`user:${userId}`, JSON.stringify(responseData), 'EX', 3600);

    res.json(responseData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ✅ Update User Profile & Invalidate Cache
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
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await redisClient.del(`user:${req.user.userId}`); // ✅ Cache Invalidation

    return res.json({ success: true, user: updatedUser, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ Get User Posts with Redis Cache
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ Check Redis cache
    const cachedPosts = await redisClient.get(`userPosts:${userId}`);
    if (cachedPosts) {
      return res.json({ success: true, posts: JSON.parse(cachedPosts) });
    }

    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });

    // ✅ Save in cache for 30 mins
    await redisClient.set(`userPosts:${userId}`, JSON.stringify(posts),'EX', 1800);

    res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// ✅ Get All Users with Redis Cache
exports.getAllUser = async (req, res) => {
  try {
    const cachedUsers = await redisClient.get("allUsers");
    if (cachedUsers) {
      return res.json(JSON.parse(cachedUsers));
    }

    const allUsers = await User.find();
    await redisClient.set("allUsers", JSON.stringify(allUsers),'EX', 3600);

    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// ✅ Logout User
exports.logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }

    global.blacklistedTokens = global.blacklistedTokens || new Set();
    global.blacklistedTokens.add(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete User Account & Invalidate Cache
exports.deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    await Post.deleteMany({ userId });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    await redisClient.del(`user:${userId}`); // ✅ Invalidate User Cache
    await redisClient.del(`userPosts:${userId}`);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
