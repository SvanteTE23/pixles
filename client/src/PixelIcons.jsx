// Pixelated SVG Icons for Pixles
// Each icon is designed on a small grid for that authentic pixel art feel

export const PixelIcon = ({ name, size = 16, color, className = "" }) => {
  // Use currentColor to inherit from parent's CSS color property
  const iconColor = color || 'currentColor';
  
  const icons = {
    // Shopping cart - 8x8 grid - redesigned to look more like a cart
    cart: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        {/* Handle */}
        <rect x="0" y="1" width="2" height="1" fill={iconColor} />
        {/* Cart body */}
        <rect x="1" y="2" width="6" height="1" fill={iconColor} />
        <rect x="1" y="3" width="6" height="1" fill={iconColor} />
        <rect x="2" y="4" width="5" height="1" fill={iconColor} />
        <rect x="2" y="5" width="4" height="1" fill={iconColor} />
        {/* Wheels */}
        <rect x="2" y="6" width="1" height="1" fill={iconColor} />
        <rect x="5" y="6" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Bomb - 8x8 grid
    bomb: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="4" y="0" width="1" height="1" fill={iconColor} />
        <rect x="5" y="0" width="1" height="1" fill={iconColor} />
        <rect x="3" y="1" width="1" height="1" fill={iconColor} />
        <rect x="2" y="2" width="4" height="1" fill={iconColor} />
        <rect x="1" y="3" width="6" height="1" fill={iconColor} />
        <rect x="1" y="4" width="6" height="1" fill={iconColor} />
        <rect x="1" y="5" width="6" height="1" fill={iconColor} />
        <rect x="2" y="6" width="4" height="1" fill={iconColor} />
        <rect x="3" y="7" width="2" height="1" fill={iconColor} />
        {/* Highlight */}
        <rect x="2" y="3" width="1" height="1" fill="rgba(255,255,255,0.4)" />
      </svg>
    ),

    // Broom/Wipe - 8x8 grid
    broom: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="6" y="0" width="1" height="1" fill={iconColor} />
        <rect x="5" y="1" width="1" height="1" fill={iconColor} />
        <rect x="4" y="2" width="1" height="1" fill={iconColor} />
        <rect x="3" y="3" width="1" height="1" fill={iconColor} />
        <rect x="2" y="4" width="1" height="1" fill={iconColor} />
        <rect x="0" y="5" width="4" height="1" fill={iconColor} />
        <rect x="0" y="6" width="5" height="1" fill={iconColor} />
        <rect x="0" y="7" width="4" height="1" fill={iconColor} />
      </svg>
    ),

    // Sparkle/Glow - 8x8 grid
    sparkle: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="0" width="2" height="1" fill={iconColor} />
        <rect x="3" y="1" width="2" height="1" fill={iconColor} />
        <rect x="0" y="3" width="1" height="2" fill={iconColor} />
        <rect x="1" y="3" width="1" height="2" fill={iconColor} />
        <rect x="2" y="2" width="4" height="4" fill={iconColor} />
        <rect x="6" y="3" width="1" height="2" fill={iconColor} />
        <rect x="7" y="3" width="1" height="2" fill={iconColor} />
        <rect x="3" y="6" width="2" height="1" fill={iconColor} />
        <rect x="3" y="7" width="2" height="1" fill={iconColor} />
        {/* Center highlight */}
        <rect x="3" y="3" width="2" height="2" fill="rgba(255,255,255,0.5)" />
      </svg>
    ),

    // Pencil/Pixel tool - 8x8 grid
    pencil: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="6" y="0" width="1" height="1" fill={iconColor} />
        <rect x="5" y="1" width="2" height="1" fill={iconColor} />
        <rect x="4" y="2" width="2" height="1" fill={iconColor} />
        <rect x="3" y="3" width="2" height="1" fill={iconColor} />
        <rect x="2" y="4" width="2" height="1" fill={iconColor} />
        <rect x="1" y="5" width="2" height="1" fill={iconColor} />
        <rect x="0" y="6" width="2" height="1" fill={iconColor} />
        <rect x="0" y="7" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Brush - 8x8 grid
    brush: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="5" y="0" width="2" height="1" fill={iconColor} />
        <rect x="4" y="1" width="3" height="1" fill={iconColor} />
        <rect x="3" y="2" width="3" height="1" fill={iconColor} />
        <rect x="2" y="3" width="3" height="1" fill={iconColor} />
        <rect x="2" y="4" width="2" height="1" fill={iconColor} />
        <rect x="1" y="5" width="2" height="1" fill={iconColor} />
        <rect x="1" y="6" width="1" height="1" fill={iconColor} />
        <rect x="0" y="7" width="2" height="1" fill={iconColor} />
      </svg>
    ),

    // Line tool - 8x8 grid
    line: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="7" width="1" height="1" fill={iconColor} />
        <rect x="1" y="6" width="1" height="1" fill={iconColor} />
        <rect x="2" y="5" width="1" height="1" fill={iconColor} />
        <rect x="3" y="4" width="1" height="1" fill={iconColor} />
        <rect x="4" y="3" width="1" height="1" fill={iconColor} />
        <rect x="5" y="2" width="1" height="1" fill={iconColor} />
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="7" y="0" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Rectangle - 8x8 grid
    rectangle: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="1" width="8" height="1" fill={iconColor} />
        <rect x="0" y="2" width="1" height="4" fill={iconColor} />
        <rect x="7" y="2" width="1" height="4" fill={iconColor} />
        <rect x="0" y="6" width="8" height="1" fill={iconColor} />
      </svg>
    ),

    // Circle - 8x8 grid
    circle: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="1" height="1" fill={iconColor} />
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="0" y="2" width="1" height="4" fill={iconColor} />
        <rect x="7" y="2" width="1" height="4" fill={iconColor} />
        <rect x="1" y="6" width="1" height="1" fill={iconColor} />
        <rect x="6" y="6" width="1" height="1" fill={iconColor} />
        <rect x="2" y="7" width="4" height="1" fill={iconColor} />
      </svg>
    ),

    // Crown/VIP - 8x8 grid
    crown: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="2" width="1" height="1" fill={iconColor} />
        <rect x="3" y="1" width="2" height="1" fill={iconColor} />
        <rect x="7" y="2" width="1" height="1" fill={iconColor} />
        <rect x="0" y="3" width="1" height="1" fill={iconColor} />
        <rect x="2" y="2" width="1" height="1" fill={iconColor} />
        <rect x="5" y="2" width="1" height="1" fill={iconColor} />
        <rect x="7" y="3" width="1" height="1" fill={iconColor} />
        <rect x="1" y="3" width="6" height="1" fill={iconColor} />
        <rect x="1" y="4" width="6" height="1" fill={iconColor} />
        <rect x="0" y="5" width="8" height="1" fill={iconColor} />
        <rect x="0" y="6" width="8" height="1" fill={iconColor} />
      </svg>
    ),

    // Settings/Gear - simple filled gear
    settings: (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className} fill={iconColor}>
        <rect x="6" y="0" width="4" height="3" />
        <rect x="6" y="13" width="4" height="3" />
        <rect x="0" y="6" width="3" height="4" />
        <rect x="13" y="6" width="3" height="4" />
        <rect x="3" y="3" width="10" height="10" />
        <rect x="5" y="5" width="6" height="6" fill="rgba(255,255,255,0.4)" />
      </svg>
    ),

    // Wrench/Tools - simple tool icon
    wrench: (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className} fill={iconColor}>
        <rect x="2" y="2" width="4" height="2" />
        <rect x="4" y="4" width="2" height="2" />
        <rect x="5" y="5" width="2" height="2" />
        <rect x="6" y="6" width="2" height="2" />
        <rect x="7" y="7" width="2" height="2" />
        <rect x="8" y="8" width="2" height="2" />
        <rect x="9" y="9" width="2" height="2" />
        <rect x="10" y="10" width="4" height="4" />
      </svg>
    ),

    // Cursor/Target - 8x8 grid
    target: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="0" width="2" height="2" fill={iconColor} />
        <rect x="0" y="3" width="2" height="2" fill={iconColor} />
        <rect x="6" y="3" width="2" height="2" fill={iconColor} />
        <rect x="3" y="6" width="2" height="2" fill={iconColor} />
        <rect x="3" y="3" width="2" height="2" fill={iconColor} />
      </svg>
    ),

    // Theater/Animation mask - 8x8 grid
    mask: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="1" y="0" width="6" height="1" fill={iconColor} />
        <rect x="0" y="1" width="8" height="1" fill={iconColor} />
        <rect x="0" y="2" width="1" height="1" fill={iconColor} />
        <rect x="2" y="2" width="1" height="1" fill={iconColor} />
        <rect x="5" y="2" width="1" height="1" fill={iconColor} />
        <rect x="7" y="2" width="1" height="1" fill={iconColor} />
        <rect x="0" y="3" width="8" height="1" fill={iconColor} />
        <rect x="0" y="4" width="1" height="1" fill={iconColor} />
        <rect x="7" y="4" width="1" height="1" fill={iconColor} />
        <rect x="0" y="5" width="1" height="1" fill={iconColor} />
        <rect x="2" y="5" width="4" height="1" fill={iconColor} />
        <rect x="7" y="5" width="1" height="1" fill={iconColor} />
        <rect x="1" y="6" width="6" height="1" fill={iconColor} />
        <rect x="2" y="7" width="4" height="1" fill={iconColor} />
      </svg>
    ),

    // Lock - 8x8 grid
    lock: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="1" height="1" fill={iconColor} />
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="1" y="2" width="1" height="1" fill={iconColor} />
        <rect x="6" y="2" width="1" height="1" fill={iconColor} />
        <rect x="0" y="3" width="8" height="1" fill={iconColor} />
        <rect x="0" y="4" width="8" height="1" fill={iconColor} />
        <rect x="0" y="5" width="8" height="1" fill={iconColor} />
        <rect x="0" y="6" width="8" height="1" fill={iconColor} />
        <rect x="0" y="7" width="8" height="1" fill={iconColor} />
        {/* Keyhole */}
        <rect x="3" y="4" width="2" height="1" fill="rgba(0,0,0,0.4)" />
        <rect x="3" y="5" width="2" height="2" fill="rgba(0,0,0,0.4)" />
      </svg>
    ),

    // Pixel/Square - 8x8 grid
    pixel: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="1" y="1" width="6" height="6" fill={iconColor} />
      </svg>
    ),

    // Close/X - 8x8 grid
    close: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="0" width="2" height="1" fill={iconColor} />
        <rect x="6" y="0" width="2" height="1" fill={iconColor} />
        <rect x="1" y="1" width="2" height="1" fill={iconColor} />
        <rect x="5" y="1" width="2" height="1" fill={iconColor} />
        <rect x="2" y="2" width="2" height="1" fill={iconColor} />
        <rect x="4" y="2" width="2" height="1" fill={iconColor} />
        <rect x="3" y="3" width="2" height="2" fill={iconColor} />
        <rect x="2" y="5" width="2" height="1" fill={iconColor} />
        <rect x="4" y="5" width="2" height="1" fill={iconColor} />
        <rect x="1" y="6" width="2" height="1" fill={iconColor} />
        <rect x="5" y="6" width="2" height="1" fill={iconColor} />
        <rect x="0" y="7" width="2" height="1" fill={iconColor} />
        <rect x="6" y="7" width="2" height="1" fill={iconColor} />
      </svg>
    ),

    // Check/Checkmark - 8x8 grid
    check: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="5" y="2" width="1" height="1" fill={iconColor} />
        <rect x="4" y="3" width="1" height="1" fill={iconColor} />
        <rect x="3" y="4" width="1" height="1" fill={iconColor} />
        <rect x="2" y="5" width="1" height="1" fill={iconColor} />
        <rect x="1" y="4" width="1" height="1" fill={iconColor} />
        <rect x="0" y="3" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Plus - 8x8 grid
    plus: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="1" width="2" height="2" fill={iconColor} />
        <rect x="1" y="3" width="6" height="2" fill={iconColor} />
        <rect x="3" y="5" width="2" height="2" fill={iconColor} />
      </svg>
    ),

    // Eyedropper - 8x8 grid
    eyedropper: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="5" y="0" width="2" height="1" fill={iconColor} />
        <rect x="6" y="1" width="2" height="1" fill={iconColor} />
        <rect x="4" y="1" width="2" height="1" fill={iconColor} />
        <rect x="5" y="2" width="2" height="1" fill={iconColor} />
        <rect x="4" y="3" width="2" height="1" fill={iconColor} />
        <rect x="3" y="4" width="2" height="1" fill={iconColor} />
        <rect x="2" y="5" width="2" height="1" fill={iconColor} />
        <rect x="1" y="6" width="2" height="1" fill={iconColor} />
        <rect x="0" y="7" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Fire - 8x8 grid
    fire: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="0" width="2" height="1" fill={iconColor} />
        <rect x="4" y="1" width="2" height="1" fill={iconColor} />
        <rect x="2" y="1" width="1" height="1" fill={iconColor} />
        <rect x="1" y="2" width="2" height="1" fill={iconColor} />
        <rect x="4" y="2" width="3" height="1" fill={iconColor} />
        <rect x="1" y="3" width="6" height="1" fill={iconColor} />
        <rect x="1" y="4" width="6" height="1" fill={iconColor} />
        <rect x="1" y="5" width="6" height="1" fill={iconColor} />
        <rect x="2" y="6" width="4" height="1" fill={iconColor} />
        <rect x="3" y="7" width="2" height="1" fill={iconColor} />
      </svg>
    ),

    // Star - 8x8 grid
    star: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="0" width="2" height="1" fill={iconColor} />
        <rect x="3" y="1" width="2" height="1" fill={iconColor} />
        <rect x="0" y="2" width="8" height="1" fill={iconColor} />
        <rect x="1" y="3" width="6" height="1" fill={iconColor} />
        <rect x="2" y="4" width="4" height="1" fill={iconColor} />
        <rect x="1" y="5" width="2" height="1" fill={iconColor} />
        <rect x="5" y="5" width="2" height="1" fill={iconColor} />
        <rect x="0" y="6" width="2" height="1" fill={iconColor} />
        <rect x="6" y="6" width="2" height="1" fill={iconColor} />
      </svg>
    ),

    // Coin/Money - 8x8 grid
    coin: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="1" height="1" fill={iconColor} />
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="0" y="2" width="1" height="4" fill={iconColor} />
        <rect x="7" y="2" width="1" height="4" fill={iconColor} />
        <rect x="1" y="6" width="1" height="1" fill={iconColor} />
        <rect x="6" y="6" width="1" height="1" fill={iconColor} />
        <rect x="2" y="7" width="4" height="1" fill={iconColor} />
        {/* S symbol */}
        <rect x="3" y="2" width="2" height="1" fill={iconColor} />
        <rect x="2" y="3" width="2" height="1" fill={iconColor} />
        <rect x="3" y="4" width="2" height="1" fill={iconColor} />
        <rect x="4" y="5" width="2" height="1" fill={iconColor} />
        <rect x="3" y="5" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Secure/Shield with lock - 8x8 grid
    secure: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="1" y="0" width="6" height="1" fill={iconColor} />
        <rect x="0" y="1" width="8" height="1" fill={iconColor} />
        <rect x="0" y="2" width="8" height="1" fill={iconColor} />
        <rect x="0" y="3" width="8" height="1" fill={iconColor} />
        <rect x="1" y="4" width="6" height="1" fill={iconColor} />
        <rect x="1" y="5" width="6" height="1" fill={iconColor} />
        <rect x="2" y="6" width="4" height="1" fill={iconColor} />
        <rect x="3" y="7" width="2" height="1" fill={iconColor} />
        {/* Lock icon inside */}
        <rect x="3" y="2" width="2" height="1" fill="rgba(255,255,255,0.5)" />
        <rect x="3" y="3" width="2" height="2" fill="rgba(255,255,255,0.5)" />
      </svg>
    ),

    // Google G logo - 8x8 grid (simplified, multicolor)
    google: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill="#4285F4" />
        <rect x="1" y="1" width="1" height="1" fill="#EA4335" />
        <rect x="6" y="1" width="1" height="1" fill="#4285F4" />
        <rect x="0" y="2" width="1" height="2" fill="#EA4335" />
        <rect x="0" y="4" width="1" height="2" fill="#FBBC05" />
        <rect x="7" y="2" width="1" height="2" fill="#4285F4" />
        <rect x="1" y="6" width="1" height="1" fill="#FBBC05" />
        <rect x="6" y="6" width="1" height="1" fill="#34A853" />
        <rect x="2" y="7" width="4" height="1" fill="#34A853" />
        <rect x="4" y="3" width="3" height="1" fill="#4285F4" />
        <rect x="4" y="4" width="1" height="1" fill="#4285F4" />
      </svg>
    ),

    // User/Account - 8x8 grid
    user: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="6" height="1" fill={iconColor} />
        <rect x="1" y="2" width="6" height="1" fill={iconColor} />
        <rect x="2" y="3" width="4" height="1" fill={iconColor} />
        <rect x="3" y="4" width="2" height="1" fill={iconColor} />
        <rect x="1" y="5" width="6" height="1" fill={iconColor} />
        <rect x="0" y="6" width="8" height="1" fill={iconColor} />
        <rect x="0" y="7" width="8" height="1" fill={iconColor} />
      </svg>
    ),

    // Logout/Exit - 8x8 grid
    logout: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="0" width="1" height="8" fill={iconColor} />
        <rect x="1" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="7" width="4" height="1" fill={iconColor} />
        <rect x="3" y="3" width="4" height="1" fill={iconColor} />
        <rect x="3" y="4" width="4" height="1" fill={iconColor} />
        <rect x="5" y="2" width="1" height="1" fill={iconColor} />
        <rect x="6" y="2" width="1" height="2" fill={iconColor} />
        <rect x="6" y="4" width="1" height="2" fill={iconColor} />
        <rect x="5" y="5" width="1" height="1" fill={iconColor} />
      </svg>
    ),

    // Menu/Hamburger - 8x8 grid
    menu: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="1" width="8" height="1" fill={iconColor} />
        <rect x="0" y="3" width="8" height="1" fill={iconColor} />
        <rect x="0" y="5" width="8" height="1" fill={iconColor} />
      </svg>
    ),

    // Question mark - 8x8 grid
    question: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="2" height="1" fill={iconColor} />
        <rect x="5" y="1" width="2" height="1" fill={iconColor} />
        <rect x="5" y="2" width="2" height="1" fill={iconColor} />
        <rect x="4" y="3" width="2" height="1" fill={iconColor} />
        <rect x="3" y="4" width="2" height="1" fill={iconColor} />
        <rect x="3" y="6" width="2" height="2" fill={iconColor} />
      </svg>
    ),

    // Rules/Document - 8x8 grid
    rules: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="1" y="0" width="5" height="1" fill={iconColor} />
        <rect x="6" y="0" width="1" height="1" fill={iconColor} />
        <rect x="1" y="1" width="1" height="6" fill={iconColor} />
        <rect x="6" y="1" width="1" height="6" fill={iconColor} />
        <rect x="1" y="7" width="6" height="1" fill={iconColor} />
        <rect x="2" y="2" width="4" height="1" fill={iconColor} />
        <rect x="2" y="4" width="3" height="1" fill={iconColor} />
        <rect x="2" y="5" width="4" height="1" fill={iconColor} />
      </svg>
    ),

    // Chart/Stats - 8x8 grid
    chart: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="0" y="7" width="8" height="1" fill={iconColor} />
        <rect x="0" y="0" width="1" height="7" fill={iconColor} />
        <rect x="2" y="5" width="1" height="2" fill={iconColor} />
        <rect x="4" y="3" width="1" height="4" fill={iconColor} />
        <rect x="6" y="1" width="1" height="6" fill={iconColor} />
      </svg>
    ),

    // Info/i - 8x8 grid
    info: (
      <svg width={size} height={size} viewBox="0 0 8 8" className={className} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="4" height="1" fill={iconColor} />
        <rect x="1" y="1" width="1" height="1" fill={iconColor} />
        <rect x="6" y="1" width="1" height="1" fill={iconColor} />
        <rect x="0" y="2" width="1" height="4" fill={iconColor} />
        <rect x="7" y="2" width="1" height="4" fill={iconColor} />
        <rect x="1" y="6" width="1" height="1" fill={iconColor} />
        <rect x="6" y="6" width="1" height="1" fill={iconColor} />
        <rect x="2" y="7" width="4" height="1" fill={iconColor} />
        {/* i symbol */}
        <rect x="3" y="2" width="2" height="1" fill={iconColor} />
        <rect x="3" y="4" width="2" height="2" fill={iconColor} />
      </svg>
    ),
  };

  return icons[name] || null;
};

export default PixelIcon;
