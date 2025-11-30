const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Load environment variables from .env file
require('dotenv').config();

// ============ FIREBASE ADMIN SETUP ============
// Initialize Firebase Admin - you need to provide service account credentials
// Option 1: Set GOOGLE_APPLICATION_CREDENTIALS environment variable to path of service account JSON
// Option 2: Put the service account JSON in server/firebase-service-account.json
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized with service account');
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log('✅ Firebase Admin initialized with application default credentials');
} else {
  console.error('⚠️  WARNING: Firebase service account not found!');
  console.error('   Create a firebase-service-account.json file in the server folder');
  console.error('   Get it from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
  // Initialize without credentials - will fail on auth verification
  admin.initializeApp();
}

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const app = express();

// Stripe setup - requires STRIPE_SECRET_KEY in .env file
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️  WARNING: STRIPE_SECRET_KEY not found in environment variables!');
  console.error('   Create a .env file in the server folder with:');
  console.error('   STRIPE_SECRET_KEY=sk_test_your_key_here');
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// ============ DATA PERSISTENCE ============
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const CANVAS_FILE = path.join(DATA_DIR, 'canvas.json');
const EFFECTS_FILE = path.join(DATA_DIR, 'effects.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Password hashing
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Load data from files
const loadData = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      Object.entries(data).forEach(([key, value]) => userPixels.set(key, value));
      console.log(`Loaded ${userPixels.size} users from disk`);
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
  
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
      Object.entries(data).forEach(([key, value]) => accounts.set(key, value));
      console.log(`Loaded ${accounts.size} accounts from disk`);
    }
  } catch (err) {
    console.error('Error loading accounts:', err);
  }
};

// Save users to file (debounced)
let saveTimeout = null;
const saveUsers = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const data = Object.fromEntries(userPixels);
      fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
      console.log(`Saved ${userPixels.size} users to disk`);
    } catch (err) {
      console.error('Error saving users:', err);
    }
  }, 1000); // Save 1 second after last change
};

// Save accounts to file
const saveAccounts = () => {
  try {
    const data = Object.fromEntries(accounts);
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved ${accounts.size} accounts to disk`);
  } catch (err) {
    console.error('Error saving accounts:', err);
  }
};

// Save canvas (less frequently - every 30 seconds if changed)
let canvasChanged = false;
const saveCanvas = () => {
  if (!canvasChanged) return;
  try {
    // Compress canvas: only store non-null pixels
    const sparseCanvas = {};
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        if (canvas[y][x] !== null) {
          sparseCanvas[`${x},${y}`] = canvas[y][x];
        }
      }
    }
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(sparseCanvas));
    fs.writeFileSync(EFFECTS_FILE, JSON.stringify(Object.fromEntries(pixelEffects)));
    canvasChanged = false;
    console.log(`Canvas saved (${Object.keys(sparseCanvas).length} pixels)`);
  } catch (err) {
    console.error('Error saving canvas:', err);
  }
};

const loadCanvas = () => {
  try {
    if (fs.existsSync(CANVAS_FILE)) {
      const sparseCanvas = JSON.parse(fs.readFileSync(CANVAS_FILE, 'utf8'));
      Object.entries(sparseCanvas).forEach(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
          canvas[y][x] = color;
        }
      });
      console.log(`Loaded canvas from disk (${Object.keys(sparseCanvas).length} pixels)`);
    }
    if (fs.existsSync(EFFECTS_FILE)) {
      const effects = JSON.parse(fs.readFileSync(EFFECTS_FILE, 'utf8'));
      Object.entries(effects).forEach(([key, value]) => pixelEffects.set(key, value));
    }
  } catch (err) {
    console.error('Error loading canvas:', err);
  }
};

// Auto-save canvas every 30 seconds
setInterval(saveCanvas, 30000);

// ============ DATABASE (File-backed) ============
const userPixels = new Map(); // visitorId -> user data
const accounts = new Map(); // email -> { passwordHash, visitorId, displayName, createdAt }

// ============ PRODUCT CATALOG ============
const PRODUCTS = {
  // Pixel Packages
  pixels_10: { type: 'pixels', amount: 10, price: 500, name: '10 Pixels' },
  pixels_50: { type: 'pixels', amount: 50, price: 2000, name: '50 Pixels', badge: 'Save 20%' },
  pixels_150: { type: 'pixels', amount: 150, price: 4500, name: '150 Pixels', badge: 'Popular!' },
  pixels_500: { type: 'pixels', amount: 500, price: 12500, name: '500 Pixels', badge: 'Best Value!' },
  pixels_1000: { type: 'pixels', amount: 1000, price: 20000, name: '1000 Pixels', badge: '🔥 MEGA!' },
  
  // Power-ups
  bomb_5x5: { type: 'powerup', powerup: 'bomb', size: 5, price: 2500, name: 'Pixel Bomb 5×5', desc: 'Fill a 5×5 area instantly!' },
  bomb_10x10: { type: 'powerup', powerup: 'bomb', size: 10, price: 5000, name: 'Pixel Bomb 10×10', desc: 'Fill a 10×10 area instantly!' },
  canvas_wipe: { type: 'powerup', powerup: 'wipe', price: 50000, name: '🧹 Canvas Wipe', desc: 'Clear the ENTIRE canvas!' },
  
  // Tools (one-time unlock)
  tool_line: { type: 'tool', tool: 'line', price: 2000, name: '📏 Line Tool', desc: 'Draw straight lines easily' },
  tool_rect: { type: 'tool', tool: 'rectangle', price: 2500, name: '⬜ Rectangle Tool', desc: 'Draw rectangles and squares' },
  tool_circle: { type: 'tool', tool: 'circle', price: 3000, name: '⭕ Circle Tool', desc: 'Draw circles of any size' },
  tool_brush: { type: 'tool', tool: 'brush', price: 1500, name: '🖌️ Brush 3×3', desc: 'Paint 3×3 pixels at once' },
  
  // Cosmetics
  glow_effect: { type: 'cosmetic', cosmetic: 'glow', price: 2000, name: '✨ Glow Effect', desc: 'Your pixels glow and stand out' },
  vip_badge: { type: 'cosmetic', cosmetic: 'vip', price: 5000, name: '👑 VIP Badge', desc: 'Show off your VIP status' },
  custom_cursor: { type: 'cosmetic', cosmetic: 'customCursor', price: 1500, name: '🎯 Custom Cursor', desc: 'Choose your own cursor color' },
};

// ============ CANVAS ============
const CANVAS_SIZE = 1000;
let canvas = Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(null));
let pixelEffects = new Map(); // "x,y" -> { rainbow, glow, owner }

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8,
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const users = new Map();

const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFE66D', '#FF9F43', '#9B59B6', '#FF9FF3', '#2ECC71', '#3498DB', '#E74C3C'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getOrCreateUser = (visitorId) => {
  if (!userPixels.has(visitorId)) {
    userPixels.set(visitorId, {
      pixels: 0,
      bombs: { 5: 0, 10: 0 },
      canvasWipes: 0,
      tools: [],
      cosmetics: [],
      cursorColor: null,
      purchases: [],
      createdAt: new Date().toISOString()
    });
    saveUsers(); // Save when new user created
  }
  return userPixels.get(visitorId);
};

// Load saved data on startup
loadData();
loadCanvas();

// ============ API ROUTES ============

// Firebase Register - creates server-side account linked to Firebase user
app.post('/api/firebase-register', verifyFirebaseToken, (req, res) => {
  try {
    const { displayName, visitorId } = req.body;
    const { uid, email } = req.firebaseUser;
    
    // Check if Firebase UID already has an account
    let existingAccount = null;
    for (const [key, value] of accounts.entries()) {
      if (value.firebaseUid === uid) {
        existingAccount = value;
        break;
      }
    }
    
    if (existingAccount) {
      return res.status(400).json({ error: 'Account already exists' });
    }
    
    // Create account linked to Firebase
    const account = {
      email: email.toLowerCase(),
      firebaseUid: uid,
      visitorId: visitorId,
      displayName: displayName || '',
      createdAt: new Date().toISOString()
    };
    
    accounts.set(email.toLowerCase(), account);
    
    // Mark user as having an account
    const user = getOrCreateUser(visitorId);
    user.hasAccount = true;
    user.email = email.toLowerCase();
    user.firebaseUid = uid;
    user.displayName = displayName || '';
    
    saveAccounts();
    saveUsers();
    
    console.log(`New Firebase account registered: ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Account created!',
      user: user
    });
  } catch (error) {
    console.error('Firebase registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Firebase Login - authenticates via Firebase token
app.post('/api/firebase-login', verifyFirebaseToken, (req, res) => {
  try {
    const { currentVisitorId } = req.body;
    const { uid, email } = req.firebaseUser;
    
    // Find account by Firebase UID
    let account = null;
    for (const [key, value] of accounts.entries()) {
      if (value.firebaseUid === uid) {
        account = value;
        break;
      }
    }
    
    // If no account found, this is a new Firebase user - auto-create account
    if (!account) {
      // Use the current visitor ID for the new account
      account = {
        email: email.toLowerCase(),
        firebaseUid: uid,
        visitorId: currentVisitorId,
        displayName: '',
        createdAt: new Date().toISOString()
      };
      
      accounts.set(email.toLowerCase(), account);
      
      // Mark user as having an account
      const user = getOrCreateUser(currentVisitorId);
      user.hasAccount = true;
      user.email = email.toLowerCase();
      user.firebaseUid = uid;
      
      saveAccounts();
      saveUsers();
      
      console.log(`Auto-created account for Firebase user: ${email}`);
    }
    
    // Get the user data associated with this account
    const user = getOrCreateUser(account.visitorId);
    
    console.log(`Firebase user logged in: ${email}`);
    
    res.json({ 
      success: true,
      visitorId: account.visitorId,
      displayName: account.displayName,
      user: user
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Legacy routes - kept for backward compatibility but will fail without password hash
// These can be removed once all users migrate to Firebase

// Register new account (LEGACY - use /api/firebase-register instead)
app.post('/api/register', (req, res) => {
  res.status(410).json({ error: 'Please use Firebase authentication. This endpoint is deprecated.' });
});

// Login (LEGACY - use /api/firebase-login instead)
app.post('/api/login', (req, res) => {
  res.status(410).json({ error: 'Please use Firebase authentication. This endpoint is deprecated.' });
});

// Change password (LEGACY - password changes are now handled by Firebase)
app.post('/api/change-password', (req, res) => {
  res.status(410).json({ error: 'Please use Firebase authentication to change your password.' });
});

// Check if user has account
app.get('/api/has-account/:visitorId', (req, res) => {
  const user = userPixels.get(req.params.visitorId);
  res.json({ hasAccount: user?.hasAccount || false, email: user?.email || null });
});

// Get user data
app.get('/api/user/:visitorId', (req, res) => {
  const user = getOrCreateUser(req.params.visitorId);
  res.json(user);
});

// Get products
app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productId, visitorId } = req.body;
    
    if (!PRODUCTS[productId]) {
      return res.status(400).json({ error: 'Invalid product' });
    }
    
    const product = PRODUCTS[productId];
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: product.name,
            description: product.desc || `Purchase for Pixles canvas`,
          },
          unit_amount: product.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:5173'}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}?payment=cancelled`,
      metadata: { visitorId, productId },
    });
    
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { sessionId, visitorId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }
    
    if (session.metadata.visitorId !== visitorId) {
      return res.status(403).json({ error: 'Visitor ID mismatch' });
    }
    
    const user = getOrCreateUser(visitorId);
    
    if (user.purchases.includes(sessionId)) {
      return res.json({ success: true, user, alreadyProcessed: true });
    }
    
    const productId = session.metadata.productId;
    const product = PRODUCTS[productId];
    
    // Apply product to user
    switch (product.type) {
      case 'pixels':
        user.pixels += product.amount;
        break;
      case 'powerup':
        if (product.powerup === 'bomb') {
          user.bombs[product.size] = (user.bombs[product.size] || 0) + 1;
        } else if (product.powerup === 'wipe') {
          user.canvasWipes += 1;
        }
        break;
      case 'tool':
        if (!user.tools.includes(product.tool)) {
          user.tools.push(product.tool);
        }
        break;
      case 'cosmetic':
        if (!user.cosmetics.includes(product.cosmetic)) {
          user.cosmetics.push(product.cosmetic);
        }
        break;
    }
    
    user.purchases.push(sessionId);
    saveUsers(); // Persist the purchase!
    console.log(`User ${visitorId} purchased: ${product.name}`);
    
    res.json({ success: true, user, product: product.name, productType: product.type });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Use pixels
app.post('/api/use-pixels', (req, res) => {
  const { visitorId, amount } = req.body;
  const user = getOrCreateUser(visitorId);
  
  if (user.pixels >= amount) {
    user.pixels -= amount;
    saveUsers();
    res.json({ success: true, pixels: user.pixels });
  } else {
    res.status(400).json({ error: 'Not enough pixels' });
  }
});

// Use bomb
app.post('/api/use-bomb', (req, res) => {
  const { visitorId, size } = req.body;
  const user = getOrCreateUser(visitorId);
  
  if (user.bombs[size] > 0) {
    user.bombs[size]--;
    saveUsers();
    res.json({ success: true, bombs: user.bombs });
  } else {
    res.status(400).json({ error: 'No bombs available' });
  }
});

// Canvas wipe
app.post('/api/canvas-wipe', (req, res) => {
  const { visitorId } = req.body;
  const user = getOrCreateUser(visitorId);
  
  if (user.canvasWipes > 0) {
    user.canvasWipes--;
    saveUsers();
    canvas = Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(null));
    pixelEffects.clear();
    canvasChanged = true;
    saveCanvas(); // Save immediately on wipe
    io.emit('canvas_wiped');
    console.log(`Canvas wiped by ${visitorId}!`);
    res.json({ success: true, canvasWipes: user.canvasWipes });
  } else {
    res.status(400).json({ error: 'No canvas wipes available' });
  }
});

// Set cursor color
app.post('/api/set-cursor-color', (req, res) => {
  const { visitorId, color } = req.body;
  const user = getOrCreateUser(visitorId);
  
  if (user.cosmetics.includes('customCursor')) {
    user.cursorColor = color;
    saveUsers();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Custom cursor not unlocked' });
  }
});

// Admin password - stored on server only
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cb!!!!(/&)/(hflöq0=uw3HkjhSJKD';

// Admin: Verify password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Admin: Toggle cosmetic (for testing)
app.post('/api/admin/toggle-cosmetic', (req, res) => {
  const { visitorId, cosmetic, adminPassword } = req.body;
  
  // Verify admin password
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = getOrCreateUser(visitorId);
  const cosmeticIndex = user.cosmetics.indexOf(cosmetic);
  
  if (cosmeticIndex === -1) {
    // Add cosmetic
    user.cosmetics.push(cosmetic);
    saveUsers();
    res.json({ success: true, action: 'added', cosmetics: user.cosmetics });
  } else {
    // Remove cosmetic
    user.cosmetics.splice(cosmeticIndex, 1);
    saveUsers();
    res.json({ success: true, action: 'removed', cosmetics: user.cosmetics });
  }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  const userColor = getRandomColor();
  users.set(socket.id, { x: 0, y: 0, color: userColor, visitorId: null, cosmetics: [] });

  socket.emit('initial_state', { 
    canvas, 
    pixelEffects: Object.fromEntries(pixelEffects) 
  });
  socket.emit('users_update', Object.fromEntries(users));
  socket.broadcast.emit('user_joined', { id: socket.id, color: userColor });

  // Set visitor ID for socket
  socket.on('set_visitor', ({ visitorId }) => {
    const user = users.get(socket.id);
    if (user) {
      user.visitorId = visitorId;
      const userData = getOrCreateUser(visitorId);
      user.cosmetics = userData.cosmetics;
      user.cursorColor = userData.cursorColor;
    }
  });

  socket.on('cursor_move', ({ x, y, name, cosmetics, cursorColor }) => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      user.x = x;
      user.y = y;
      if (name !== undefined) user.name = name;
      if (cosmetics) user.cosmetics = cosmetics;
      if (cursorColor) user.cursorColor = cursorColor;
      socket.broadcast.emit('cursor_update', { 
        id: socket.id, x, y, 
        color: user.color, 
        cursorColor: user.cursorColor,
        name: user.name,
        cosmetics: user.cosmetics
      });
    }
  });

  socket.on('place_pixel', ({ x, y, color, effects }) => {
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      canvas[y][x] = color;
      canvasChanged = true;
      
      // Handle effects
      if (effects) {
        const key = `${x},${y}`;
        pixelEffects.set(key, effects);
      }
      
      io.emit('pixel_update', { x, y, color, effects });
    }
  });

  // Place multiple pixels (for bombs and tools)
  socket.on('place_pixels', ({ pixels, color, effects }) => {
    const placedPixels = [];
    
    for (const { x, y } of pixels) {
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        canvas[y][x] = color;
        
        if (effects) {
          const key = `${x},${y}`;
          pixelEffects.set(key, effects);
        }
        
        placedPixels.push({ x, y });
      }
    }
    
    if (placedPixels.length > 0) {
      canvasChanged = true;
      io.emit('pixels_update', { pixels: placedPixels, color, effects });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    users.delete(socket.id);
    io.emit('user_left', socket.id);
  });
});

const PORT = process.env.PORT || 8420;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Products available: ${Object.keys(PRODUCTS).length}`);
  console.log(`Users loaded: ${userPixels.size}`);
});

// Graceful shutdown - save data before exit
const gracefulShutdown = () => {
  console.log('\nShutting down gracefully...');
  
  // Save all data immediately
  try {
    const userData = Object.fromEntries(userPixels);
    fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));
    console.log(`Saved ${userPixels.size} users`);
  } catch (err) {
    console.error('Error saving users on shutdown:', err);
  }
  
  // Force save canvas
  canvasChanged = true;
  saveCanvas();
  
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
