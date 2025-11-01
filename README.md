# EchoChat - Video Chat Application

A modern video chat application with authentication, premium subscriptions, and gender-based filtering features.

## Features

- 🔐 User Authentication (Login/Signup)
- 💎 Premium Subscription Plans (Monthly/Yearly)
- 🎯 Gender Filtering (Premium feature: Male/Female/Other)
- 🎨 Multiple Theme Options
- 📹 Video Chat Functionality
- 💬 Text Chat Support

## Project Setup

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd echo-connect-60-main
```

2. Install frontend dependencies:
```sh
npm install
```

3. Install backend dependencies:
```sh
cd server
npm install
cd ..
```

### Running the Application

You need to run both the frontend and backend servers:

**Option 1: Run them separately (recommended for development)**

Terminal 1 - Start backend:
```sh
cd server
npm run dev
```

Terminal 2 - Start frontend:
```sh
npm run dev
```

**Option 2: Use concurrently (if installed)**
```sh
npm run dev:all
```

The frontend will run on `http://localhost:8080` (or the next available port)
The backend will run on `http://localhost:3001`

### Project Structure

- `/src` - Frontend React application
- `/server` - Backend Express.js server
- `/server/data.json` - Temporary data storage (created automatically)

## Backend API

See [server/README.md](server/README.md) for detailed API documentation.

### Quick API Reference

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth token)
- `POST /api/auth/logout` - Logout
- `POST /api/auth/upgrade` - Upgrade to premium
- `GET /api/premium/plans` - Get premium plans

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/edc31306-6e81-4391-83fe-0cfeaa7bee5c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/edc31306-6e81-4391-83fe-0cfeaa7bee5c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
