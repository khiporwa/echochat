const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const dataPath = path.join(__dirname, "../data.json");

const readUsers = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ users: [] }));
  }
  const data = fs.readFileSync(dataPath);
  return JSON.parse(data).users;
};

const writeUsers = (users) => {
  fs.writeFileSync(dataPath, JSON.stringify({ users }, null, 2));
};

// In-memory session storage
const sessions = {};

router.post("/signup", (req, res) => {
  const { email, username, password, gender } = req.body;
  const users = readUsers();

  if (!email || !username || !password || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingUser = users.find(
    (user) => user.email === email || user.username === username
  );
  if (existingUser) {
    return res
      .status(409)
      .json({ message: "User with this email or username already exists" });
  }

  const newUser = {
    id: uuidv4(),
    email,
    username,
    password, // In a real app, you MUST hash passwords
    gender,
    isPremium: false,
  };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json({ message: "User created successfully" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = uuidv4();
  sessions[token] = user.id;

  res.cookie("token", token, { httpOnly: true, sameSite: "strict" });
  res.json({ message: "Logged in successfully", user });
});

router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token || !sessions[token]) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userId = sessions[token];
  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    // This case might happen if user was deleted but session exists
    delete sessions[token];
    res.clearCookie("token");
    return res.status(401).json({ message: "User not found" });
  }

  res.json(user);
});

router.post("/logout", (req, res) => {
  const token = req.cookies.token;
  if (token && sessions[token]) {
    delete sessions[token];
  }
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;