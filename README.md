# Pixles - r/place Clone

A full-featured r/place clone with pixel shop, power-ups, and Stripe payments.

## Features
- 🎨 Real-time pixel canvas with WebSocket sync
- 🛒 Shop with pixel packages, power-ups, tools & cosmetics
- 💳 Stripe payment integration
- 👤 User accounts with login/register
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

### 3. Set up Stripe (required for payments)
Create the file `server/.env` with your Stripe secret key:
```
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
```
> 📧 Ask Elias for the test API key!

### 4. Start the app
```bash
# Terminal 1 - Start server
npm run start:server

# Terminal 2 - Start client  
npm run start:client
```

### 5. Open in browser
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

## Development Notes
- Canvas size: 50x50 pixels
- Currency: SEK (Swedish Kronor)
- Test card for Stripe: `4242 4242 4242 4242`
