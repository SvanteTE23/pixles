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
// Initialize canvas with null (transparent/empty)
let canvas = Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(null));

// Store connected users and their cursors
const users = new Map();

// Generate a random color for each user
const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFE66D', '#FF9F43', '#9B59B6', '#FF9FF3', '#2ECC71', '#3498DB', '#E74C3C'];
  return colors[Math.floor(Math.random() * colors.length)];
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Create user with random color
  const userColor = getRandomColor();
  users.set(socket.id, { x: 0, y: 0, color: userColor });

  // Send the current canvas state to the new user
  socket.emit('initial_state', canvas);
  
  // Send current users to the new user
  socket.emit('users_update', Object.fromEntries(users));
  
  // Notify others about new user
  socket.broadcast.emit('user_joined', { id: socket.id, color: userColor });

  // Handle cursor movement
  socket.on('cursor_move', ({ x, y, name }) => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      user.x = x;
      user.y = y;
      if (name !== undefined) user.name = name;
      socket.broadcast.emit('cursor_update', { id: socket.id, x, y, color: user.color, name: user.name });
    }
  });

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
    users.delete(socket.id);
    io.emit('user_left', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
