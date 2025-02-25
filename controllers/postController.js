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
//   const { userId } = req.body;
// console.log(req.body);
//   try {
//     // Check if post exists
//     const post = await Post.findById(postId);
//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     // Check if user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if user already liked the post
//     const hasLiked = post.likes.includes(userId);
//     console.log(hasLiked);

//     if (hasLiked) {
//       // Unlike the post
//       post.likes = post.likes.filter((id) => id.toString() !== userId);
//       post.likeCount -= 1;
//     } else {
//       // Like the post
//       post.likes.push(userId);
//       post.likeCount += 1;
//     }

//     // Save the updated post
//     const updatedPost = await post.save();
//     console.log(updatedPost);

//     // Populate the likes to get user details
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
  let { userId } = req.body;

  // console.log("Request Body:", req.body); 

  try {
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }
    
    // Convert userId to ObjectId
    userId = new mongoose.Types.ObjectId(userId);


    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hasLiked = post.likes.some((id) => id.toString() === userId.toString());

    if (hasLiked) {
     
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
      post.likeCount = Math.max(0, post.likeCount - 1); 
    } else {
      
      post.likes.push(userId);
      post.likeCount += 1;
    }

    
    const updatedPost = await post.save();
    

  
    const populatedPost = await Post.findById(updatedPost._id).populate(
      "likes",
      "username profilePic"
    );

    res.status(200).json({
      message: hasLiked ? "Post unliked" : "Post liked",
      post: populatedPost,
    });
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
