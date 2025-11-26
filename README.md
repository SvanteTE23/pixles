# r/place Clone

A simple clone of r/place built with React (Vite) and Node.js (Express + Socket.io).

## Features
- Real-time pixel updates using WebSockets.
- 50x50 grid canvas.
- Color picker to select pixel color.
- Modern UI.

## Project Structure
- `client/`: React frontend.
- `server/`: Node.js backend.

## Getting Started

### Prerequisites
- Node.js installed.

### Installation
1. Install dependencies for both client and server:
   ```bash
   npm run install:all
   ```
   (Or run `npm install` in both `client` and `server` directories manually)

### Running the App
1. Start the server:
   ```bash
   npm run start:server
   ```
   The server will run on `http://localhost:3001`.

2. Start the client:
   ```bash
   npm run start:client
   ```
   The client will run on `http://localhost:5173` (usually).

3. Open your browser and navigate to the client URL. Open multiple tabs to see real-time updates!

## Development
- The canvas size is set to 50x50 in both `server/index.js` and `client/src/App.jsx`. If you change it, make sure to update both.
