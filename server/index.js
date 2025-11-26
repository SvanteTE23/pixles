const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100 MB to handle large canvas state
  cors: {
    origin: "*", // Allow all origins for simplicity in this demo
    methods: ["GET", "POST"]
  }
});

// Canvas configuration
const CANVAS_SIZE = 1000; // 1000x1000 grid
// Initialize canvas with white pixels (#FFFFFF)
// We can use a simple 2D array or a map. A flat array is also fine.
// Let's use a 2D array of strings (hex codes).
let canvas = Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill('#FFFFFF'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send the current canvas state to the new user
  socket.emit('initial_state', canvas);

  // Handle pixel updates
  socket.on('place_pixel', ({ x, y, color }) => {
    // Validate coordinates
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      // Update server state
      canvas[y][x] = color;
      
      // Broadcast the update to ALL clients (including sender)
      io.emit('pixel_update', { x, y, color });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
