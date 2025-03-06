// const express = require("express");
// const router = express.Router();
// const { createPost, updatePost, deletePost, getAllPosts, getAllLikes, getPost, likePost } = require("../controllers/postController");
// const isLoggedIn = require("../middlewares/authMiddleware");



// const multer = require("multer");
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// //  Get all posts (Public route)
// router.get("/allposts", getAllPosts);
// //  POST route with multer middleware
// router.post("/create", isLoggedIn, upload.single("image"), createPost);
// router.post('/like/:postId',isLoggedIn,likePost);
// // router.get('/post/:postId',getPost);
// router.get('/allLikes/:postId',getAllLikes);

// // Update a post (Protected route)
// router.put("/update/:postId", isLoggedIn, updatePost);

// //  Delete a post (Protected route)
// router.delete("/delete/:postId", isLoggedIn, deletePost);

// module.exports = router;







const express = require("express");
const router = express.Router();
const {
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
  getAllLikes,
  getPost,
  likePost,
} = require("../controllers/postController");
const isLoggedIn = require("../middlewares/authMiddleware");

// ✅ Import Cloudinary Upload Middleware
const { upload } = require("../config/cloudinary");

//  🔹 PUBLIC ROUTES
router.get("/Allposts", getAllPosts); // Get all posts
router.get("/post/:postId", getPost); // Get a single post by ID
router.get("/allLikes/:postId", getAllLikes); // Get likes for a post

//  🔒 PROTECTED ROUTES (Require Login)
// router.post("/create", isLoggedIn, upload.single("image"), createPost); 
router.post("/create", isLoggedIn, upload.single("image"), (req, res, next) => {
    next();
  }, createPost);
  
router.post("/like/:postId", isLoggedIn, likePost); // Like a Post
router.put("/update/:postId", isLoggedIn, updatePost); // Update a Post
router.delete("/delete/:postId", isLoggedIn, deletePost); // Delete a Post

module.exports = router;
