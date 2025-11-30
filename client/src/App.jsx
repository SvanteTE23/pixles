import { useEffect, useRef, useState, useMemo } from 'react';
import io from 'socket.io-client';
import './App.css';
import { PixelIcon } from './PixelIcons';

const CANVAS_SIZE = 1000; // Must match server
const PIXEL_SIZE = 4; // Size of each pixel in visual px
const SERVER_URL = `http://${window.location.hostname}:3001`;
const MAX_PIXELS = 10;
const REFILL_TIME = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
  ('ontouchstart' in window && window.innerWidth <= 768);

// Generate or retrieve visitor ID
const getVisitorId = () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('visitorId', visitorId);
  }
  return visitorId;
};

// Check if logged in
const getLoggedInVisitorId = () => {
  return localStorage.getItem('loggedInVisitorId');
};

// Get effective visitor ID (logged in or guest)
const getEffectiveVisitorId = () => {
  return getLoggedInVisitorId() || getVisitorId();
};

const INITIAL_PRESETS = [
  '#2D2D2D', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FFE66D', '#FF9F43', '#9B59B6', '#FF9FF3', '#95A5A6',
  '#D35400', '#2ECC71', '#3498DB',
];

// Tool types
const TOOLS = {
  PIXEL: 'pixel',
  BRUSH: 'brush',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  BOMB_5: 'bomb_5',
  BOMB_10: 'bomb_10',
};

function App() {
  const [selectedColor, setSelectedColor] = useState(INITIAL_PRESETS[0]);
  const [palette, setPalette] = useState(INITIAL_PRESETS);
  const [activePaletteIndex, setActivePaletteIndex] = useState(0);
  
  // Render state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Animation refs
  const targetTransform = useRef({ zoom: 1, x: 0, y: 0 });
  const currentTransform = useRef({ zoom: 1, x: 0, y: 0 });
  
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [animatingPixels, setAnimatingPixels] = useState([]);
  const [otherCursors, setOtherCursors] = useState({});
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [verifiedAdminPassword, setVerifiedAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [adminPixelInput, setAdminPixelInput] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  
  // Icon color based on theme
  const iconColor = darkMode ? '#eeeeee' : '#333333';
  
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('displayName') || '';
  });
  const [displayNameInput, setDisplayNameInput] = useState(() => {
    return localStorage.getItem('displayName') || '';
  });
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('loggedInVisitorId');
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [requireAuthForPurchase, setRequireAuthForPurchase] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  
  // User data from server
  const [userData, setUserData] = useState({
    pixels: 0,
    bombs: { 5: 0, 10: 0 },
    canvasWipes: 0,
    tools: [],
    cosmetics: [],
    cursorColor: null,
  });
  
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState('pixels'); // pixels, powerups, tools, cosmetics
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [showPurchasedIndicator, setShowPurchasedIndicator] = useState(false);
  const [lastPurchasedItem, setLastPurchasedItem] = useState(null);
  
  // Tools & Power-ups state
  const [activeTool, setActiveTool] = useState(TOOLS.PIXEL);
  const [showTools, setShowTools] = useState(false);
  const [useProtectedPixel, setUseProtectedPixel] = useState(false);
  const [drawStart, setDrawStart] = useState(null); // For line/rect/circle tools
  const [previewPixels, setPreviewPixels] = useState([]); // Preview for tools
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [useGlow, setUseGlow] = useState(true); // Toggle for glow effect
  
  // Cosmetics state
  const [cursorColorPicker, setCursorColorPicker] = useState('#FF0000');
  
  // Info menu state
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [infoPage, setInfoPage] = useState(null); // 'howto', 'rules', 'about', 'stats'
  
  const visitorId = useRef(getEffectiveVisitorId());
  const [pixelsRemaining, setPixelsRemaining] = useState(() => {
    const saved = localStorage.getItem('pixelsRemaining');
    const refillTime = localStorage.getItem('refillTime');
    if (saved !== null && refillTime) {
      const timeLeft = parseInt(refillTime) - Date.now();
      if (timeLeft <= 0) return MAX_PIXELS;
      return parseInt(saved);
    }
    return MAX_PIXELS;
  });
  const [timeUntilRefill, setTimeUntilRefill] = useState(() => {
    const refillTime = localStorage.getItem('refillTime');
    if (refillTime) {
      const timeLeft = parseInt(refillTime) - Date.now();
      return timeLeft > 0 ? timeLeft : 0;
    }
    return 0;
  });

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isDrawing = useRef(false);
  
  // Cursor throttle ref (for performance)
  const lastCursorEmit = useRef(0);
  const CURSOR_THROTTLE = isMobile ? 100 : 50; // ms between cursor updates
  
  // Touch handling refs
  const touchState = useRef({
    lastDist: 0,
    lastCenter: null,
    isPinching: false,
    isDragging: false,
    wasPinching: false,
    hasMoved: false,
    startTouchPos: null,
    lastTouchPos: null
  });

  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const containerRef = useRef(null);

  // Timer for pixel refill
  useEffect(() => {
    const interval = setInterval(() => {
      const refillTime = localStorage.getItem('refillTime');
      if (refillTime) {
        const timeLeft = parseInt(refillTime) - Date.now();
        if (timeLeft <= 0) {
          // Refill pixels
          setPixelsRemaining(MAX_PIXELS);
          setTimeUntilRefill(0);
          localStorage.removeItem('refillTime');
          localStorage.setItem('pixelsRemaining', MAX_PIXELS.toString());
        } else {
          setTimeUntilRefill(timeLeft);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save pixels to localStorage when changed
  useEffect(() => {
    localStorage.setItem('pixelsRemaining', pixelsRemaining.toString());
    
    // Start timer only when all pixels are used
    if (pixelsRemaining === 0 && !localStorage.getItem('refillTime')) {
      const refillTime = Date.now() + REFILL_TIME;
      localStorage.setItem('refillTime', refillTime.toString());
      setTimeUntilRefill(REFILL_TIME);
    }
  }, [pixelsRemaining]);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Fetch user data on load
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/user/${visitorId.current}`);
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUserData();
  }, []);

  // Handle payment return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (payment === 'success' && sessionId) {
      const verifyPayment = async () => {
        try {
          const response = await fetch(`${SERVER_URL}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, visitorId: visitorId.current }),
          });
          const data = await response.json();
          if (data.success) {
            setUserData(data.user);
            if (!data.alreadyProcessed) {
              setPaymentMessage(`Payment successful! You received: ${data.product}`);
              setLastPurchasedItem(data.product);
              setShowPurchasedIndicator(true);
            }
          }
        } catch (error) {
          console.error('Failed to verify payment:', error);
        }
      };
      verifyPayment();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Animation Loop - optimized to only run when needed
  useEffect(() => {
    let animationFrameId;
    let isAnimating = false;
    
    const animate = () => {
      const target = targetTransform.current;
      const current = currentTransform.current;
      
      const zoomDiff = target.zoom - current.zoom;
      const xDiff = target.x - current.x;
      const yDiff = target.y - current.y;

      // Only continue animating if there's significant difference
      if (Math.abs(zoomDiff) > 0.0001 || Math.abs(xDiff) > 0.5 || Math.abs(yDiff) > 0.5) {
        const t = 0.25; // Slightly faster lerp
        
        current.zoom += zoomDiff * t;
        current.x += xDiff * t;
        current.y += yDiff * t;

        setZoom(current.zoom);
        setOffset({ x: current.x, y: current.y });
        
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Snap to target and stop animating
        current.zoom = target.zoom;
        current.x = target.x;
        current.y = target.y;
        setZoom(current.zoom);
        setOffset({ x: current.x, y: current.y });
        isAnimating = false;
      }
    };
    
    // Start animation function - call this when transform changes
    const startAnimation = () => {
      if (!isAnimating) {
        isAnimating = true;
        animate();
      }
    };
    
    // Store start function in ref for external access
    window.startCanvasAnimation = startAnimation;
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      delete window.startCanvasAnimation;
    };
  }, []);

  useEffect(() => {
    // Fit to screen on load
    const fitZoom = Math.min(
      window.innerWidth / (CANVAS_SIZE * PIXEL_SIZE),
      window.innerHeight / (CANVAS_SIZE * PIXEL_SIZE)
    ) * 0.9;
    
    const startX = (window.innerWidth - CANVAS_SIZE * PIXEL_SIZE * fitZoom) / 2;
    const startY = (window.innerHeight - CANVAS_SIZE * PIXEL_SIZE * fitZoom) / 2;

    // Initialize both state and refs
    setZoom(fitZoom);
    setOffset({ x: startX, y: startY });
    targetTransform.current = { zoom: fitZoom, x: startX, y: startY };
    currentTransform.current = { zoom: fitZoom, x: startX, y: startY };

    // Connect to server
    socketRef.current = io(SERVER_URL);

    const socket = socketRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set visitor ID on server
    socket.emit('set_visitor', { visitorId: visitorId.current });

    // Handle initial state
    socket.on('initial_state', (data) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Handle both old and new format
      const grid = data.canvas || data;
      grid.forEach((row, y) => {
        row.forEach((color, x) => {
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        });
      });
    });

    // Handle single pixel updates
    socket.on('pixel_update', ({ x, y, color, effects }) => {
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        
        // Draw glow effect
        if (effects?.glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          ctx.shadowBlur = 0;
        }
      } else {
        ctx.clearRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }

      // Trigger animation
      const id = Date.now() + Math.random();
      setAnimatingPixels(prev => [...prev, { x, y, color, id }]);
      setTimeout(() => {
        setAnimatingPixels(prev => prev.filter(p => p.id !== id));
      }, 400);
    });

    // Handle multiple pixel updates (for bombs/tools)
    socket.on('pixels_update', ({ pixels, color }) => {
      pixels.forEach(({ x, y }) => {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      });
    });

    // Handle canvas wipe
    socket.on('canvas_wiped', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPaymentMessage('Canvas has been wiped!');
      setTimeout(() => setPaymentMessage(null), 3000);
    });

    // Handle other users' cursors
    socket.on('users_update', (users) => {
      const others = { ...users };
      delete others[socket.id];
      setOtherCursors(others);
    });

    socket.on('user_joined', ({ id, color, name }) => {
      setOtherCursors(prev => ({ ...prev, [id]: { x: 0, y: 0, color, name } }));
    });

    socket.on('cursor_update', ({ id, x, y, color, name, cosmetics, cursorColor }) => {
      setOtherCursors(prev => ({ ...prev, [id]: { x, y, color, name, cosmetics, cursorColor } }));
    });

    socket.on('user_left', (id) => {
      setOtherCursors(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ============ HELPER FUNCTIONS FOR TOOLS ============
  
  // Get pixels in a line (Bresenham's algorithm)
  const getLinePixels = (x0, y0, x1, y1) => {
    const pixels = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      pixels.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return pixels;
  };
  
  // Get pixels in a rectangle
  const getRectPixels = (x0, y0, x1, y1) => {
    const pixels = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        pixels.push({ x, y });
      }
    }
    return pixels;
  };
  
  // Get pixels in a circle (Midpoint circle algorithm)
  const getCirclePixels = (cx, cy, endX, endY) => {
    const radius = Math.round(Math.sqrt(Math.pow(endX - cx, 2) + Math.pow(endY - cy, 2)));
    const pixels = [];
    
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          pixels.push({ x: cx + x, y: cy + y });
        }
      }
    }
    return pixels;
  };
  
  // Get brush pixels (3x3)
  const getBrushPixels = (cx, cy) => {
    const pixels = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        pixels.push({ x: cx + dx, y: cy + dy });
      }
    }
    return pixels;
  };
  
  // Get bomb pixels (5x5 or 10x10)
  const getBombPixels = (cx, cy, size) => {
    const pixels = [];
    const half = Math.floor(size / 2);
    for (let dx = -half; dx <= half; dx++) {
      for (let dy = -half; dy <= half; dy++) {
        pixels.push({ x: cx + dx, y: cy + dy });
      }
    }
    return pixels;
  };
  
  

  // ============ PIXEL CONSUMPTION ============
  
  const consumePixels = async (count) => {
    // Use free pixels first
    const freeToUse = Math.min(pixelsRemaining, count);
    let remaining = count - freeToUse;
    
    if (freeToUse > 0) {
      setPixelsRemaining(prev => prev - freeToUse);
    }
    
    // Use purchased pixels for the rest
    if (remaining > 0 && userData.pixels >= remaining) {
      try {
        const response = await fetch(`${SERVER_URL}/api/use-pixels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId: visitorId.current, amount: remaining }),
        });
        const data = await response.json();
        if (data.success) {
          setUserData(prev => ({ ...prev, pixels: data.pixels }));
        }
      } catch (error) {
        console.error('Failed to use pixels:', error);
        return false;
      }
    }
    
    return true;
  };

  const placePixel = async (clientX, clientY) => {
    const hasFreePixels = pixelsRemaining > 0;
    const hasPurchasedPixels = userData.pixels > 0;
    
    if (!hasFreePixels && !hasPurchasedPixels) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((clientY - rect.top) * scaleY / PIXEL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      const color = selectedColor;
      const effects = {};
      if (userData.cosmetics.includes('glow') && useGlow) effects.glow = true;
      
      socketRef.current.emit('place_pixel', { 
        x, y, color, 
        effects: Object.keys(effects).length > 0 ? effects : undefined
      });
      
      // Clear messages
      if (paymentMessage) setPaymentMessage(null);
      if (showPurchasedIndicator) setShowPurchasedIndicator(false);
      
      // Consume pixels and protected pixel if used
      if (hasFreePixels) {
        setPixelsRemaining(prev => prev - 1);
      } else if (hasPurchasedPixels) {
        try {
          const response = await fetch(`${SERVER_URL}/api/use-pixels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId: visitorId.current, amount: 1 }),
          });
          const data = await response.json();
          if (data.success) {
            setUserData(prev => ({ ...prev, pixels: data.pixels }));
          }
        } catch (error) {
          console.error('Failed to use purchased pixel:', error);
        }
      }
    }
  };
  
  // Place multiple pixels (for tools)
  const placeMultiplePixels = async (pixels) => {
    const totalCost = pixels.length;
    const totalAvailable = pixelsRemaining + userData.pixels;
    
    if (totalCost > totalAvailable) {
      setPaymentMessage(`Need ${totalCost} pixels, but only have ${totalAvailable}`);
      setTimeout(() => setPaymentMessage(null), 2000);
      return;
    }
    
    const color = selectedColor;
    const effects = {};
    if (userData.cosmetics.includes('glow') && useGlow) effects.glow = true;
    
    // Filter valid pixels
    const validPixels = pixels.filter(p => p.x >= 0 && p.x < CANVAS_SIZE && p.y >= 0 && p.y < CANVAS_SIZE);
    
    socketRef.current.emit('place_pixels', {
      pixels: validPixels,
      color,
      effects: Object.keys(effects).length > 0 ? effects : undefined
    });
    
    await consumePixels(validPixels.length);
    setPreviewPixels([]);
  };
  
  // Use bomb
  const useBomb = async (x, y, size) => {
    if (!userData.bombs[size] || userData.bombs[size] <= 0) {
      setPaymentMessage(`No ${size}×${size} bombs available!`);
      setTimeout(() => setPaymentMessage(null), 2000);
      return;
    }
    
    try {
      const response = await fetch(`${SERVER_URL}/api/use-bomb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId.current, size }),
      });
      const data = await response.json();
      if (data.success) {
        setUserData(prev => ({ ...prev, bombs: data.bombs }));
        
        const color = selectedColor;
        const pixels = getBombPixels(x, y, size);
        
        socketRef.current.emit('place_pixels', {
          pixels,
          color,
          isProtected: false,
          effects: userData.cosmetics.includes('glow') ? { glow: true } : undefined
        });
        
        setPaymentMessage(`BOOM! Placed ${size}×${size} bomb!`);
        setTimeout(() => setPaymentMessage(null), 2000);
      }
    } catch (error) {
      console.error('Failed to use bomb:', error);
    }
    
    setActiveTool(TOOLS.PIXEL);
    setPreviewPixels([]);
  };
  
  // Canvas wipe
  const performCanvasWipe = async () => {
    if (!userData.canvasWipes || userData.canvasWipes <= 0) {
      setPaymentMessage('No canvas wipes available!');
      setTimeout(() => setPaymentMessage(null), 2000);
      return;
    }
    
    try {
      const response = await fetch(`${SERVER_URL}/api/canvas-wipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId.current }),
      });
      const data = await response.json();
      if (data.success) {
        setUserData(prev => ({ ...prev, canvasWipes: data.canvasWipes }));
      }
    } catch (error) {
      console.error('Failed to wipe canvas:', error);
    }
    
    setShowWipeConfirm(false);
  };

  const handleCanvasClick = (e) => {
    if (e.button !== 0) return;
    if (isDragging.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);

    if (isEyedropperActive) {
      const ctx = canvas.getContext('2d');
      const pixelData = ctx.getImageData(x * PIXEL_SIZE, y * PIXEL_SIZE, 1, 1).data;
      if (pixelData[3] === 0) return;
      const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1).toUpperCase();
      setSelectedColor(hex);
      setIsEyedropperActive(false);
      return;
    }
    
    // Handle different tools
    switch (activeTool) {
      case TOOLS.PIXEL:
        placePixel(e.clientX, e.clientY);
        break;
      case TOOLS.BRUSH:
        if (userData.tools.includes('brush')) {
          const pixels = getBrushPixels(x, y);
          placeMultiplePixels(pixels);
        }
        break;
      case TOOLS.BOMB_5:
        useBomb(x, y, 5);
        break;
      case TOOLS.BOMB_10:
        useBomb(x, y, 10);
        break;
      case TOOLS.LINE:
      case TOOLS.RECTANGLE:
      case TOOLS.CIRCLE:
        // These are handled by mouse down/up
        break;
      default:
        placePixel(e.clientX, e.clientY);
    }
  };
  
  // Handle tool drawing (mouse down for line/rect/circle)
  const handleToolMouseDown = (e) => {
    if (e.button !== 0) return;
    if (![TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE].includes(activeTool)) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);
    
    setDrawStart({ x, y });
    isDrawing.current = true;
  };
  
  const handleToolMouseMove = (e) => {
    if (!isDrawing.current || !drawStart) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);
    
    let pixels = [];
    switch (activeTool) {
      case TOOLS.LINE:
        pixels = getLinePixels(drawStart.x, drawStart.y, x, y);
        break;
      case TOOLS.RECTANGLE:
        pixels = getRectPixels(drawStart.x, drawStart.y, x, y);
        break;
      case TOOLS.CIRCLE:
        pixels = getCirclePixels(drawStart.x, drawStart.y, x, y);
        break;
    }
    setPreviewPixels(pixels);
  };
  
  const handleToolMouseUp = (e) => {
    if (!isDrawing.current || !drawStart) return;
    isDrawing.current = false;
    
    if (previewPixels.length > 0) {
      placeMultiplePixels(previewPixels);
    }
    
    setDrawStart(null);
  };

  // Touch Handlers
  const getTouchDistance = (touches) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const getTouchCenter = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchState.current.isDragging = true;
      touchState.current.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.startTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.hasMoved = false;
      touchState.current.isPinching = false;
    } else if (e.touches.length === 2) {
      touchState.current.isPinching = true;
      touchState.current.isDragging = false;
      touchState.current.hasMoved = true; // Mark as moved to prevent pixel placement after pinch
      touchState.current.lastDist = getTouchDistance(e.touches);
      touchState.current.lastCenter = getTouchCenter(e.touches);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling

    if (touchState.current.isPinching && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const currentTarget = targetTransform.current;

      // Calculate zoom
      const scale = dist / touchState.current.lastDist;
      const newZoom = Math.min(Math.max(0.1, currentTarget.zoom * scale), 10);

      // Calculate pan to keep center stationary relative to screen
      const rect = containerRef.current.getBoundingClientRect();
      const relCenterX = center.x - rect.left;
      const relCenterY = center.y - rect.top;
      
      const worldX = (relCenterX - currentTarget.x) / currentTarget.zoom;
      const worldY = (relCenterY - currentTarget.y) / currentTarget.zoom;
      
      const dx = center.x - touchState.current.lastCenter.x;
      const dy = center.y - touchState.current.lastCenter.y;

      const newOffsetX = relCenterX - worldX * newZoom + dx;
      const newOffsetY = relCenterY - worldY * newZoom + dy;

      targetTransform.current = { zoom: newZoom, x: newOffsetX, y: newOffsetY };
      
      // Trigger animation for pinch zoom
      if (window.startCanvasAnimation) window.startCanvasAnimation();
      
      touchState.current.lastDist = dist;
      touchState.current.lastCenter = center;

    } else if (touchState.current.isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchState.current.lastTouchPos.x;
      const dy = e.touches[0].clientY - touchState.current.lastTouchPos.y;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        touchState.current.hasMoved = true;
      }

      targetTransform.current.x += dx;
      targetTransform.current.y += dy;
      
      // Instant update for responsiveness
      currentTransform.current.x += dx;
      currentTransform.current.y += dy;
      setOffset({ x: currentTransform.current.x, y: currentTransform.current.y });

      touchState.current.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e) => {
    // Only place pixel if: not moved, was NOT pinching, single touch ended, and no touches remain
    if (!touchState.current.hasMoved && !touchState.current.isPinching && !touchState.current.wasPinching && e.changedTouches.length === 1 && e.touches.length === 0) {
      // It's a tap!
      const touch = e.changedTouches[0];
      placePixel(touch.clientX, touch.clientY);
    }

    if (e.touches.length === 0) {
      touchState.current.isDragging = false;
      touchState.current.isPinching = false;
      touchState.current.wasPinching = false;
    } else if (e.touches.length === 1) {
      // Transition from pinch to drag - mark that we were pinching
      if (touchState.current.isPinching) {
        touchState.current.isPinching = false;
        touchState.current.wasPinching = true; // Remember we were pinching
        touchState.current.isDragging = true;
        touchState.current.hasMoved = true; // Ensure no pixel placement
        touchState.current.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  };

  // Pan and Zoom Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Use target values for calculation to ensure consistency
    const currentTarget = targetTransform.current;
    
    // Exponential zoom for "swifter" feel when closeup
    const zoomSpeed = 0.001;
    const zoomFactor = 1 - e.deltaY * zoomSpeed;
    const newZoom = Math.min(Math.max(0.1, currentTarget.zoom * zoomFactor), 20);

    // Zoom towards cursor
    const newOffsetX = mouseX - (mouseX - currentTarget.x) * (newZoom / currentTarget.zoom);
    const newOffsetY = mouseY - (mouseY - currentTarget.y) * (newZoom / currentTarget.zoom);

    targetTransform.current = { zoom: newZoom, x: newOffsetX, y: newOffsetY };
    
    // Trigger animation
    if (window.startCanvasAnimation) window.startCanvasAnimation();
  };

  const handleMouseDown = (e) => {
    // Right click for panning
    if (e.button === 2) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
    // Left click for tools
    if (e.button === 0) {
      handleToolMouseDown(e);
    }
  };

  const handleMouseUp = (e) => {
    isDragging.current = false;
    handleToolMouseUp(e);
  };

  const handleMouseMove = (e) => {
    // Panning Logic (Right Mouse Button)
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      targetTransform.current.x += dx;
      targetTransform.current.y += dy;
      currentTransform.current.x += dx;
      currentTransform.current.y += dy;
      setOffset({ x: currentTransform.current.x, y: currentTransform.current.y });
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
    
    // Tool drawing preview
    if (isDrawing.current && drawStart) {
      handleToolMouseMove(e);
    }

    // Hover Logic
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
      const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);

      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        setHoveredPixel({ x, y });
        
        // Update preview for bombs
        if (activeTool === TOOLS.BOMB_5 || activeTool === TOOLS.BOMB_10) {
          const size = activeTool === TOOLS.BOMB_5 ? 5 : 10;
          setPreviewPixels(getBombPixels(x, y, size));
        } else if (activeTool === TOOLS.BRUSH && !isDrawing.current) {
          setPreviewPixels(getBrushPixels(x, y));
        } else if (!isDrawing.current && ![TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE].includes(activeTool)) {
          setPreviewPixels([]);
        }
        
        // Emit cursor position (throttled)
        const now = Date.now();
        if (socketRef.current && now - lastCursorEmit.current > CURSOR_THROTTLE) {
          lastCursorEmit.current = now;
          socketRef.current.emit('cursor_move', { 
            x, y, 
            name: displayName,
            cosmetics: userData.cosmetics,
            cursorColor: userData.cursorColor
          });
        }
      } else {
        setHoveredPixel(null);
      }
    }
  };

  // Format time for display
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Admin functions
  const resetTimer = () => {
    localStorage.removeItem('refillTime');
    setTimeUntilRefill(0);
    setPixelsRemaining(MAX_PIXELS);
  };

  const addPixels = () => {
    const amount = parseInt(adminPixelInput);
    if (!isNaN(amount) && amount > 0) {
      setPixelsRemaining(prev => prev + amount);
      setAdminPixelInput('');
      // Clear timer if we have pixels now
      if (pixelsRemaining === 0) {
        localStorage.removeItem('refillTime');
        setTimeUntilRefill(0);
      }
    }
  };

  const toggleCosmetic = async (cosmetic) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/toggle-cosmetic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorId: visitorId.current, 
          cosmetic,
          adminPassword: verifiedAdminPassword
        }),
      });
      const data = await response.json();
      if (data.success) {
        setUserData(prev => ({ ...prev, cosmetics: data.cosmetics }));
      }
    } catch (error) {
      console.error('Toggle cosmetic error:', error);
    }
  };

  // Purchase item
  const purchaseItem = async (productId) => {
    // Require account for purchases
    if (!isLoggedIn) {
      setPendingPurchase(productId);
      setRequireAuthForPurchase(true);
      setShowAuthModal(true);
      setAuthMode('register');
      return;
    }
    
    setIsLoadingPurchase(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, visitorId: visitorId.current }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Could not start payment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Could not start payment. Please try again.');
    }
    setIsLoadingPurchase(false);
  };
  
  // Set custom cursor color
  const setCustomCursorColor = async (color) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/set-cursor-color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId.current, color }),
      });
      const data = await response.json();
      if (data.success) {
        setUserData(prev => ({ ...prev, cursorColor: color }));
      }
    } catch (error) {
      console.error('Failed to set cursor color:', error);
    }
  };
  
  // Auth functions
  const handleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authEmail, 
          password: authPassword,
          currentVisitorId: getVisitorId()
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        // Update visitor ID to the account's visitor ID
        localStorage.setItem('loggedInVisitorId', data.visitorId);
        localStorage.setItem('userEmail', authEmail);
        if (data.displayName) {
          localStorage.setItem('displayName', data.displayName);
          setDisplayName(data.displayName);
          setDisplayNameInput(data.displayName);
        }
        
        visitorId.current = data.visitorId;
        setIsLoggedIn(true);
        setUserEmail(authEmail);
        setUserData(data.user);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        
        // Reconnect socket with new visitor ID
        if (socketRef.current) {
          socketRef.current.emit('set_visitor', { visitorId: data.visitorId });
        }
        
        // If there was a pending purchase, continue
        if (pendingPurchase) {
          purchaseItem(pendingPurchase);
          setPendingPurchase(null);
        }
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (error) {
      setAuthError('Connection error. Try again.');
    }
    
    setAuthLoading(false);
  };
  
  const handleRegister = async () => {
    setAuthError('');
    setAuthLoading(true);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authEmail, 
          password: authPassword,
          displayName: authDisplayName,
          visitorId: getVisitorId() // Use current guest ID so purchases transfer
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        // Log them in automatically
        localStorage.setItem('loggedInVisitorId', getVisitorId());
        localStorage.setItem('userEmail', authEmail);
        if (authDisplayName) {
          localStorage.setItem('displayName', authDisplayName);
          setDisplayName(authDisplayName);
          setDisplayNameInput(authDisplayName);
        }
        
        setIsLoggedIn(true);
        setUserEmail(authEmail);
        setUserData(data.user);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthDisplayName('');
        
        // If there was a pending purchase, continue
        if (pendingPurchase) {
          purchaseItem(pendingPurchase);
          setPendingPurchase(null);
        }
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (error) {
      setAuthError('Connection error. Try again.');
    }
    
    setAuthLoading(false);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('loggedInVisitorId');
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
    setUserEmail('');
    
    // Generate new guest ID and reload data
    const newGuestId = 'visitor_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('visitorId', newGuestId);
    visitorId.current = newGuestId;
    
    // Fetch guest user data
    fetch(`${SERVER_URL}/api/user/${newGuestId}`)
      .then(res => res.json())
      .then(data => setUserData(data));
    
    // Update socket
    if (socketRef.current) {
      socketRef.current.emit('set_visitor', { visitorId: newGuestId });
    }
  };

  return (
    <div className="app-container">
      {/* Info Menu Button */}
      <button 
        className="info-menu-btn"
        onClick={() => setShowInfoMenu(!showInfoMenu)}
        title="Menu"
      >
        ☰
      </button>
      
      {/* Info Menu Dropdown */}
      {showInfoMenu && (
        <div className="info-menu">
          <button onClick={() => { setInfoPage('howto'); setShowInfoMenu(false); }}>
            <PixelIcon name="question" size={16} color={iconColor} /> How to Play
          </button>
          <button onClick={() => { setInfoPage('rules'); setShowInfoMenu(false); }}>
            <PixelIcon name="rules" size={16} color={iconColor} /> Rules
          </button>
          <button onClick={() => { setInfoPage('stats'); setShowInfoMenu(false); }}>
            <PixelIcon name="chart" size={16} color={iconColor} /> Statistics
          </button>
          <button onClick={() => { setInfoPage('about'); setShowInfoMenu(false); }}>
            <PixelIcon name="info" size={16} color={iconColor} /> About Pixles
          </button>
        </div>
      )}
      
      {/* Info Page Modal */}
      {infoPage && (
        <div className="shop-overlay" onClick={() => setInfoPage(null)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-header">
              <span>
                {infoPage === 'howto' && <><PixelIcon name="question" size={18} /> How to Play</>}
                {infoPage === 'rules' && <><PixelIcon name="rules" size={18} /> Rules</>}
                {infoPage === 'stats' && <><PixelIcon name="chart" size={18} /> Statistics</>}
                {infoPage === 'about' && <><PixelIcon name="info" size={18} /> About Pixles</>}
              </span>
              <button onClick={() => setInfoPage(null)}>✕</button>
            </div>
            <div className="info-content">
              {infoPage === 'howto' && (
                <>
                  <h3>🎨 Getting Started</h3>
                  <ul>
                    <li><strong>Click</strong> on the canvas to place a pixel</li>
                    <li><strong>Right-click + drag</strong> to pan around</li>
                    <li><strong>Scroll</strong> to zoom in/out</li>
                    <li><strong>Touch:</strong> Tap to place, pinch to zoom, drag to pan</li>
                  </ul>
                  
                  <h3>🎯 Pixels</h3>
                  <ul>
                    <li>You get <strong>10 free pixels</strong> that refill every 4 hours</li>
                    <li>Buy more pixels in the shop if you run out</li>
                  </ul>
                  
                  <h3>🛠️ Tools</h3>
                  <ul>
                    <li><strong>Pixel:</strong> Place one pixel at a time (free)</li>
                    <li><strong>Brush:</strong> Paint 3×3 area (purchasable)</li>
                    <li><strong>Line/Rectangle/Circle:</strong> Draw shapes (purchasable)</li>
                    <li><strong>Bombs:</strong> Fill 5×5 or 10×10 areas instantly</li>
                  </ul>
                  
                  <h3>💄 Cosmetics</h3>
                  <ul>
                    <li><strong>Glow:</strong> Make your pixels stand out</li>
                    <li><strong>VIP Badge:</strong> Show your status</li>
                    <li><strong>Custom Cursor:</strong> Personalize your look</li>
                  </ul>
                </>
              )}
              
              {infoPage === 'rules' && (
                <>
                  <h3>✅ Allowed</h3>
                  <ul>
                    <li>Create pixel art</li>
                    <li>Collaborate with others</li>
                    <li>Defend your creations</li>
                    <li>Have fun!</li>
                  </ul>
                  
                  <h3>❌ Not Allowed</h3>
                  <ul>
                    <li>Hate symbols or offensive content</li>
                    <li>NSFW/inappropriate imagery</li>
                    <li>Using bots or automation</li>
                    <li>Spamming or griefing excessively</li>
                  </ul>
                  
                  <h3>⚠️ Consequences</h3>
                  <p>Breaking the rules may result in your pixels being removed or account being banned.</p>
                </>
              )}
              
              {infoPage === 'stats' && (
                <>
                  <h3>📊 Your Stats</h3>
                  <ul>
                    <li><strong>Pixels available:</strong> {pixelsRemaining + userData.pixels}</li>
                    <li><strong>Free pixels:</strong> {pixelsRemaining}/10</li>
                    <li><strong>Purchased pixels:</strong> {userData.pixels}</li>
                    <li><strong>Bombs (5×5):</strong> {userData.bombs[5]}</li>
                    <li><strong>Bombs (10×10):</strong> {userData.bombs[10]}</li>
                    <li><strong>Canvas wipes:</strong> {userData.canvasWipes}</li>
                    <li><strong>Tools owned:</strong> {userData.tools.length}</li>
                    <li><strong>Cosmetics owned:</strong> {userData.cosmetics.length}</li>
                  </ul>
                  
                  <h3>🌐 Canvas Info</h3>
                  <ul>
                    <li><strong>Canvas size:</strong> {CANVAS_SIZE} × {CANVAS_SIZE} pixels</li>
                    <li><strong>Total pixels:</strong> {(CANVAS_SIZE * CANVAS_SIZE).toLocaleString()}</li>
                    <li><strong>Active users:</strong> {Object.keys(otherCursors).length + 1}</li>
                  </ul>
                </>
              )}
              
              {infoPage === 'about' && (
                <>
                  <h3>🎮 What is Pixles?</h3>
                  <p>Pixles is a collaborative pixel art canvas inspired by Reddit's r/place. Work together (or against each other!) to create art on a shared canvas.</p>
                  
                  <h3>👥 Made By</h3>
                  <p>Created by Elias and friends as a fun project.</p>
                  
                  <h3>💻 Tech Stack</h3>
                  <ul>
                    <li>React + Vite (Frontend)</li>
                    <li>Node.js + Express (Backend)</li>
                    <li>Socket.io (Real-time)</li>
                    <li>Stripe (Payments)</li>
                  </ul>
                  
                  <h3>📝 Version</h3>
                  <p>v1.0.0</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pixels-counter">
        <div className="pixels-counter-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
          <span className={pixelsRemaining === 0 && userData.pixels === 0 ? 'zero' : ''}>
            {pixelsRemaining + userData.pixels}
          </span>
          {showPurchasedIndicator && lastPurchasedItem && (
            <span className="purchased-indicator" title="Last purchase">
              (+{lastPurchasedItem})
            </span>
          )}
          <button 
            className="buy-pixels-btn"
            onClick={() => setShowShop(true)}
            title="Shop"
          >
            <PixelIcon name="cart" size={16} />
          </button>
        </div>
        {/* Power-ups indicator */}
        <div className="powerups-indicator">
          {userData.bombs[5] > 0 && (
            <span className="powerup-badge" title="5×5 Bombs" onClick={() => setActiveTool(TOOLS.BOMB_5)}>
              <PixelIcon name="bomb" size={14} />5×{userData.bombs[5]}
            </span>
          )}
          {userData.bombs[10] > 0 && (
            <span className="powerup-badge" title="10×10 Bombs" onClick={() => setActiveTool(TOOLS.BOMB_10)}>
              <PixelIcon name="bomb" size={14} />10×{userData.bombs[10]}
            </span>
          )}
          {userData.canvasWipes > 0 && (
            <span className="powerup-badge wipe" title="Canvas wipe" onClick={() => setShowWipeConfirm(true)}>
              <PixelIcon name="broom" size={14} />{userData.canvasWipes}
            </span>
          )}
        </div>
        {pixelsRemaining === 0 && userData.pixels === 0 && (
          <div className="pixels-depleted">
            <span>No pixels left!</span>
            {timeUntilRefill > 0 && (
              <span className="refill-timer-inline">{formatTime(timeUntilRefill)} until refill</span>
            )}
            <button 
              className="buy-now-btn"
              onClick={() => setShowShop(true)}
            >
              Buy more
            </button>
          </div>
        )}
      </div>
      {paymentMessage && (
        <div className="payment-success-message">
          <span>✓ {paymentMessage}</span>
          <button onClick={() => setPaymentMessage(null)}>×</button>
        </div>
      )}
      <div 
        className="viewport"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu
      >
        <div 
          className="canvas-wrapper"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            width: CANVAS_SIZE * PIXEL_SIZE,
            height: CANVAS_SIZE * PIXEL_SIZE
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * PIXEL_SIZE}
            height={CANVAS_SIZE * PIXEL_SIZE}
            onClick={handleCanvasClick}
            className="pixel-canvas"
            style={{ 
              imageRendering: 'pixelated',
              cursor: isEyedropperActive ? 'copy' : 'crosshair'
            }}
          />
          {zoom > 4 && (
            <div 
              className="grid-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: CANVAS_SIZE * PIXEL_SIZE,
                height: CANVAS_SIZE * PIXEL_SIZE,
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.12) ${1/zoom}px, transparent ${1/zoom}px),
                  linear-gradient(to bottom, rgba(0,0,0,0.12) ${1/zoom}px, transparent ${1/zoom}px)
                `,
                backgroundSize: `${PIXEL_SIZE}px ${PIXEL_SIZE}px`,
                pointerEvents: 'none',
                zIndex: 3,
                opacity: Math.min((zoom - 4) / 2, 1),
                transition: 'opacity 0.2s'
              }}
            />
          )}
          {zoom > 1.5 && animatingPixels.map(p => (
            <div
              key={p.id}
              className="pixel-place-animation"
              style={{
                left: p.x * PIXEL_SIZE,
                top: p.y * PIXEL_SIZE,
                width: PIXEL_SIZE,
                height: PIXEL_SIZE,
                backgroundColor: p.color
              }}
            />
          ))}
          {hoveredPixel && (
            <div 
              className="pixel-highlight"
              style={{
                left: hoveredPixel.x * PIXEL_SIZE,
                top: hoveredPixel.y * PIXEL_SIZE,
                width: PIXEL_SIZE,
                height: PIXEL_SIZE,
                border: '1px solid rgba(0, 0, 0, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 2px rgba(0,0,0,0.3)'
              }}
            />
          )}
          {/* Tool preview pixels */}
          {previewPixels.map((p, i) => (
            <div
              key={i}
              className="pixel-preview"
              style={{
                left: p.x * PIXEL_SIZE,
                top: p.y * PIXEL_SIZE,
                width: PIXEL_SIZE,
                height: PIXEL_SIZE,
                backgroundColor: selectedColor,
                opacity: 0.5
              }}
            />
          ))}
          {/* Other users' cursors - limited on mobile for performance */}
          {Object.entries(otherCursors).slice(0, isMobile ? 10 : 50).map(([id, cursor]) => {
            const hasRainbow = cursor.cosmetics?.includes('customCursor');
            const cursorFill = cursor.cursorColor || cursor.color;
            
            return (
              <div
                key={id}
                className={`other-cursor ${hasRainbow ? 'rainbow-cursor' : ''}`}
                style={{
                  left: cursor.x * PIXEL_SIZE,
                  top: cursor.y * PIXEL_SIZE,
                }}
              >
                <svg 
                  width={PIXEL_SIZE} 
                  height={PIXEL_SIZE} 
                  viewBox="0 0 5 5" 
                  style={{ 
                    shapeRendering: 'crispEdges'
                  }}
                >
                  <rect x="2" y="0" width="1" height="2" fill={cursorFill}/>
                  <rect x="0" y="2" width="2" height="1" fill={cursorFill}/>
                  <rect x="2" y="2" width="1" height="1" fill={cursorFill}/>
                  <rect x="3" y="2" width="2" height="1" fill={cursorFill}/>
                  <rect x="2" y="3" width="1" height="2" fill={cursorFill}/>
                </svg>
                {/* Hide cursor names on mobile for performance */}
                {!isMobile && cursor.name && (
                  <div 
                    className={`cursor-name ${hasRainbow ? 'rainbow-text' : ''}`}
                    style={{ 
                      color: hasRainbow ? undefined : (cursor.cursorColor || cursor.color),
                      transform: `translateX(-50%) scale(${1/zoom})`
                    }}
                  >
                    {cursor.cosmetics?.includes('vip') && <span className="vip-badge"><PixelIcon name="crown" size={10} color="#FFD700" /></span>}
                    {cursor.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tools Sidebar */}
      <div className={`tools-sidebar ${showTools ? 'open' : ''}`}>
        <button className="tools-toggle" onClick={() => setShowTools(!showTools)}>
          🔧
        </button>
        <div className="tools-content">
          <div className="tool-section">
            <div className="section-label">Tools</div>
            <button 
              className={`tool-btn ${activeTool === TOOLS.PIXEL ? 'active' : ''}`}
              onClick={() => { setActiveTool(TOOLS.PIXEL); setPreviewPixels([]); }}
              title="Single Pixel"
            >
              <span><PixelIcon name="pencil" size={16} /></span>
              <span>Pixel</span>
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.BRUSH ? 'active' : ''} ${!userData.tools.includes('brush') ? 'locked' : ''}`}
              onClick={() => userData.tools.includes('brush') && setActiveTool(TOOLS.BRUSH)}
              title={userData.tools.includes('brush') ? "Brush 3×3" : "Purchase to unlock"}
            >
              <span><PixelIcon name="brush" size={16} /></span>
              <span>Brush</span>
              {!userData.tools.includes('brush') && <span className="lock-icon"><PixelIcon name="lock" size={12} /></span>}
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.LINE ? 'active' : ''} ${!userData.tools.includes('line') ? 'locked' : ''}`}
              onClick={() => userData.tools.includes('line') && setActiveTool(TOOLS.LINE)}
              title={userData.tools.includes('line') ? "Line Tool" : "Purchase to unlock"}
            >
              <span><PixelIcon name="line" size={16} /></span>
              <span>Line</span>
              {!userData.tools.includes('line') && <span className="lock-icon"><PixelIcon name="lock" size={12} /></span>}
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.RECTANGLE ? 'active' : ''} ${!userData.tools.includes('rectangle') ? 'locked' : ''}`}
              onClick={() => userData.tools.includes('rectangle') && setActiveTool(TOOLS.RECTANGLE)}
              title={userData.tools.includes('rectangle') ? "Rectangle Tool" : "Purchase to unlock"}
            >
              <span><PixelIcon name="rectangle" size={16} /></span>
              <span>Rect</span>
              {!userData.tools.includes('rectangle') && <span className="lock-icon"><PixelIcon name="lock" size={12} /></span>}
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.CIRCLE ? 'active' : ''} ${!userData.tools.includes('circle') ? 'locked' : ''}`}
              onClick={() => userData.tools.includes('circle') && setActiveTool(TOOLS.CIRCLE)}
              title={userData.tools.includes('circle') ? "Circle Tool" : "Purchase to unlock"}
            >
              <span><PixelIcon name="circle" size={16} /></span>
              <span>Circle</span>
              {!userData.tools.includes('circle') && <span className="lock-icon"><PixelIcon name="lock" size={12} /></span>}
            </button>
          </div>
          
          {(userData.bombs[5] > 0 || userData.bombs[10] > 0) && (
            <div className="tool-section">
              <div className="section-label">Power-ups</div>
              {userData.bombs[5] > 0 && (
                <button 
                  className={`tool-btn powerup ${activeTool === TOOLS.BOMB_5 ? 'active' : ''}`}
                  onClick={() => setActiveTool(TOOLS.BOMB_5)}
                  title="5×5 Bomb"
                >
                  <span><PixelIcon name="bomb" size={16} /></span>
                  <span>5×5 ({userData.bombs[5]})</span>
                </button>
              )}
              {userData.bombs[10] > 0 && (
                <button 
                  className={`tool-btn powerup ${activeTool === TOOLS.BOMB_10 ? 'active' : ''}`}
                  onClick={() => setActiveTool(TOOLS.BOMB_10)}
                  title="10×10 Bomb"
                >
                  <span><PixelIcon name="bomb" size={16} /></span>
                  <span>10×10 ({userData.bombs[10]})</span>
                </button>
              )}
            </div>
          )}
          
          {/* Cosmetics/Effects Section */}
          {userData.cosmetics.includes('glow') && (
            <div className="tool-section">
              <div className="section-label">Effects</div>
              <button 
                className={`tool-btn effect ${useGlow ? 'active' : ''}`}
                onClick={() => setUseGlow(!useGlow)}
                title="Toggle glow effect"
              >
                <span><PixelIcon name="sparkle" size={16} /></span>
                <span>Glow {useGlow ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="controls-bar">
        <div className="color-presets">
          {palette.map((color, index) => (
            <div key={index} className="color-preset-wrapper">
              <button
                className={`color-preset ${activePaletteIndex === index ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setSelectedColor(color);
                  setActivePaletteIndex(index);
                }}
              />
              <button 
                className="remove-color-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const newPalette = palette.filter((_, i) => i !== index);
                  setPalette(newPalette);
                  if (activePaletteIndex === index) {
                    setActivePaletteIndex(0);
                    if (newPalette.length > 0) setSelectedColor(newPalette[0]);
                  } else if (activePaletteIndex > index) {
                    setActivePaletteIndex(activePaletteIndex - 1);
                  }
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="color-picker-wrapper">
          <button 
            className={`eyedropper-btn ${isEyedropperActive ? 'active' : ''}`}
            onClick={() => setIsEyedropperActive(!isEyedropperActive)}
            title="Pick color from canvas"
          >
            <PixelIcon name="eyedropper" size={18} />
          </button>
          <input 
            type="color" 
            value={selectedColor} 
            onInput={(e) => setSelectedColor(e.target.value)}
            onChange={(e) => setSelectedColor(e.target.value)} 
            className="color-picker"
            title="Choose custom color"
          />
          <button 
            className="add-color-btn"
            onClick={() => {
              setPalette([...palette, selectedColor]);
              setActivePaletteIndex(palette.length);
            }}
            title="Add selected color"
          >
            +
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <button 
        className="admin-toggle"
        onClick={() => setIsAdminOpen(!isAdminOpen)}
        title="Settings"
      >
        ⚙
      </button>

      {isAdminOpen && (
        <div className="admin-panel settings-panel">
          <div className="admin-header">
            <span>Settings</span>
            <button onClick={() => { setIsAdminOpen(false); setIsAdminAuthenticated(false); setAdminPassword(''); setVerifiedAdminPassword(''); setAdminPasswordError(false); }}>×</button>
          </div>
          
          {/* Account Section */}
          <div className="settings-section account-section">
            <div className="section-title">Account</div>
            {isLoggedIn ? (
              <div className="account-info">
                <div className="account-email">
                  <PixelIcon name="check" size={14} color="#2ecc71" /> {userEmail}
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <div className="guest-info">
                <div className="guest-label">
                  Playing as Guest
                </div>
                <p className="guest-hint">Create an account to save your purchases across devices!</p>
                <button className="login-btn" onClick={() => { setShowAuthModal(true); setAuthMode('login'); setRequireAuthForPurchase(false); }}>
                  Log in
                </button>
                <button className="register-btn" onClick={() => { setShowAuthModal(true); setAuthMode('register'); setRequireAuthForPurchase(false); }}>
                  Create Account
                </button>
              </div>
            )}
          </div>
          
          {/* General Settings */}
          <div className="settings-section">
            <div className="settings-row">
              <span>Display Name</span>
              <div className="display-name-wrapper">
                <input
                  type="text"
                  className="display-name-input"
                  placeholder={isLoggedIn ? "Enter name..." : "Guest"}
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setDisplayName(displayNameInput);
                      localStorage.setItem('displayName', displayNameInput);
                    }
                  }}
                  maxLength={20}
                />
                <button
                  className="display-name-btn"
                  onClick={() => {
                    setDisplayName(displayNameInput);
                    localStorage.setItem('displayName', displayNameInput);
                  }}
                  title="Set name"
                >
                  ✓
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span>Dark Mode</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={darkMode} 
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Admin Section */}
          <div className="settings-section admin-section">
            <div className="section-title">Admin Controls</div>
            
            {!isAdminAuthenticated ? (
              <div className="admin-content">
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminPasswordError(false); }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      try {
                        const response = await fetch(`${SERVER_URL}/api/admin/verify`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: adminPassword }),
                        });
                        const data = await response.json();
                        if (data.success) {
                          setVerifiedAdminPassword(adminPassword);
                          setIsAdminAuthenticated(true);
                          setAdminPassword('');
                          setAdminPasswordError(false);
                        } else {
                          setAdminPasswordError(true);
                        }
                      } catch (error) {
                        setAdminPasswordError(true);
                      }
                    }
                  }}
                  className={adminPasswordError ? 'error' : ''}
                />
                <button 
                  className="admin-btn" 
                  onClick={async () => {
                    try {
                      const response = await fetch(`${SERVER_URL}/api/admin/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: adminPassword }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        setVerifiedAdminPassword(adminPassword);
                        setIsAdminAuthenticated(true);
                        setAdminPassword('');
                        setAdminPasswordError(false);
                      } else {
                        setAdminPasswordError(true);
                      }
                    } catch (error) {
                      setAdminPasswordError(true);
                    }
                  }}
                >
                  Login
                </button>
                {adminPasswordError && <div className="admin-error">Wrong password</div>}
              </div>
            ) : (
              <div className="admin-content">
                <button className="admin-btn" onClick={resetTimer}>
                  Reset Timer & Refill Pixels
                </button>
                <div className="admin-input-group">
                  <input
                    type="number"
                    placeholder="Pixels"
                    value={adminPixelInput}
                    onChange={(e) => setAdminPixelInput(e.target.value)}
                    min="1"
                  />
                  <button className="admin-btn add-pixels-btn" onClick={addPixels} title="Add Pixels">
                    +
                  </button>
                </div>
                <div className="admin-info">
                  Current: {pixelsRemaining} pixels
                </div>
                
                <div className="admin-cosmetics">
                  <div className="admin-cosmetics-title">Toggle Cosmetics (Testing)</div>
                  <div className="admin-cosmetic-toggles">
                    <button 
                      className={`admin-cosmetic-btn ${userData.cosmetics.includes('vip') ? 'active' : ''}`}
                      onClick={() => toggleCosmetic('vip')}
                    >
                      👑 VIP {userData.cosmetics.includes('vip') ? '✓' : ''}
                    </button>
                    <button 
                      className={`admin-cosmetic-btn ${userData.cosmetics.includes('customCursor') ? 'active' : ''}`}
                      onClick={() => toggleCosmetic('customCursor')}
                    >
                      🌈 Rainbow Cursor {userData.cosmetics.includes('customCursor') ? '✓' : ''}
                    </button>
                    <button 
                      className={`admin-cosmetic-btn ${userData.cosmetics.includes('glow') ? 'active' : ''}`}
                      onClick={() => toggleCosmetic('glow')}
                    >
                      ✨ Glow Effect {userData.cosmetics.includes('glow') ? '✓' : ''}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="shop-overlay" onClick={() => setShowShop(false)}>
          <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shop-header">
              <span><PixelIcon name="cart" size={18} /> Shop</span>
              <button onClick={() => setShowShop(false)}><PixelIcon name="close" size={14} /></button>
            </div>
            
            {/* Shop Tabs */}
            <div className="shop-tabs">
              <button 
                className={shopTab === 'pixels' ? 'active' : ''} 
                onClick={() => setShopTab('pixels')}
              >
                Pixels
              </button>
              <button 
                className={shopTab === 'powerups' ? 'active' : ''} 
                onClick={() => setShopTab('powerups')}
              >
                Power-ups
              </button>
              <button 
                className={shopTab === 'tools' ? 'active' : ''} 
                onClick={() => setShopTab('tools')}
              >
                Tools
              </button>
              <button 
                className={shopTab === 'cosmetics' ? 'active' : ''} 
                onClick={() => setShopTab('cosmetics')}
              >
                Cosmetics
              </button>
            </div>
            
            <div className="shop-content">
              {/* PIXELS TAB */}
              {shopTab === 'pixels' && (
                <>
                  <p className="shop-description">Buy extra pixels to place instantly!</p>
                  <div className="shop-packages">
                    <button className="package-btn" onClick={() => purchaseItem('pixels_10')} disabled={isLoadingPurchase}>
                      <span className="package-pixels">10 Pixels</span>
                      <span className="package-price">5 kr</span>
                    </button>
                    <button className="package-btn" onClick={() => purchaseItem('pixels_50')} disabled={isLoadingPurchase}>
                      <span className="package-pixels">50 Pixels</span>
                      <span className="package-price">20 kr</span>
                      <span className="package-savings">Save 20%</span>
                    </button>
                    <button className="package-btn popular" onClick={() => purchaseItem('pixels_150')} disabled={isLoadingPurchase}>
                      <span className="package-badge">Popular!</span>
                      <span className="package-pixels">150 Pixels</span>
                      <span className="package-price">45 kr</span>
                      <span className="package-savings">Save 40%</span>
                    </button>
                    <button className="package-btn best-value" onClick={() => purchaseItem('pixels_500')} disabled={isLoadingPurchase}>
                      <span className="package-badge">Best value!</span>
                      <span className="package-pixels">500 Pixels</span>
                      <span className="package-price">125 kr</span>
                      <span className="package-savings">Save 50%</span>
                    </button>
                    <button className="package-btn mega" onClick={() => purchaseItem('pixels_1000')} disabled={isLoadingPurchase}>
                      <span className="package-badge"><PixelIcon name="fire" size={12} /> MEGA!</span>
                      <span className="package-pixels">1000 Pixels</span>
                      <span className="package-price">200 kr</span>
                      <span className="package-savings">Save 60%</span>
                    </button>
                  </div>
                </>
              )}
              
              {/* POWER-UPS TAB */}
              {shopTab === 'powerups' && (
                <>
                  <p className="shop-description">Powerful tools to dominate the canvas!</p>
                  <div className="shop-packages powerups">
                    <button className="package-btn bomb" onClick={() => purchaseItem('bomb_5x5')} disabled={isLoadingPurchase}>
                      <span className="package-emoji"><PixelIcon name="bomb" size={24} /></span>
                      <span className="package-pixels">Pixel Bomb 5×5</span>
                      <span className="package-desc">Fill a 5×5 area instantly!</span>
                      <span className="package-price">25 kr</span>
                    </button>
                    <button className="package-btn bomb" onClick={() => purchaseItem('bomb_10x10')} disabled={isLoadingPurchase}>
                      <span className="package-emoji"><PixelIcon name="bomb" size={24} /></span>
                      <span className="package-pixels">Pixel Bomb 10×10</span>
                      <span className="package-desc">Fill a 10×10 area instantly!</span>
                      <span className="package-price">50 kr</span>
                    </button>
                    <button className="package-btn wipe" onClick={() => purchaseItem('canvas_wipe')} disabled={isLoadingPurchase}>
                      <span className="package-emoji"><PixelIcon name="broom" size={24} /></span>
                      <span className="package-pixels">Canvas Wipe</span>
                      <span className="package-desc">Clear the ENTIRE canvas!</span>
                      <span className="package-price">500 kr</span>
                    </button>
                  </div>
                </>
              )}
              
              {/* TOOLS TAB */}
              {shopTab === 'tools' && (
                <>
                  <p className="shop-description">Unlock powerful drawing tools forever!</p>
                  <div className="shop-packages tools">
                    <button 
                      className={`package-btn tool ${userData.tools.includes('brush') ? 'owned' : ''}`} 
                      onClick={() => !userData.tools.includes('brush') && purchaseItem('tool_brush')} 
                      disabled={isLoadingPurchase || userData.tools.includes('brush')}
                    >
                      <span className="package-emoji"><PixelIcon name="brush" size={24} /></span>
                      <span className="package-pixels">Brush 3×3</span>
                      <span className="package-desc">Paint 3×3 pixels at once</span>
                      <span className="package-price">{userData.tools.includes('brush') ? '✓ Owned' : '15 kr'}</span>
                    </button>
                    <button 
                      className={`package-btn tool ${userData.tools.includes('line') ? 'owned' : ''}`} 
                      onClick={() => !userData.tools.includes('line') && purchaseItem('tool_line')} 
                      disabled={isLoadingPurchase || userData.tools.includes('line')}
                    >
                      <span className="package-emoji"><PixelIcon name="line" size={24} /></span>
                      <span className="package-pixels">Line Tool</span>
                      <span className="package-desc">Draw straight lines easily</span>
                      <span className="package-price">{userData.tools.includes('line') ? '✓ Owned' : '20 kr'}</span>
                    </button>
                    <button 
                      className={`package-btn tool ${userData.tools.includes('rectangle') ? 'owned' : ''}`} 
                      onClick={() => !userData.tools.includes('rectangle') && purchaseItem('tool_rect')} 
                      disabled={isLoadingPurchase || userData.tools.includes('rectangle')}
                    >
                      <span className="package-emoji"><PixelIcon name="rectangle" size={24} /></span>
                      <span className="package-pixels">Rectangle Tool</span>
                      <span className="package-desc">Draw rectangles and squares</span>
                      <span className="package-price">{userData.tools.includes('rectangle') ? '✓ Owned' : '25 kr'}</span>
                    </button>
                    <button 
                      className={`package-btn tool ${userData.tools.includes('circle') ? 'owned' : ''}`} 
                      onClick={() => !userData.tools.includes('circle') && purchaseItem('tool_circle')} 
                      disabled={isLoadingPurchase || userData.tools.includes('circle')}
                    >
                      <span className="package-emoji"><PixelIcon name="circle" size={24} /></span>
                      <span className="package-pixels">Circle Tool</span>
                      <span className="package-desc">Draw circles of any size</span>
                      <span className="package-price">{userData.tools.includes('circle') ? '✓ Owned' : '30 kr'}</span>
                    </button>
                  </div>
                </>
              )}
              
              {/* COSMETICS TAB */}
              {shopTab === 'cosmetics' && (
                <>
                  <p className="shop-description">Stand out from the crowd!</p>
                  <div className="shop-packages cosmetics">
                    <button 
                      className={`package-btn cosmetic ${userData.cosmetics.includes('glow') ? 'owned' : ''}`} 
                      onClick={() => !userData.cosmetics.includes('glow') && purchaseItem('glow_effect')} 
                      disabled={isLoadingPurchase || userData.cosmetics.includes('glow')}
                    >
                      <span className="package-emoji"><PixelIcon name="sparkle" size={24} /></span>
                      <span className="package-pixels">Glow Effect</span>
                      <span className="package-desc">Your pixels glow and stand out</span>
                      <span className="package-price">{userData.cosmetics.includes('glow') ? '✓ Owned' : '20 kr'}</span>
                    </button>
                    <button 
                      className={`package-btn cosmetic ${userData.cosmetics.includes('vip') ? 'owned' : ''}`} 
                      onClick={() => !userData.cosmetics.includes('vip') && purchaseItem('vip_badge')} 
                      disabled={isLoadingPurchase || userData.cosmetics.includes('vip')}
                    >
                      <span className="package-emoji"><PixelIcon name="crown" size={24} color="#FFD700" /></span>
                      <span className="package-pixels">VIP Badge</span>
                      <span className="package-desc">Show off your VIP status</span>
                      <span className="package-price">{userData.cosmetics.includes('vip') ? '✓ Owned' : '50 kr'}</span>
                    </button>
                    <button 
                      className={`package-btn cosmetic ${userData.cosmetics.includes('customCursor') ? 'owned' : ''}`} 
                      onClick={() => !userData.cosmetics.includes('customCursor') && purchaseItem('custom_cursor')} 
                      disabled={isLoadingPurchase || userData.cosmetics.includes('customCursor')}
                    >
                      <span className="package-emoji"><PixelIcon name="target" size={24} /></span>
                      <span className="package-pixels">Custom Cursor</span>
                      <span className="package-desc">Choose your own cursor color</span>
                      <span className="package-price">{userData.cosmetics.includes('customCursor') ? '✓ Owned' : '15 kr'}</span>
                    </button>
                    
                    {/* Custom cursor color picker */}
                    {userData.cosmetics.includes('customCursor') && (
                      <div className="cursor-color-picker">
                        <span>Choose cursor color:</span>
                        <input 
                          type="color" 
                          value={cursorColorPicker}
                          onChange={(e) => setCursorColorPicker(e.target.value)}
                        />
                        <button onClick={() => setCustomCursorColor(cursorColorPicker)}>Apply</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {isLoadingPurchase && (
                <div className="shop-loading">Loading payment...</div>
              )}
              <p className="shop-note"><PixelIcon name="secure" size={14} /> Secure payment via Stripe</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Canvas Wipe Confirmation */}
      {showWipeConfirm && (
        <div className="shop-overlay" onClick={() => setShowWipeConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <span><PixelIcon name="broom" size={18} /> Canvas Wipe</span>
            </div>
            <div className="confirm-content">
              <p><PixelIcon name="bomb" size={16} color="#e74c3c" /> This will clear the ENTIRE canvas!</p>
              <p>All pixels will be removed. This cannot be undone.</p>
              <p>Are you absolutely sure?</p>
              <div className="confirm-buttons">
                <button className="cancel-btn" onClick={() => setShowWipeConfirm(false)}>Cancel</button>
                <button className="confirm-btn" onClick={performCanvasWipe}><PixelIcon name="broom" size={14} /> WIPE CANVAS</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="shop-overlay" onClick={() => { setShowAuthModal(false); setPendingPurchase(null); setRequireAuthForPurchase(false); }}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-header">
              <span>{authMode === 'login' ? '🔑 Log In' : '✨ Create Account'}</span>
              <button onClick={() => { setShowAuthModal(false); setPendingPurchase(null); setRequireAuthForPurchase(false); }}>×</button>
            </div>
            <div className="auth-content">
              {requireAuthForPurchase && (
                <div className="auth-notice">
                  <PixelIcon name="secure" size={16} />
                  <span>Create an account to save your purchases and access them on any device!</span>
                </div>
              )}
              
              {authMode === 'register' && (
                <div className="auth-field">
                  <label>Display Name (optional)</label>
                  <input
                    type="text"
                    placeholder="Your name on canvas"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    maxLength={20}
                  />
                </div>
              )}
              
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={authEmail}
                  onChange={(e) => { setAuthEmail(e.target.value); setAuthError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                />
              </div>
              
              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder={authMode === 'register' ? "Min 6 characters" : "Your password"}
                  value={authPassword}
                  onChange={(e) => { setAuthPassword(e.target.value); setAuthError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                />
              </div>
              
              {authError && <div className="auth-error">{authError}</div>}
              
              <button 
                className="auth-submit-btn"
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                disabled={authLoading}
              >
                {authLoading ? 'Loading...' : (authMode === 'login' ? 'Log In' : 'Create Account')}
              </button>
              
              <div className="auth-switch">
                {authMode === 'login' ? (
                  <>Don't have an account? <button onClick={() => setAuthMode('register')}>Create one</button></>
                ) : (
                  <>Already have an account? <button onClick={() => setAuthMode('login')}>Log in</button></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
