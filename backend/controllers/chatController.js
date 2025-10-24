// backend/controllers/chatController.js
const Massage = require("../models/massageModel");
const User = require("../models/userModel");

// Send message via REST (also we use socket for realtime)
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text, roomId } = req.body;
    if (!senderId || !text) return res.status(400).json({ message: "Missing fields" });

    const msg = await Massage.create({ senderId, receiverId: receiverId || null, text, roomId: roomId || null });
    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get messages for a chat between two users (simple)
exports.getMessagesBetween = async (req, res) => {
  try {
    const { userA, userB } = req.params; // /api/chat/:userA/:userB
    if (!userA || !userB) return res.status(400).json({ message: "Missing users" });

    const messages = await Massage.find({
      $or: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA }
      ]
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get room messages
exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ message: "Missing roomId" });

    const messages = await Massage.find({ roomId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
