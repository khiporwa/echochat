import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import http from 'http';
import { v4 as uuidv4 } from 'uuid'; // Requires npm install uuid

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = 3001;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Matchmaking Pool and Statuses
let waitingPool = [];
const userStatus = new Map();
const userSocketMap = new Map();

// --- Helper Functions ---

const DATA_FILE = join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], sessions: {} }, null, 2));
}

const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], sessions: {} };
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// --- Matchmaking Logic ---

const findMatch = (userId, socketId) => {
  if (!waitingPool.includes(userId)) {
    waitingPool.push(userId);
    userStatus.set(userId, 'WAITING');
    userSocketMap.set(userId, socketId);
  }

  if (waitingPool.length >= 2) {
    const matchedId1 = waitingPool.shift();
    const matchedId2 = waitingPool.shift();

    if (matchedId1 && matchedId2) {
      userStatus.set(matchedId1, 'BUSY');
      userStatus.set(matchedId2, 'BUSY');

      const data = readData();
      const user1 = data.users.find(u => u.id === matchedId1);
      const user2 = data.users.find(u => u.id === matchedId2);

      io.to(userSocketMap.get(matchedId1)).emit('matched', { opponentId: matchedId2, opponentUsername: user2?.username || 'Stranger' });
      io.to(userSocketMap.get(matchedId2)).emit('matched', { opponentId: matchedId1, opponentUsername: user1?.username || 'Stranger' });

      console.log(`Matched ${matchedId1} and ${matchedId2}`);
      return true;
    }
  }
  
  io.to(socketId).emit('waiting');
  return false;
};

// --- Socket.io Connection Handler ---

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // FIX APPLIED: Changed TypeScript assertion to standard JavaScript casting
  const userId = String(socket.handshake.query.userId); 
  if (userId && userId !== 'undefined') {
      userSocketMap.set(userId, socket.id);
  }

  socket.on('requestMatch', (currentUserId) => {
    if (userStatus.get(currentUserId) !== 'BUSY') {
      userSocketMap.set(currentUserId, socket.id);
      findMatch(currentUserId, socket.id);
    } else {
      socket.emit('busy', { message: 'Already in a call.' });
    }
  });

  socket.on('nextMatch', (currentUserId) => {
    console.log(`${currentUserId} clicked next`);

    waitingPool = waitingPool.filter(id => id !== currentUserId);
    userStatus.delete(currentUserId);

    userStatus.set(currentUserId, 'WAITING');
    userSocketMap.set(currentUserId, socket.id);
    findMatch(currentUserId, socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    let userIdToRemove = null;
    for (const [uid, sid] of userSocketMap.entries()) {
      if (sid === socket.id) {
        userIdToRemove = uid;
        break;
      }
    }
    
    if (userIdToRemove) {
      waitingPool = waitingPool.filter(id => id !== userIdToRemove);
      userStatus.delete(userIdToRemove);
      userSocketMap.delete(userIdToRemove);
    }
  });
});

// --- Express REST API Middleware and Routes ---

// FIX APPLIED: Set explicit CORS options for robustness across all origins
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = readData();
  const userId = data.sessions[token];
  
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = data.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // @ts-ignore
  req.user = user;
  // @ts-ignore
  req.token = token;
  next();
};

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const data = readData();

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (data.users.some(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    if (data.users.some(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already taken' });
    }

    const newUser = {
      id: uuidv4(),
      username,
      email,
      password,
      isPremium: false,
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    
    const token = generateToken();
    data.sessions[token] = newUser.id;

    writeData(data);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = readData();

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = data.users.find(u => u.email === email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    data.sessions[token] = user.id;

    writeData(data);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user details
app.get('/api/auth/me', authenticate, (req, res) => {
  // @ts-ignore
  const { password, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  const data = readData();
  // @ts-ignore
  delete data.sessions[req.token];
  writeData(data);
  res.status(204).send();
});

// Upgrade to Premium
app.post('/api/user/upgrade', authenticate, (req, res) => {
    // @ts-ignore
    const userId = req.user.id;
    const data = readData();
    const user = data.users.find(u => u.id === userId);

    if (user) {
        user.isPremium = true;
        user.premiumPlan = req.body.plan || "monthly";
        user.premiumSince = new Date().toISOString();
        writeData(data);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// Get premium plans (dummy data)
app.get('/api/premium/plans', (req, res) => {
    res.json([
        { id: '1', name: 'Monthly', price: 9.99, duration: '1 month' },
        { id: '2', name: 'Yearly', price: 99.99, duration: '1 year' },
    ]);
});


httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});