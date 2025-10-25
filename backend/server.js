require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("../database/connection");
const authRoutes = require("./routes/authroutes");
const chatRoutes = require("./routes/chatRoutes");
const jwt = require("jsonwebtoken");
const Message = require("./models/messageModel");

const app = express();
const server = http.createServer(app);

// ✅ Connect to MongoDB
connectDB();

// ✅ Proper CORS setup (Frontend + Local)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://vchat-qcou.onrender.com"  // 👈 your frontend URL
    ],
    credentials: true,
  })
);

// ✅ Body parser
app.use(express.json());

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("VChat backend is running successfully!");
});

// ✅ Dynamic port (Render assigns automatically)
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "secret_for_dev";

// ✅ Online users map
const onlineUsers = new Map();

// ✅ Token verification function
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

// ✅ Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://vchat-qcou.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // User joins
  socket.on("join", ({ token }) => {
    const payload = verifyToken(token);
    if (!payload) return socket.emit("unauthorized");
    const userId = payload.id;
    onlineUsers.set(userId.toString(), socket.id);
    socket.userId = userId;
  });

  // Private message event
  socket.on("privateMessage", async (data) => {
    try {
      const payload = verifyToken(data.token);
      if (!payload) return socket.emit("unauthorized");

      const msg = await Message.create({
        senderId: payload.id,
        receiverId: data.toUserId,
        text: data.text,
        createdAt: new Date(),
      });

      const toSocketId = onlineUsers.get(data.toUserId);
      if (toSocketId) io.to(toSocketId).emit("receivePrivateMessage", msg);

      socket.emit("messageSent", msg);
    } catch (err) {
      console.error("❌ Error sending private message:", err);
    }
  });

  // User disconnect
  socket.on("disconnect", () => {
    if (socket.userId) onlineUsers.delete(socket.userId.toString());
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ✅ Start server
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
