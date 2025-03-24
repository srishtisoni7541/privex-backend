const express = require('express');
const Comment =require('../models/comment.model.js');
const authMiddleware = require('../middlewares/authMiddleware.js');

const router = express.Router();

// ✅ Add Comment (REST + Socket.io)
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { postId, text } = req.body;
    const userId = req.user.id;
    
    if (!text.trim()) return res.status(400).json({ message: "Comment cannot be empty." });

    const newComment = new Comment({ postId, userId, text });
    await newComment.save();

    // ✅ Emit new comment to all clients
    const io = req.app.get("io");
    io.emit("newComment", newComment);

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Fetch Comments by Post
router.get("/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate("userId", "username avatar")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Delete Comment
router.delete("/:commentId", authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);

    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.userId.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

    await comment.deleteOne();

    // ✅ Notify clients about comment deletion
    const io = req.app.get("io");
    io.emit("deleteComment", commentId);

    res.json({ message: "Comment deleted." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Like/Unlike Comment
router.patch("/:commentId/like", authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const comment = await Comment.findById(commentId);

    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    // ✅ Notify clients about like/unlike
    const io = req.app.get("io");
    io.emit("likeComment", { commentId, likes: comment.likes });

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
