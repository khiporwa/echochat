import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage (temporary - using JSON file)
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

// Helper functions
const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Auth middleware
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

  req.user = user;
  req.token = token;
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const data = readData();

    // Check if user already exists
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    if (data.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user
    const newUser = {
      id: generateToken(),
      username,
      email,
      password, // In production, hash this!
      isPremium: false,
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);

    // Create session
    const token = generateToken();
    data.sessions[token] = newUser.id;

    writeData(data);

    res.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isPremium: newUser.isPremium,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const data = readData();
    const user = data.users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create or update session
    const token = generateToken();
    data.sessions[token] = user.id;

    writeData(data);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      isPremium: req.user.isPremium,
    },
  });
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  const data = readData();
  delete data.sessions[req.token];
  writeData(data);
  res.json({ message: 'Logged out successfully' });
});

// Upgrade to premium
app.post('/api/auth/upgrade', authenticate, (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'yearly'

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be monthly or yearly' });
    }

    const data = readData();
    const user = data.users.find(u => u.id === req.user.id);
    
    if (user) {
      user.isPremium = true;
      user.premiumPlan = plan;
      user.premiumSince = new Date().toISOString();
      writeData(data);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isPremium: user.isPremium,
          premiumPlan: user.premiumPlan,
        },
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get premium plans
app.get('/api/premium/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'monthly',
        name: 'Monthly Premium',
        price: 9.99,
        currency: 'USD',
        features: [
          'Filter matches by gender',
          'Skip unlimited times',
          'Priority matching',
          'Ad-free experience',
        ],
      },
      {
        id: 'yearly',
        name: 'Yearly Premium',
        price: 79.99,
        currency: 'USD',
        savings: 20,
        features: [
          'Filter matches by gender',
          'Skip unlimited times',
          'Priority matching',
          'Ad-free experience',
          'Save 20% vs monthly',
        ],
      },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

