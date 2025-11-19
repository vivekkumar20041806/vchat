// ✅ Socket initialization (updated with token auth)
const token = localStorage.getItem("chat_token");
const socket = io("https://vchat-qcou.onrender.com", {
  auth: { token }
});

const user = JSON.parse(localStorage.getItem("chat_user") || "null");

if (!token || !user) window.location.href = "../index.html";

const API = (path) => `https://vchat-qcou.onrender.com/api${path}`;

const chatTitle = document.getElementById("chatTitle");
const usersList = document.getElementById("usersList");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const logoutBtn = document.getElementById("logoutBtn");

const toggleUsersBtn = document.getElementById("toggleUsers");
const usersPanel = document.getElementById("usersPanel");
const usersOverlay = document.getElementById("usersOverlay");
const closeUsersPanelBtn = document.getElementById("closeUsersPanel");

let selectedUser = null;
let chats = {};

// Initial header
chatTitle.textContent = `Logged in as ${user.username}`;

// Toggle mobile users panel
toggleUsersBtn.addEventListener("click", () => {
  usersPanel.classList.toggle("active");
  usersOverlay.classList.toggle("active");
});
closeUsersPanelBtn.addEventListener("click", () => {
  usersPanel.classList.remove("active");
  usersOverlay.classList.remove("active");
});
usersOverlay.addEventListener("click", () => {
  usersPanel.classList.remove("active");
  usersOverlay.classList.remove("active");
});

// Ensure panel hidden on desktop
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    usersPanel.classList.remove("active");
    usersOverlay.classList.remove("active");
  }
});

// Load users
async function loadUsers() {
  try {
    const res = await fetch(API("/auth/users"));
    if (!res.ok) return;
    const data = await res.json();

    usersList.innerHTML = "";
    const userId = user.id || user._id;
    let firstUser = null;
    const storedUser = JSON.parse(localStorage.getItem("selected_user"));

    data.users.forEach((u) => {
      if (u._id === userId) return;
      const li = document.createElement("li");
      li.textContent = u.username;
      li.dataset.userid = u._id;
      li.addEventListener("click", () => selectUserToChat(u));
      usersList.appendChild(li);
      if (!firstUser) firstUser = u;
    });

    if (storedUser) {
      const matchedUser = data.users.find((u) => u._id === storedUser._id);
      if (matchedUser) selectUserToChat(matchedUser);
      else if (firstUser) selectUserToChat(firstUser);
    } else if (firstUser) {
      selectUserToChat(firstUser);
    }
  } catch (err) {
    console.error(err);
  }
}

// Select user
async function selectUserToChat(u) {
  if (selectedUser && selectedUser._id === u._id) return;
  selectedUser = u;
  localStorage.setItem("selected_user", JSON.stringify(selectedUser));

  // Update header dynamically
  chatTitle.textContent = `Chat with ${selectedUser.username}`;

  // Load messages
  if (!chats[u._id]) {
    const messages = await loadChatHistory(u._id);
    chats[u._id] = messages;
  }

  messagesDiv.innerHTML = "";
  chats[u._id].forEach((m) => appendMessage(m));
  scrollBottom(true);
}

// Load chat history
async function loadChatHistory(otherUserId) {
  try {
    const res = await fetch(API(`/chat/between/${user.id}/${otherUserId}`));
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Append message
function appendMessage(m) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (
    m.senderId &&
    (m.senderId.toString() === user.id.toString() ||
      m.senderId === user.id)
  )
    div.classList.add("me");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = new Date(m.createdAt).toLocaleString();

  const text = document.createElement("div");
  text.textContent = m.text;

  div.appendChild(meta);
  div.appendChild(text);
  messagesDiv.appendChild(div);
}

// ✅ Scroll (improved)
function scrollBottom(force = false) {
  if (force) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } else {
    const nearBottom =
      messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 200;
    if (nearBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// ✅ Send message
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !selectedUser) return alert("Select a user first!");
  socket.emit("privateMessage", { token, toUserId: selectedUser._id, text });
  messageInput.value = "";
  scrollBottom(true);
});

// ✅ Socket connect logs
socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
});
socket.on("connect_error", (err) => {
  console.error("[socket] connect_error:", err.message);
});

// ✅ Real-time message receive fix
socket.on("receivePrivateMessage", (msg) => {
  console.log("[socket] receivePrivateMessage payload:", msg);

  const senderId =
    msg.senderId ?? msg.sender ?? msg.from ?? msg.userId ?? "unknown";
  const text = msg.text ?? msg.message ?? msg.body;
  const createdAt = msg.createdAt ?? new Date().toISOString();

  if (!chats[senderId]) chats[senderId] = [];
  const messageObj = { senderId, text, createdAt };
  chats[senderId].push(messageObj);

  const selectedId = selectedUser ? selectedUser._id || selectedUser.id : null;
  if (
    selectedId &&
    (senderId.toString() === selectedId.toString() ||
      senderId.toString() === (user.id || user._id).toString())
  ) {
    appendMessage(messageObj);
    scrollBottom(true);
  } else {
    console.log("[socket] new message from", senderId);
  }
});

// ✅ Sent message confirm
socket.on("messageSent", (ack) => {
  if (!chats[selectedUser._id]) chats[selectedUser._id] = [];
  const msg = {
    senderId: user.id,
    text: ack.text,
    createdAt: ack.createdAt,
  };
  chats[selectedUser._id].push(msg);
  appendMessage(msg);
  scrollBottom(true);
});

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "../index.html";
});

// Initialize
loadUsers();
