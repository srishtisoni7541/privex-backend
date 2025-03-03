const Post = require("../models/post.model");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/user.model");
const mongoose = require('mongoose');
// Multer Storage Setup (Memory me rakho ya Disk pe save karo)
const storage = multer.memoryStorage(); // Or use diskStorage for local files
const upload = multer({ storage });



// const getAllPosts = async (req, res) => {
//   try {
//     const allPosts = await Post.find()
//       .populate("user", "username profilePic")
//       .sort({ createdAt: -1 }); // Latest posts pehle aayenge

//     return res.status(200).json({
//       success: true,
//       message: "All posts fetched successfully",
//       posts: allPosts,
//     });
//   } catch (err) {
//     console.error("Error fetching posts:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while fetching posts",
//     });
//   }
// };


const getAllPosts = async (req, res) => {
  try {
    const allPosts = await Post.find()
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 }); // Latest posts pehle aayenge
    const formattedPosts = allPosts.map((post) => {
      const mimeType = post.imageType || "image/jpeg"; // ✅ Ab `post` available hai
      return {
        ...post._doc,
        image: post.image ? `data:${mimeType};base64,${post.image.toString("base64")}` : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "All posts fetched successfully",
      posts: formattedPosts,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching posts",
    });
  }
};



const createPost = async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file || !caption) {
      return res
        .status(400)
        .json({ message: "Caption and image are required" });
    }

    // Convert Image Buffer to Base64
    const imageBase64 = req.file.buffer;

    // Ensure user ID exists
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    // Create New Post
    const newPost = new Post({
      user: req.user.userId,
      image: imageBase64,
      caption,
    });
    // console.log(newPost);

    const savedPost = await newPost.save();

    // **✅ Update User's Posts Array**
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { posts: savedPost._id },
    });

    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    const updatedPost = await Post.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    await Post.findByIdAndDelete(id);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// const likePost = async (req, res) => {
//   const { postId } = req.params;
//   let { userId } = req.body;

//   try {
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ message: "Invalid User ID" });
//     }
    
//     userId = new mongoose.Types.ObjectId(userId);

//     const post = await Post.findById(postId);
//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const hasLiked = post.likes.includes(userId);

//     if (hasLiked) {
//       post.likes = post.likes.filter(id => id.toString() !== userId.toString());
//       post.likeCount = Math.max(0, post.likeCount - 1);
//     } else {
//       post.likes = [...post.likes, userId]; // Ensure array is correctly updated
//       post.likeCount += 1;
//     }

//     const updatedPost = await post.save();

//     const populatedPost = await Post.findById(updatedPost._id).populate(
//       "likes",
//       "username profilePic"
//     );

//     res.status(200).json({
//       message: hasLiked ? "Post unliked" : "Post liked",
//       post: populatedPost,
//     });
//   } catch (error) {
//     console.error("Error liking post:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };
const likePost = async (req, res) => {
  const { postId } = req.params;
  let userId = req.body.userId || req.user?._id; // ✅ Authentication ka dhyan rakho

  try {
    console.log("Received userId:", userId);

    // ✅ User aur Post ID validate karo
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid User ID or Post ID" });
    }

    userId = new mongoose.Types.ObjectId(userId);

    // ✅ User ka actual data fetch karo
    const currentUser = await User.findById(userId).select("username profilePic");
    console.log("Fetched User:", currentUser);

    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    console.log("Before Like Update:", post.likes); // Debugging ke liye

    // ✅ Check if user already liked the post
    const alreadyLikedIndex = post.likes.findIndex(like => like._id.toString() === userId.toString());

    if (alreadyLikedIndex !== -1) {
      // ❌ Agar user pehle se like kar chuka hai to sirf uska like remove karo
      post.likes.splice(alreadyLikedIndex, 1);
    } else {
      // ✅ Naye user ka like push karo
      post.likes.push({ 
        _id: userId, 
        username: currentUser.username, 
        profilePic: currentUser.profilePic 
      });
    }

    // ✅ Save changes
    await post.save();

    console.log("After Like Update:", post.likes); // Debugging ke liye

    res.json({ message: alreadyLikedIndex !== -1 ? "Post unliked" : "Post liked", likes: post.likes });

  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};







const getAllLikes = async (req, res) => {
  const { postId } = req.params;

  try {
    // Find the post and populate the likes with more user details
    const post = await Post.findById(postId).populate(
      "likes",
      "username profilePic " // Add extra fields if needed
    );

    console.log("liked posts:",post);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Returning a structured response
    res.status(200).json({
      success: true,
      likesCount: post.likes.length,
      likedBy: post.likes.map((user) => ({
        userId: user._id,
        username: user.username,
        profilePic: user.profilePic,
      })),
    });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const getPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId)
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });
    // Check if post exists
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Send the found post
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
  likePost,
  getAllLikes,
  getPost,
};
