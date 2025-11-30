# Pixles - r/place Clone

A full-featured r/place clone with pixel shop, power-ups, and Stripe payments.

## Features
- 🎨 Real-time pixel canvas with WebSocket sync
- 🛒 Shop with pixel packages, power-ups, tools & cosmetics
- 💳 Stripe payment integration
- 👤 Firebase Authentication (email/password)
- 🌙 Dark mode support
- 💾 Persistent data storage

## Project Structure
- `client/` - React frontend (Vite)
- `server/` - Node.js backend (Express + Socket.io)

---

## 🚀 Quick Start (for new developers)

### 1. Install Node.js
Make sure you have [Node.js](https://nodejs.org/) installed (v18+).

### 2. Clone and install dependencies
```bash
git clone https://github.com/SvanteTE23/pixles.git
cd pixles
npm run install:all
```

### 3. Set up Firebase

#### Client Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or select existing)
3. Go to **Project Settings > General > Your apps**
4. Click "Add app" and select Web
5. Copy the Firebase config object
6. Update `client/src/firebase.js` with your config:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### Server Setup
1. In Firebase Console, go to **Project Settings > Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file as `server/firebase-service-account.json`

> ⚠️ Never commit `firebase-service-account.json` to version control!

### 4. Set up environment variables
Create the file `server/.env` with:
```
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
ADMIN_PASSWORD=your_admin_password_here
```
> 📧 Ask Elias for the test API key and admin password!

### 5. Start the app
```bash
# Terminal 1 - Start server
npm run start:server

# Terminal 2 - Start client  
npm run start:client
```

### 6. Open in browser
- **Local:** http://localhost:5173
- **Network:** Check terminal output for network URL

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install all dependencies |
| `npm run start:server` | Start backend (port 3001) |
| `npm run start:client` | Start frontend (port 5173) |

---

## 🔑 Environment Variables

The server requires a `.env` file in the `server/` folder:

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
```

> ⚠️ This file is NOT pushed to GitHub for security reasons.

---

## 🔐 Authentication

This project uses **Firebase Authentication** for user login/registration:
- Email/password authentication
- Secure token verification on the server
- Password reset via Firebase

### Required Files (not in repo)
- `client/src/firebase.js` - Must have your Firebase config
- `server/firebase-service-account.json` - Firebase Admin SDK credentials

---

## Development Notes
- Canvas size: 50x50 pixels
- Currency: SEK (Swedish Kronor)
- Test card for Stripe: `4242 4242 4242 4242`
