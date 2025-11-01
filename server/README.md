# EchoChat Backend Server

A simple Express.js backend server for authentication and premium subscription management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new account
  - Body: `{ username, email, password }`
  - Returns: `{ token, user }`

- `POST /api/auth/login` - Login with credentials
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- `GET /api/auth/me` - Get current user (requires auth token)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

- `POST /api/auth/logout` - Logout (requires auth token)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ message }`

### Premium
- `POST /api/auth/upgrade` - Upgrade to premium (requires auth token)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ plan: "monthly" | "yearly" }`
  - Returns: `{ user }`

- `GET /api/premium/plans` - Get premium plans
  - Returns: `{ plans: [...] }`

## Data Storage

User data and sessions are stored in `data.json` in the server directory. This is temporary storage for development purposes.

**Note:** In production, use a proper database and hash passwords!

