/**
 * Graphic Overlay Engine for ChromaFilm Color Science Studio
 * Simulates pre-exposed pattern on film (RETOCOLOR series: Bling-Bling, Cat'cha, Emoticon)
 * Supports Additive (Linear Dodge), Screen, and Color-Dodge blend modes.
 */

export type GraphicOverlayType = 'none' | 'bling-bling' | 'catcha' | 'emoticon' | 'custom';
export type OverlayBlendMode = 'screen' | 'lighter' | 'color-dodge' | 'source-over';

export interface GraphicOverlayOptions {
  type: GraphicOverlayType;
  blendMode: OverlayBlendMode;
  opacity: number; // 0.0 to 1.0
  seed: number; // For layout randomization
  colorTint?: 'authentic' | 'white' | 'pastel-warm' | 'pastel-cool';
  customImage?: HTMLImageElement | HTMLCanvasElement | null;
}

// Pseudo-random generator with seed
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Draws a 4-point glittering star sparkle with soft glow.
 */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Soft ambient glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
  glow.addColorStop(0, color);
  glow.addColorStop(0.4, color.replace(/[\d.]+\)$/g, '0.4)'));
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Core 4-point diamond star
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(0, 0, size * 0.18, 0);
  ctx.lineTo(size, 0);
  ctx.quadraticCurveTo(0, 0, 0, size * 0.18);
  ctx.lineTo(0, size);
  ctx.quadraticCurveTo(0, 0, -size * 0.18, 0);
  ctx.lineTo(-size, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size * 0.18);
  ctx.closePath();
  ctx.fill();

  // Cross hair diagonal thin spikes
  ctx.beginPath();
  const subSize = size * 0.45;
  ctx.moveTo(0, -subSize);
  ctx.quadraticCurveTo(0, 0, subSize * 0.15, 0);
  ctx.lineTo(subSize, 0);
  ctx.quadraticCurveTo(0, 0, 0, subSize * 0.15);
  ctx.lineTo(0, subSize);
  ctx.quadraticCurveTo(0, 0, -subSize * 0.15, 0);
  ctx.lineTo(-subSize, 0);
  ctx.quadraticCurveTo(0, 0, 0, -subSize * 0.15);
  ctx.closePath();
  ctx.fill();

  // Center bright highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, size * 0.12), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a stylized Y2K pixel or smooth heart.
 */
function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  hollow = false,
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.beginPath();
  const d = size;
  ctx.moveTo(0, d * 0.35);
  ctx.bezierCurveTo(-d * 0.6, -d * 0.3, -d * 0.8, d * 0.5, 0, d);
  ctx.bezierCurveTo(d * 0.8, d * 0.5, d * 0.6, -d * 0.3, 0, d * 0.35);

  if (hollow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws an authentic cute cat paw print.
 */
function drawCatPaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = color;

  // Main center pad (rounded bean shape)
  ctx.beginPath();
  ctx.ellipse(0, size * 0.2, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 toe pads
  const toeOffsets = [
    { dx: -size * 0.42, dy: -size * 0.22, r: size * 0.17 },
    { dx: -size * 0.16, dy: -size * 0.42, r: size * 0.19 },
    { dx: size * 0.16, dy: -size * 0.42, r: size * 0.19 },
    { dx: size * 0.42, dy: -size * 0.22, r: size * 0.17 },
  ];

  for (const t of toeOffsets) {
    ctx.beginPath();
    ctx.arc(t.dx, t.dy, t.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a doodle cat outline face.
 */
function drawDoodleCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head outline with ears
  ctx.beginPath();
  // Left ear
  ctx.moveTo(-size * 0.45, size * 0.1);
  ctx.lineTo(-size * 0.55, -size * 0.45);
  ctx.lineTo(-size * 0.15, -size * 0.35);
  // Top head
  ctx.quadraticCurveTo(0, -size * 0.38, size * 0.15, -size * 0.35);
  // Right ear
  ctx.lineTo(size * 0.55, -size * 0.45);
  ctx.lineTo(size * 0.45, size * 0.1);
  // Bottom chin
  ctx.quadraticCurveTo(0, size * 0.6, -size * 0.45, size * 0.1);
  ctx.stroke();

  // Eyes (simple happy arcs or dots)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.05, size * 0.06, 0, Math.PI * 2);
  ctx.arc(size * 0.2, -size * 0.05, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Nose and mouth
  ctx.beginPath();
  ctx.moveTo(0, size * 0.08);
  ctx.lineTo(-size * 0.08, size * 0.18);
  ctx.moveTo(0, size * 0.08);
  ctx.lineTo(size * 0.08, size * 0.18);
  ctx.stroke();

  // Whiskers
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, size * 0.1);
  ctx.lineTo(-size * 0.65, size * 0.05);
  ctx.moveTo(-size * 0.3, size * 0.2);
  ctx.lineTo(-size * 0.6, size * 0.25);

  ctx.moveTo(size * 0.3, size * 0.1);
  ctx.lineTo(size * 0.65, size * 0.05);
  ctx.moveTo(size * 0.3, size * 0.2);
  ctx.lineTo(size * 0.6, size * 0.25);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws stylized Japanese text or kaomoji badge.
 */
function drawKaomoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  color: string,
  subText?: string,
  hasBox = true
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.font = `bold ${fontSize}px "JetBrains Mono", "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const padX = fontSize * 0.5;
  const padY = fontSize * 0.35;
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;

  if (hasBox) {
    // Semi-translucent pill container
    ctx.fillStyle = color.replace(/[\d.]+\)$/g, '0.15)');
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Text with drop glow
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.fillText(text, 0, subText ? -fontSize * 0.15 : 0);

  if (subText) {
    ctx.font = `600 ${fontSize * 0.55}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(subText, 0, fontSize * 0.65);
  }

  ctx.restore();
}

/**
 * Procedurally generates the RETOCOLOR Bling-Bling 400 Graphic Overlay.
 */
export function renderBlingBlingOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 42,
  tint: GraphicOverlayOptions['colorTint'] = 'authentic'
) {
  const rand = pseudoRandom(seed);
  const minDim = Math.min(w, h);
  const scale = minDim / 600;

  const colors =
    tint === 'white'
      ? ['rgba(255, 255, 255, 0.95)', 'rgba(240, 248, 255, 0.85)']
      : [
          'rgba(255, 235, 140, 0.92)', // Golden star
          'rgba(255, 140, 210, 0.90)', // Hot pink Y2K
          'rgba(180, 240, 255, 0.90)', // Diamond cyan
          'rgba(255, 255, 255, 0.95)', // Pure sparkle
          'rgba(245, 180, 255, 0.88)', // Lavender
        ];

  // 1. Scattered sparkling 4-point stars across borders & corners
  const sparkleCount = Math.floor(16 + rand() * 8);
  for (let i = 0; i < sparkleCount; i++) {
    // Prefer edges, corners, and rule-of-thirds
    let x = rand() * w;
    let y = rand() * h;
    // Bias away from dead center to frame subject
    if (Math.abs(x - w / 2) < w * 0.2 && Math.abs(y - h / 2) < h * 0.2) {
      if (rand() > 0.5) x = x < w / 2 ? x * 0.6 : w - (w - x) * 0.6;
      else y = y < h / 2 ? y * 0.6 : h - (h - y) * 0.6;
    }

    const size = (14 + rand() * 24) * scale;
    const rot = rand() * Math.PI;
    const col = colors[Math.floor(rand() * colors.length)];
    drawSparkle(ctx, x, y, size, col, rot);
  }

  // 2. Holographic floating hearts
  const heartCount = Math.floor(6 + rand() * 4);
  for (let i = 0; i < heartCount; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = (12 + rand() * 18) * scale;
    const rot = (rand() - 0.5) * 0.6;
    const col = colors[Math.floor(rand() * colors.length)];
    const isHollow = rand() > 0.4;
    drawHeart(ctx, x, y, size, col, isHollow, rot);
  }

  // 3. Subtle signature Y2K Bling-Bling logo watermark in one corner
  const cornerX = w - 85 * scale;
  const cornerY = h - 35 * scale;
  ctx.save();
  ctx.font = `bold ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 240, 180, 0.85)';
  ctx.shadowColor = 'rgba(255, 180, 220, 0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText('✦ Bling-Bling 400', cornerX, cornerY);
  ctx.restore();
}

/**
 * Procedurally generates the RETOCOLOR Cat'cha 400 Graphic Overlay.
 */
export function renderCatchaOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 88,
  tint: GraphicOverlayOptions['colorTint'] = 'authentic'
) {
  const rand = pseudoRandom(seed);
  const minDim = Math.min(w, h);
  const scale = minDim / 600;

  const colors =
    tint === 'white'
      ? ['rgba(255, 255, 255, 0.95)', 'rgba(235, 245, 255, 0.85)']
      : [
          'rgba(90, 225, 255, 0.92)', // Cyan turquoise
          'rgba(255, 225, 120, 0.90)', // Soft pastel lemon
          'rgba(255, 160, 180, 0.88)', // Kitty pink
          'rgba(255, 255, 255, 0.95)', // Chalk white
        ];

  // 1. Trails of walking cat paws across the frame
  const pawCount = Math.floor(10 + rand() * 6);
  let pawX = (0.1 + rand() * 0.2) * w;
  let pawY = (0.75 + rand() * 0.15) * h;
  let angle = -0.4 + (rand() - 0.5) * 0.4;

  for (let i = 0; i < pawCount; i++) {
    const size = (14 + rand() * 10) * scale;
    const col = colors[Math.floor(rand() * colors.length)];
    drawCatPaw(ctx, pawX, pawY, size, col, angle + (rand() - 0.5) * 0.3);

    // Step forward like walking cat
    pawX += Math.cos(angle) * (38 + rand() * 20) * scale;
    pawY += Math.sin(angle) * (38 + rand() * 20) * scale;

    // Bounce if near edges
    if (pawX > w * 0.9 || pawX < w * 0.05) angle = Math.PI - angle;
    if (pawY > h * 0.9 || pawY < h * 0.05) angle = -angle;
  }

  // 2. Doodle Cats popping out from sides
  const catCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < catCount; i++) {
    const side = rand() > 0.5 ? 'left' : 'right';
    const x = side === 'left' ? 45 * scale : w - 45 * scale;
    const y = (0.2 + rand() * 0.5) * h;
    const size = (32 + rand() * 14) * scale;
    const rot = side === 'left' ? 0.3 : -0.3;
    const col = colors[Math.floor(rand() * colors.length)];
    drawDoodleCat(ctx, x, y, size, col, rot);
  }

  // 3. Cute "meow~" speech text
  const meowCount = 2;
  for (let i = 0; i < meowCount; i++) {
    const x = (0.15 + i * 0.65) * w;
    const y = (0.12 + rand() * 0.25) * h;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.3);
    ctx.font = `italic bold ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillText('meow~ 🐾', 0, 0);
    ctx.restore();
  }

  // Signature
  const cornerX = w - 85 * scale;
  const cornerY = h - 35 * scale;
  ctx.save();
  ctx.font = `bold ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(90, 225, 255, 0.88)';
  ctx.fillText("cat'cha 400 🐾", cornerX, cornerY);
  ctx.restore();
}

/**
 * Procedurally generates the RETOCOLOR Emoticon 400 Graphic Overlay.
 */
export function renderEmoticonOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 99,
  tint: GraphicOverlayOptions['colorTint'] = 'authentic'
) {
  const rand = pseudoRandom(seed);
  const minDim = Math.min(w, h);
  const scale = minDim / 600;

  const kaomojis = [
    { text: '(✿◠‿◠)', sub: 'kawaii' },
    { text: '(｡♥‿♥｡)', sub: 'daisuki' },
    { text: '(*^▽^*)', sub: 'happy' },
    { text: '(>_<)', sub: 'eek!' },
    { text: '(＾▽＾)', sub: 'smile' },
    { text: 'かわいい', sub: '' },
    { text: '顔文字', sub: 'kaomoji' },
  ];

  const colors =
    tint === 'white'
      ? ['rgba(255, 255, 255, 0.95)', 'rgba(240, 245, 255, 0.85)']
      : [
          'rgba(255, 105, 135, 0.92)', // Kawaii coral pink
          'rgba(255, 215, 60, 0.92)',  // Bright yellow
          'rgba(90, 215, 140, 0.90)',  // Pastel green
          'rgba(120, 190, 255, 0.90)', // Sky blue
          'rgba(255, 255, 255, 0.95)', // White
        ];

  // 1. Scattered Kaomoji sticker badges in corners & borders
  const badgeCount = 5;
  const pickedIndices = [0, 1, 2, 4, 5];

  const positions = [
    { x: w * 0.18, y: h * 0.15 },
    { x: w * 0.82, y: h * 0.18 },
    { x: w * 0.16, y: h * 0.82 },
    { x: w * 0.80, y: h * 0.80 },
    { x: w * 0.50, y: h * 0.90 },
  ];

  for (let i = 0; i < badgeCount; i++) {
    const item = kaomojis[pickedIndices[i % pickedIndices.length]];
    const pos = positions[i];
    const col = colors[i % colors.length];
    const fontSize = Math.round((14 + rand() * 4) * scale);
    drawKaomoji(ctx, pos.x, pos.y, item.text, fontSize, col, item.sub || undefined, true);
  }

  // 2. Playful micro-emoticons & tiny hearts scattered around
  const decoCount = Math.floor(10 + rand() * 6);
  for (let i = 0; i < decoCount; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = (8 + rand() * 10) * scale;
    const col = colors[Math.floor(rand() * colors.length)];

    if (rand() > 0.5) {
      drawHeart(ctx, x, y, size, col, false, (rand() - 0.5) * 0.4);
    } else {
      drawSparkle(ctx, x, y, size, col, rand() * Math.PI);
    }
  }

  // Signature
  const cornerX = w - 85 * scale;
  const cornerY = h - 35 * scale;
  ctx.save();
  ctx.font = `bold ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 105, 135, 0.90)';
  ctx.fillText('EMOTICON 400 (◕‿◕)', cornerX, cornerY);
  ctx.restore();
}

/**
 * Applies Graphic Overlay layer onto target canvas using specified blend mode.
 */
export function applyGraphicOverlay(
  targetCanvas: HTMLCanvasElement,
  options: GraphicOverlayOptions
) {
  if (options.type === 'none' || options.opacity <= 0.001) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return;

  // Create overlay layer on dedicated offscreen canvas
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  const overlayCtx = overlayCanvas.getContext('2d');
  if (!overlayCtx) return;

  // Render procedural pattern according to type
  switch (options.type) {
    case 'bling-bling':
      renderBlingBlingOverlay(overlayCtx, w, h, options.seed, options.colorTint);
      break;
    case 'catcha':
      renderCatchaOverlay(overlayCtx, w, h, options.seed, options.colorTint);
      break;
    case 'emoticon':
      renderEmoticonOverlay(overlayCtx, w, h, options.seed, options.colorTint);
      break;
    case 'custom':
      if (options.customImage) {
        overlayCtx.drawImage(options.customImage, 0, 0, w, h);
      }
      break;
  }

  // Composite onto target with user selected blend mode (Screen / Additive)
  targetCtx.save();
  targetCtx.globalAlpha = Math.max(0, Math.min(1, options.opacity));
  targetCtx.globalCompositeOperation = options.blendMode;
  targetCtx.drawImage(overlayCanvas, 0, 0);
  targetCtx.restore();
}
