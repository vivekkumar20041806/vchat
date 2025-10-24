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

connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Add this line
app.get("/", (req, res) => {
  res.send("VChat backend is running!");
});

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "secret_for_dev";

// Online users map
const onlineUsers = new Map();

const verifyToken = (token) => {
  try { return jwt.verify(token, JWT_SECRET); }
  catch (e) { return null; }
};

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // User join
  socket.on("join", ({ token }) => {
    const payload = verifyToken(token);
    if (!payload) return socket.emit("unauthorized");
    const userId = payload.id;
    onlineUsers.set(userId.toString(), socket.id);
    socket.userId = userId;
  });

  // Private message
  socket.on("privateMessage", async (data) => {
    try {
      const payload = verifyToken(data.token);
      if (!payload) return socket.emit("unauthorized");

      const msg = await Message.create({
        senderId: payload.id,
        receiverId: data.toUserId,
        text: data.text,
        createdAt: new Date()
      });

      const toSocketId = onlineUsers.get(data.toUserId);
      if (toSocketId) io.to(toSocketId).emit("receivePrivateMessage", msg);

      socket.emit("messageSent", msg);
    } catch (err) {
      console.error("Error sending private message:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.userId) onlineUsers.delete(socket.userId.toString());
  });
});



server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
