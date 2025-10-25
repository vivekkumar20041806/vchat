const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMsg = document.getElementById("authMsg");

showLogin.addEventListener("click", () => {
  showLogin.classList.add("active");
  showRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

showRegister.addEventListener("click", () => {
  showRegister.classList.add("active");
  showLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

// 🔹 API base URL for Render
const API = (path) => `https://vchat-qcou.onrender.com/api${path}`;

// -------------------- Login --------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const emailOrUsername = document.getElementById("loginEmailOrUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  try {
    const res = await fetch(API("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUsername, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    // 🔹 Save token and user to localStorage
    localStorage.setItem("chat_token", data.token);
    localStorage.setItem("chat_user", JSON.stringify(data.user));

    window.location.href = "./frontend/chat.html";
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

// -------------------- Register --------------------
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  try {
    const res = await fetch(API("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Register failed");

    // 🔹 Save token and user to localStorage
    localStorage.setItem("chat_token", data.token);
    localStorage.setItem("chat_user", JSON.stringify(data.user));

    window.location.href = "./frontend/chat.html";
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

// -------------------- Users List --------------------
const usersList = document.getElementById("usersList");

const fetchUsers = async () => {
  const token = localStorage.getItem("chat_token");
  try {
    const res = await fetch(API("/auth/users"), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    usersList.innerHTML = "";

    data.users.forEach(user => {
      const li = document.createElement("li");
      li.textContent = user.username;
      li.dataset.id = user._id;
      li.addEventListener("click", () => selectUser(user));
      usersList.appendChild(li);
    });
  } catch (err) {
    console.error("Error fetching users:", err);
  }
};

const selectUser = (user) => {
  console.log("Chat with:", user.username);
  // यहाँ chat logic डाल सकते हो (जैसे messages load करना)
};

// 🔹 Initialize
fetchUsers();
