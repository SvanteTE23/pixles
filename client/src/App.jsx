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
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [animatingPixels, setAnimatingPixels] = useState([]);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Fit to screen on load
    const fitZoom = Math.min(
      window.innerWidth / (CANVAS_SIZE * PIXEL_SIZE),
      window.innerHeight / (CANVAS_SIZE * PIXEL_SIZE)
    ) * 0.9;
    setZoom(fitZoom);
    
    // Center the canvas initially
    const startX = (window.innerWidth - CANVAS_SIZE * PIXEL_SIZE * fitZoom) / 2;
    const startY = (window.innerHeight - CANVAS_SIZE * PIXEL_SIZE * fitZoom) / 2;
    setOffset({ x: startX, y: startY });

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
    // Only click if we didn't drag significantly
    if (isDragging.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate click position relative to the canvas, accounting for zoom
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

    const scaleAmount = -e.deltaY * 0.002;
    const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 10);

    // Zoom towards cursor:
    // Calculate new offset so that the point under cursor remains under cursor
    // newOffset = mousePos - (mousePos - oldOffset) * (newZoom / oldZoom)
    const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom);

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e) => {
    isDragging.current = false;
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    // Panning Logic
    if (e.buttons === 1) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
      // Simple threshold to distinguish click from drag
      if (Math.abs(newX - offset.x) > 5 || Math.abs(newY - offset.y) > 5) {
        isDragging.current = true;
      }
      
      setOffset({ x: newX, y: newY });
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
        onMouseMove={handleMouseMove}
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
