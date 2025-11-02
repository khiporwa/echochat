const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const dataPath = path.join(__dirname, "../data.json");

const readData = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ users: [] }, null, 2));
  }
  const fileContent = fs.readFileSync(dataPath);
  try {
    return JSON.parse(fileContent.toString());
  } catch (error) {
    return { users: [] }; // Return a default structure if the file is empty or corrupt
  }
};

const writeData = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

router.post("/signup", (req, res) => {
  const { email, username, password, gender } = req.body;
  const data = readData();
  const users = data.users || [];

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
    sessions: [],
  };

  users.push(newUser);
  writeData({ ...data, users: users });

  res.status(201).json({ message: "User created successfully" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  const users = data.users || [];

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = uuidv4();
  if (!user.sessions) {
    user.sessions = [];
  }
  user.sessions.push(token);
  writeData(data);

  res.cookie("token", token, { httpOnly: true, sameSite: "strict" });
  res.json({ message: "Logged in successfully", user });
});

router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const data = readData();
  const users = data.users || [];
  const user = users.find((u) => u.sessions?.includes(token));

  if (!user) {
    res.clearCookie("token");
    return res.status(401).json({ message: "User not found" });
  }

  res.json(user);
});

router.post("/logout", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    const data = readData();
    const users = data.users || [];
    const user = users.find((u) => u.sessions?.includes(token));
    if (user && user.sessions) {
      user.sessions = user.sessions.filter((s) => s !== token);
      writeData(data);
    }
  }
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;