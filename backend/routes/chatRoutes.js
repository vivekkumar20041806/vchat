const express = require("express");
const router = express.Router();
const Message = require("../models/messageModel");

// Fetch all messages between two users
router.get("/between/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json({ messages }); // frontend expects { messages: [...] }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
