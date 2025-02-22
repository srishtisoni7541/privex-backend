const Post = require("../models/post.model");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/user.model");

// Multer Storage Setup (Memory me rakho ya Disk pe save karo)
const storage = multer.memoryStorage(); // Or use diskStorage for local files
const upload = multer({ storage });

// // Middleware to verify token
// const verifyToken = (req, res, next) => {
//   const token = req.header("Authorization");
//   if (!token) return res.status(401).json({ message: "Access Denied" });

//   try {
//     const verified = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = verified;
//     next();
//   } catch (err) {
//     res.status(400).json({ message: "Invalid Token" });
//   }
// };

const getAllPosts = async (req, res) => {
  try {
    const allPosts = await Post.find()
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 }); // Latest posts pehle aayenge

    return res.status(200).json({
      success: true,
      message: "All posts fetched successfully",
      posts: allPosts,
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
    const imageBase64 = req.file.buffer.toString("base64");

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
    console.log(newPost);

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

const likePost = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
console.log(req.body);
  try {
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already liked the post
    const hasLiked = post.likes.includes(userId);
    console.log(hasLiked);

    if (hasLiked) {
      // Unlike the post
      post.likes = post.likes.filter((id) => id.toString() !== userId);
      post.likeCount -= 1;
    } else {
      // Like the post
      post.likes.push(userId);
      post.likeCount += 1;
    }

    // Save the updated post
    const updatedPost = await post.save();
    console.log(updatedPost);

    // Populate the likes to get user details
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
  console.log(postId);

  try {
    // Find the post and populate the likes with user details
    const post = await Post.findById(postId).populate(
      "likes",
      "username profilePic"
    );
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Return the list of users who liked the post
    res.status(200).json({
      success: true,
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    console.error(error);
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

    console.log("post data:",post);
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
