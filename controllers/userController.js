const User = require("../models/user.model");
const Post = require("../models/post.model");

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
      // ✅ Unfollow Logic
      await User.findByIdAndUpdate(loggedInUserId, { $pull: { following: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { followers: loggedInUserId } });
      return res.json({ success: true, message: "User unfollowed!" });
    } else {
      // ✅ Follow Logic
      await User.findByIdAndUpdate(loggedInUserId, { $push: { following: userId } });
      await User.findByIdAndUpdate(userId, { $push: { followers: loggedInUserId } });
      return res.json({ success: true, message: "User followed!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// ✅ Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        // Assume karo user `req.user.id` se mil raha hai (JWT se)
        console.log(req.user)
        const user = await User.findById(req.user.userId).populate('posts');
        if (!user) return res.status(404).json({ error: "User not found" });
    
        res.json({
          username: user.username,
          profilePic: user.profilePic,
          bio: user.bio,
          posts: user.posts,
          liked: user.liked,
          saved: user.saved,
          stats: {
            posts: user.posts.length,
            followers: user.followers.length,
            following: user.following.length,
          },
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
};

// ✅ Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, email, profilePic } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, profilePic },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    res.json({ success: true, user: updatedUser, message: "Profile updated successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// ✅ Get User Posts
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
};

// // ✅ Like/Unlike Post
// exports.likePost = async (req, res) => {
//   try {
//     const { postId } = req.params;
//     const userId = req.user.id;

//     const post = await Post.findById(postId);
//     if (!post) return res.status(404).json({ success: false, message: "Post not found!" });

//     const isLiked = post.likes.includes(userId);

//     if (isLiked) {
//       // ✅ Unlike Logic
//       await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
//       await User.findByIdAndUpdate(userId, { $pull: { likedPosts: postId } });
//       return res.json({ success: true, message: "Post unliked!" });
//     } else {
//       // ✅ Like Logic
//       await Post.findByIdAndUpdate(postId, { $push: { likes: userId } });
//       await User.findByIdAndUpdate(userId, { $push: { likedPosts: postId } });
//       return res.json({ success: true, message: "Post liked!" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal Server Error!" });
//   }
// };



exports.getAllUser = async(req,res)=>{


    const allUsers = await User.find();
    res.json(allUsers);

}


exports.logoutUser = async (req, res) => {
  try {
    // ✅ HTTP-only Cookie se Refresh Token Lo
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }

    // ✅ Refresh token blacklist ya invalidate karo (database ya memory me store kar sakte ho)
    global.blacklistedTokens = global.blacklistedTokens || new Set();
    global.blacklistedTokens.add(refreshToken);

    // ✅ Refresh Token ko Clear Karna
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



exports.deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Delete user from database
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
