import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const CANVAS_SIZE = 1000; // Must match server
const PIXEL_SIZE = 4; // Size of each pixel in visual px
const SERVER_URL = `http://${window.location.hostname}:3001`;

const INITIAL_PRESETS = [
  '#2D2D2D', // Charcoal
  '#FFFFFF', // White
  '#FF6B6B', // Pastel Red
  '#4ECDC4', // Pastel Teal/Green
  '#45B7D1', // Pastel Blue
  '#FFE66D', // Pastel Yellow
  '#FF9F43', // Pastel Orange
  '#9B59B6', // Amethyst
  '#FF9FF3', // Pastel Pink
  '#95A5A6', // Concrete Grey
  '#D35400', // Pumpkin
  '#2ECC71', // Emerald
  '#3498DB', // Peter River
];

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
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Touch handling refs
  const touchState = useRef({
    lastDist: 0,
    lastCenter: null,
    isPinching: false,
    isDragging: false,
    lastTouchPos: null
  });

  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const containerRef = useRef(null);

  // Animation Loop
  useEffect(() => {
    let animationFrameId;
    
    const animate = () => {
      const target = targetTransform.current;
      const current = currentTransform.current;
      
      // Smooth Zoom (Lerp)
      // We only lerp if there's a significant difference
      const zoomDiff = target.zoom - current.zoom;
      const xDiff = target.x - current.x;
      const yDiff = target.y - current.y;

      if (Math.abs(zoomDiff) > 0.0001 || Math.abs(xDiff) > 0.1 || Math.abs(yDiff) > 0.1) {
        // Lerp factor for zoom - adjust for smoothness
        const t = 0.2; 
        
        current.zoom += zoomDiff * t;
        current.x += xDiff * t;
        current.y += yDiff * t;

        setZoom(current.zoom);
        setOffset({ x: current.x, y: current.y });
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrameId);
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

    // Handle initial state
    socket.on('initial_state', (grid) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
      grid.forEach((row, y) => {
        row.forEach((color, x) => {
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        });
      });
    });

    // Handle updates
    socket.on('pixel_update', ({ x, y, color }) => {
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
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

    return () => {
      socket.disconnect();
    };
  }, []);

  const placePixel = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((clientY - rect.top) * scaleY / PIXEL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      socketRef.current.emit('place_pixel', { x, y, color: selectedColor });
    }
  };

  const handleCanvasClick = (e) => {
    // Only allow left click for painting
    if (e.button !== 0) return;
    
    // If we were dragging (panning), don't paint
    if (isDragging.current) return;

    if (isEyedropperActive) {
      // Eyedropper logic
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
      const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);

      // We need to get the color from the canvas context or server state
      // Since we don't have the full grid state in a variable easily accessible here without prop drilling or context,
      // we can read from the canvas itself.
      const ctx = canvas.getContext('2d');
      const pixelData = ctx.getImageData(x * PIXEL_SIZE, y * PIXEL_SIZE, 1, 1).data;
      
      // If transparent (alpha 0), don't pick
      if (pixelData[3] === 0) return;

      const hex = "#" + ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1).toUpperCase();
      setSelectedColor(hex);
      setIsEyedropperActive(false);
      return;
    }

    placePixel(e.clientX, e.clientY);
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
      touchState.current.isDragging = false; // Disable drag when pinching starts
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
    if (!touchState.current.hasMoved && !touchState.current.isPinching && e.changedTouches.length === 1 && touchState.current.isDragging && e.touches.length === 0) {
      // It's a tap!
      const touch = e.changedTouches[0];
      placePixel(touch.clientX, touch.clientY);
    }

    if (e.touches.length === 0) {
      touchState.current.isDragging = false;
      touchState.current.isPinching = false;
    } else if (e.touches.length === 1) {
      // Transition from pinch to drag
      if (touchState.current.isPinching) {
        touchState.current.isPinching = false;
        touchState.current.isDragging = true;
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
  };

  const handleMouseDown = (e) => {
    // Right click for panning
    if (e.button === 2) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e) => {
    // Panning Logic (Right Mouse Button)
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      // Update targets
      targetTransform.current.x += dx;
      targetTransform.current.y += dy;
      
      // Instant update for current transform to avoid lag during pan
      currentTransform.current.x += dx;
      currentTransform.current.y += dy;
      
      // Force state update for responsiveness
      setOffset({ x: currentTransform.current.x, y: currentTransform.current.y });
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
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
      } else {
        setHoveredPixel(null);
      }
    }
  };

  return (
    <div className="app-container">
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
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`
          }}
        >
          <svg 
            width={CANVAS_SIZE * PIXEL_SIZE} 
            height={CANVAS_SIZE * PIXEL_SIZE} 
            xmlns="http://www.w3.org/2000/svg"
            style={{ 
              opacity: zoom > 0.8 ? Math.min((zoom - 0.8) * 2.5, 1) : 0, 
              transition: 'opacity 0.2s', 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              zIndex: 3, 
              pointerEvents: 'none' 
            }}
          >
            <defs>
              <pattern 
                id="grid" 
                width={PIXEL_SIZE} 
                height={PIXEL_SIZE} 
                patternUnits="userSpaceOnUse"
              >
                <path 
                  d={`M ${PIXEL_SIZE} 0 L 0 0 0 ${PIXEL_SIZE}`} 
                  fill="none" 
                  stroke="rgba(0,0,0,0.4)" 
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
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
                height: PIXEL_SIZE
              }}
            />
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.293 3.293a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1 0 1.414L9 18.414 3 21l2.586-6 11.707-11.707z"/>
            </svg>
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
    </div>
  );
}

export default App;
