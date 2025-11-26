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

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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
        const t = 0.1; 
        
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
      grid.forEach((row, y) => {
        row.forEach((color, x) => {
          ctx.fillStyle = color;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        });
      });
    });

    // Handle updates
    socket.on('pixel_update', ({ x, y, color }) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);

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

  const handleCanvasClick = (e) => {
    // Only allow left click for painting
    if (e.button !== 0) return;
    
    // If we were dragging (panning), don't paint
    if (isDragging.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      socketRef.current.emit('place_pixel', { x, y, color: selectedColor });
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
    
    const scaleAmount = -e.deltaY * 0.002;
    const newZoom = Math.min(Math.max(0.1, currentTarget.zoom + scaleAmount), 10);

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
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu
      >
        <div 
          className="canvas-wrapper"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * PIXEL_SIZE}
            height={CANVAS_SIZE * PIXEL_SIZE}
            onClick={handleCanvasClick}
            className="pixel-canvas"
          />
          <div 
            className="grid-overlay" 
            style={{ opacity: zoom > 1.5 ? 0.5 : 0 }}
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
            <button
              key={index}
              className={`color-preset ${activePaletteIndex === index ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setSelectedColor(color);
                setActivePaletteIndex(index);
              }}
            />
          ))}
        </div>
        <div className="color-picker-wrapper">
          <input 
            type="color" 
            value={selectedColor} 
            onChange={(e) => setSelectedColor(e.target.value)} 
            className="color-picker"
            title="Choose custom color"
          />
          <button 
            className="add-color-btn"
            onClick={() => {
              const newPalette = [...palette];
              newPalette[activePaletteIndex] = selectedColor;
              setPalette(newPalette);
            }}
            title="Replace selected color"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
