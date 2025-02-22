const express = require("express");
const router = express.Router();
const { createPost, updatePost, deletePost, getAllPosts, getAllLikes, getPost, likePost } = require("../controllers/postController");
const isLoggedIn = require("../middlewares/authMiddleware");



const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

//  Get all posts (Public route)
router.get("/allposts", getAllPosts);
//  POST route with multer middleware
router.post("/create", isLoggedIn, upload.single("image"), createPost);
router.post('/like/:postId',isLoggedIn,likePost);
// router.get('/post/:postId',getPost);
router.post('/allLikes',getAllLikes);

// Update a post (Protected route)
router.put("/update/:postId", isLoggedIn, updatePost);

//  Delete a post (Protected route)
router.delete("/delete/:postId", isLoggedIn, deletePost);

module.exports = router;