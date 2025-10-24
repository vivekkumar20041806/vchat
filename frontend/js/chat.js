const socket = io("http://localhost:5001"); 
const token = localStorage.getItem("chat_token");
const user = JSON.parse(localStorage.getItem("chat_user") || "null");

if (!token || !user) window.location.href = "./index.html";

const API = (path) => `http://localhost:5001/api${path}`;

const chatTitle = document.getElementById("chatTitle");
const usersList = document.getElementById("usersList");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const logoutBtn = document.getElementById("logoutBtn");

chatTitle.textContent = `Logged in as ${user.username}`;
socket.emit("join", { token });

let selectedUser = null;
let chats = {}; // Store messages per userId

// Load users and auto-select last selected or first user
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

    // Auto-select stored user if exists, else first user
    if (storedUser) {
      const matchedUser = data.users.find(u => u._id === storedUser._id);
      if (matchedUser) await selectUserToChat(matchedUser);
      else if (firstUser) await selectUserToChat(firstUser);
    } else if (firstUser) {
      await selectUserToChat(firstUser);
    }

  } catch (err) { console.error(err); }
}

// Select a user
async function selectUserToChat(u) {
  if (selectedUser && selectedUser._id === u._id) return;

  selectedUser = u;
  localStorage.setItem("selected_user", JSON.stringify(selectedUser));

  // Load messages from chats object if not already loaded
  if (!chats[u._id]) {
    const messages = await loadChatHistory(u._id);
    chats[u._id] = messages;
  }

  // Clear div and append messages
  messagesDiv.innerHTML = "";
  chats[u._id].forEach(m => appendMessage(m));
  scrollBottom();
}

// Load chat history from backend
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

// Append a single message
function appendMessage(m) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (m.senderId && (m.senderId.toString() === user.id.toString() || m.senderId === user.id)) {
    div.classList.add("me");
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = new Date(m.createdAt).toLocaleString();

  const text = document.createElement("div");
  text.textContent = m.text;

  div.appendChild(meta);
  div.appendChild(text);
  messagesDiv.appendChild(div);
}

// Scroll chat to bottom
function scrollBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Send private message
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !selectedUser) return alert("Please select a user to chat with.");
  socket.emit("privateMessage", { token, toUserId: selectedUser._id, text });
  messageInput.value = "";
});

// Socket events
socket.on("receivePrivateMessage", (msg) => {
  if (!chats[msg.senderId]) chats[msg.senderId] = [];
  chats[msg.senderId].push(msg);

  if (selectedUser && (msg.senderId === selectedUser._id || msg.senderId === user.id)) {
    appendMessage(msg);
    scrollBottom();
  }
});

socket.on("messageSent", (ack) => {
  if (!chats[selectedUser._id]) chats[selectedUser._id] = [];
  const msg = { senderId: user.id, text: ack.text, createdAt: ack.createdAt };
  chats[selectedUser._id].push(msg);
  appendMessage(msg);
  scrollBottom();
});

socket.on("unauthorized", () => {
  alert("Session expired. Please login again.");
  localStorage.removeItem("chat_token");
  localStorage.removeItem("chat_user");
  localStorage.removeItem("selected_user");
  window.location.href = "./index.html";
});

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("chat_token");
  localStorage.removeItem("chat_user");
  localStorage.removeItem("selected_user");
  chats = {};
  window.location.href = "./index.html";
});

// Initialize chat
initializeChat();
async function initializeChat() { 
  await loadUsers();

  // Load last selected user's chat after refresh
  const storedUser = JSON.parse(localStorage.getItem("selected_user"));
  if (storedUser) {
    const matchedUser = (await fetch(API("/auth/users")).then(res => res.json()))
                        .users.find(u => u._id === storedUser._id);
    if (matchedUser) {
      selectedUser = matchedUser;

      // Load messages from backend
      const messages = await loadChatHistory(selectedUser._id);
      chats[selectedUser._id] = messages;

      messagesDiv.innerHTML = "";
      messages.forEach(m => appendMessage(m));
      scrollBottom();
    }
  }
}
