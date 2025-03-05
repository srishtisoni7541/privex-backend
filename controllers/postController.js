const Post = require("../models/post.model");
const multer = require("multer");
const User = require("../models/user.model");
const mongoose = require('mongoose');
const redisClient = require("../services/redisClient");
const storage = multer.memoryStorage(); // Or use diskStorage for local file

const getAllPosts = async (req, res) => {
  try {
    const cacheKey = "allPosts";
    
    //  Redis Check: Cache me data hai kya?
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("🔵 Serving from Cache");
      return res.status(200).json({
        success: true,
        message: "All posts fetched successfully (Cached)",
        posts: JSON.parse(cachedData),
      });
    } 

    //  Redis me nahi mila, toh DB se fetch karo
    const allPosts = await Post.find()
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });

    const formattedPosts = allPosts.map((post) => {
      return {
        ...post._doc,
        image: post.image || null, // Cloudinary URL directly return karna hai
      };
    });

    //  Redis me Cache store karo, 10 min ke liye
    await redisClient.set(cacheKey, JSON.stringify(formattedPosts), 'EX', 600);

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
      return res.status(400).json({ message: "Caption and image are required" });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    // ✅ Since Multer-Cloudinary auto uploads, get image URL from req.file.path
    const imageUrl = req.file.path;

    // Save post with Cloudinary URL instead of binary data
    const newPost = new Post({
      user: req.user.userId,
      image: imageUrl, // Cloudinary URL
      caption,
    });


    const savedPost = await newPost.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { posts: savedPost._id },
    });

    // Invalidate cache
    await redisClient.del("allPosts");

    res.status(201).json(savedPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
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
  let userId = req.body.userId || req.user?._id;

  try {
    // console.log("Received userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid User ID or Post ID" });
    }

    userId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(userId).select("username profilePic");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if user already liked the post
    const alreadyLiked = post.likes.some(like => like._id.toString() === userId.toString());

    if (alreadyLiked) {
      // Galti se pura array clear na ho jaye, sirf ek user ka like remove karo
      post.likes = post.likes.filter(like => like._id.toString() !== userId.toString());
    } else {
      // ✅ Naya like add karo bina purane likes delete kiye
      post.likes.push({ 
        _id: userId, 
        username: currentUser.username, 
        profilePic: currentUser.profilePic 
      });
    }

    await post.save();

    res.json({ message: alreadyLiked ? "Post unliked" : "Post liked", likes: post.likes });

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
    const cacheKey = `post:${postId}`;

    // 🛑 Pehle Redis se check karo
    const cachedPost = await redisClient.get(cacheKey);
    if (cachedPost) {
      console.log("🔵 Serving Post from Cache");
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedPost),
      });
    }

    //  Redis me nahi mila, toh DB se fetch karo
    const post = await Post.findById(postId)
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // ✅ Redis me Cache store karo, 10 min ke liye
    await redisClient.set(cacheKey,  JSON.stringify(post),'EX',600);

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
