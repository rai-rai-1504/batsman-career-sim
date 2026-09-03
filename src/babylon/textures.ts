import { Scene, DynamicTexture, PBRMaterial, Color3 } from '@babylonjs/core';
import { AvatarPreset } from '../data/avatars';

/**
 * Creates high-detail procedural PBR textures for grass, pitch, wood, crowd, and face decals
 */

export function createGrassTexture(scene: Scene): DynamicTexture {
  const size = 1024;
  const tex = new DynamicTexture('grassTexture', size, scene, false);
  const ctx = tex.getContext() as any;

  // 1. Lush international outfield emerald base
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#236928');
  grad.addColorStop(0.5, '#2B7A31');
  grad.addColorStop(1, '#1E5923');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 2. Alternating lawn-mower cut stripes across the entire outfield
  const stripeWidth = 64;
  const numStripes = size / stripeWidth;
  for (let i = 0; i < numStripes; i++) {
    const isLight = i % 2 === 0;
    ctx.fillStyle = isLight ? 'rgba(67, 160, 71, 0.36)' : 'rgba(27, 94, 32, 0.36)';
    ctx.fillRect(0, i * stripeWidth, size, stripeWidth);

    // Subtle edge sheen between stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, i * stripeWidth, size, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, (i + 1) * stripeWidth - 2, size, 2);
  }

  // 3. Dense grass blades across the entire texture
  for (let i = 0; i < 35000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const bladeLength = 2.5 + Math.random() * 4.5;
    const isHighlight = Math.random() > 0.40;
    const alpha = 0.05 + Math.random() * 0.14;

    ctx.fillStyle = isHighlight
      ? `rgba(165, 214, 167, ${alpha})`
      : `rgba(13, 59, 18, ${alpha})`;
    ctx.fillRect(x, y, 1.5, bladeLength);
  }

  // 4. Fine turf texture grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(139, 195, 74, ${0.04 + Math.random() * 0.08})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  tex.update();
  return tex;
}

export function createPitchTexture(scene: Scene): DynamicTexture {
  const width = 512;
  const height = 2048; // aligned with 3.66m wide x 24m long pitch
  const tex = new DynamicTexture('pitchTexture', { width, height }, scene, false);
  const ctx = tex.getContext() as any;

  // 1. Compacted clay loam base (warm golden-tan with natural clay gradients)
  const baseGrad = ctx.createLinearGradient(0, 0, width, 0);
  baseGrad.addColorStop(0, '#BFA175');
  baseGrad.addColorStop(0.12, '#CBB085');
  baseGrad.addColorStop(0.50, '#D4BC93');
  baseGrad.addColorStop(0.88, '#CBB085');
  baseGrad.addColorStop(1, '#BFA175');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Heavy roller compression sheen along central running track
  ctx.fillStyle = 'rgba(235, 220, 195, 0.15)';
  ctx.fillRect(width * 0.28, 0, width * 0.44, height);

  // 3. Lateral turf roller striping bands
  for (let y = 0; y < height; y += 48) {
    const isBand = Math.floor(y / 48) % 2 === 0;
    if (isBand) {
      ctx.fillStyle = 'rgba(215, 190, 150, 0.08)';
      ctx.fillRect(0, y, width, 48);
    }
  }

  // 4. Good-length delivery bounce zones (worn, drier clay patches around Z ≈ ±2m)
  const midY = height * 0.5;
  for (const bounceY of [midY - 240, midY + 240]) {
    const patchGrad = ctx.createRadialGradient(width * 0.5, bounceY, 10, width * 0.5, bounceY, 140);
    patchGrad.addColorStop(0, 'rgba(175, 145, 100, 0.45)');
    patchGrad.addColorStop(0.6, 'rgba(195, 168, 120, 0.25)');
    patchGrad.addColorStop(1, 'rgba(212, 188, 147, 0)');
    ctx.fillStyle = patchGrad;
    ctx.fillRect(width * 0.1, bounceY - 140, width * 0.8, 280);
  }

  // 5. Crease footmark scuffs & spike marks (striker end and non-striker end)
  // Striker crease region: height * 0.88 - 0.95
  // Non-striker crease region: height * 0.05 - 0.12
  const creaseRegions = [height * 0.09, height * 0.91];
  for (const cy of creaseRegions) {
    // Darker churned dirt patch from bowler spikes & batsman guard taps
    const footmarkGrad = ctx.createRadialGradient(width * 0.5, cy, 15, width * 0.5, cy, 130);
    footmarkGrad.addColorStop(0, 'rgba(125, 95, 60, 0.55)');
    footmarkGrad.addColorStop(0.5, 'rgba(155, 125, 85, 0.35)');
    footmarkGrad.addColorStop(1, 'rgba(200, 175, 135, 0)');
    ctx.fillStyle = footmarkGrad;
    ctx.fillRect(width * 0.15, cy - 110, width * 0.7, 220);

    // Individual spike divot dots
    for (let i = 0; i < 800; i++) {
      const px = width * 0.25 + Math.random() * width * 0.5;
      const py = cy - 80 + Math.random() * 160;
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(90, 65, 40, 0.40)' : 'rgba(230, 210, 180, 0.30)';
      ctx.fillRect(px, py, 2.5, 3);
    }
  }

  // 6. Grass verge fringes along left and right borders of pitch strip
  for (let y = 0; y < height; y += 4) {
    const leftFringe = 16 + Math.sin(y * 0.05) * 8 + Math.random() * 8;
    const rightFringe = 16 + Math.cos(y * 0.05) * 8 + Math.random() * 8;

    ctx.fillStyle = 'rgba(50, 110, 45, 0.45)';
    ctx.fillRect(0, y, leftFringe, 4);
    ctx.fillRect(width - rightFringe, y, rightFringe, 4);

    // Grass blades spilling onto pitch edge
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = 'rgba(65, 135, 55, 0.55)';
      ctx.fillRect(Math.random() * leftFringe * 1.3, y + Math.random() * 4, 1.5, 3);
      ctx.fillRect(width - Math.random() * rightFringe * 1.3, y + Math.random() * 4, 1.5, 3);
    }
  }

  // 7. Micro clay cracks and pebbles
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const isDark = Math.random() > 0.4;
    ctx.fillStyle = isDark ? 'rgba(120, 95, 60, 0.08)' : 'rgba(250, 240, 220, 0.08)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  tex.update();
  return tex;
}

export function createWillowBatTexture(scene: Scene, accentHex: string = '#00D4A5'): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('batTexture', size, scene, false);
  const ctx = tex.getContext() as any;

  // English Willow wood base
  ctx.fillStyle = '#E8CFA6';
  ctx.fillRect(0, 0, size, size);

  // Vertical wood grain lines
  for (let x = 0; x < size; x += 6) {
    const grainAlpha = 0.08 + Math.sin(x * 0.2) * 0.06;
    ctx.fillStyle = `rgba(130, 95, 60, ${grainAlpha})`;
    ctx.fillRect(x, 0, 2, size);
  }

  // Modern colorful brand sticker / decal across center
  ctx.fillStyle = accentHex;
  ctx.fillRect(size * 0.2, size * 0.25, size * 0.6, size * 0.35);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Inter, sans-serif';
  if (ctx.textAlign) ctx.textAlign = 'center';
  ctx.fillText('CRICKET', size * 0.5, size * 0.44);

  tex.update();
  return tex;
}

export function createSeatedCrowdTexture(scene: Scene): DynamicTexture {
  const width = 1024;
  const height = 512;
  const tex = new DynamicTexture('crowdAtlas', { width, height }, scene, false);
  const ctx = tex.getContext() as any;

  // Stadium concrete tiered background
  ctx.fillStyle = '#4A5568';
  ctx.fillRect(0, 0, width, height);

  const colors = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
    '#FFFFFF', '#1E293B', '#F97316', '#06B6D4', '#64748B', '#EAB308'
  ];

  // Draw 8 dense rows of seated animated spectators
  const rows = 8;
  const rowHeight = height / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    // Bench / tier line
    ctx.fillStyle = r % 2 === 0 ? '#2D3748' : '#394252';
    ctx.fillRect(0, y + rowHeight - 6, width, 6);

    // Spectator heads & shirts
    for (let x = 4; x < width - 6; x += 14) {
      const shirtColor = colors[Math.floor(Math.random() * colors.length)];
      const skinColor = Math.random() > 0.5 ? '#E2B897' : '#B88258';

      // Shirt body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(x, y + 14, 11, rowHeight - 16);

      // Head
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(x + 5.5, y + 9, 5, 0, Math.PI * 2);
      ctx.fill();

      // Hair or cap
      if (Math.random() > 0.35) {
        ctx.fillStyle = Math.random() > 0.5 ? shirtColor : '#1E1B18';
        ctx.beginPath();
        ctx.arc(x + 5.5, y + 7, 5, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  tex.uScale = 4;
  tex.vScale = 1;
  tex.update();
  return tex;
}

export function createFaceDecalTexture(scene: Scene, avatar: AvatarPreset): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture(`faceDecal_${avatar.id}`, size, scene, false);
  const ctx = tex.getContext() as any;

  // Base skin tone
  ctx.fillStyle = avatar.skinTone;
  ctx.fillRect(0, 0, size, size);

  // Eyebrows
  ctx.fillStyle = avatar.hairColor;
  ctx.fillRect(55, 80, 50, 10);
  ctx.fillRect(151, 80, 50, 10);

  // Eyes (Sclera + Iris + Pupil + Highlight)
  for (const eyeX of [80, 176]) {
    // Sclera
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX, 108, 16, 0, Math.PI * 2);
    ctx.fill();

    // Iris & Pupil
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(eyeX, 108, 9, 0, Math.PI * 2);
    ctx.fill();

    // Specular eye glint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX + 3, 105, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose shading
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.moveTo(128, 110);
  ctx.lineTo(136, 145);
  ctx.lineTo(120, 145);
  ctx.closePath();
  ctx.fill();

  // Mouth
  ctx.fillStyle = '#993333';
  ctx.beginPath();
  ctx.arc(128, 175, 20, 0.2, Math.PI - 0.2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#662222';
  ctx.stroke();

  // Beard if applicable
  if (avatar.accessory.includes('Beard') || avatar.name.includes('Veteran') || avatar.name.includes('Anchor')) {
    ctx.fillStyle = avatar.hairColor;
    ctx.fillRect(90, 155, 76, 12); // mustache
    ctx.fillRect(75, 185, 106, 45); // chin beard
  }

  // Forehead sweatband if applicable
  if (avatar.accessory.includes('Sweatband') || avatar.name.includes('Prodigy')) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 30, size, 32);
    ctx.fillStyle = '#00D4A5';
    ctx.fillRect(0, 42, size, 8);
  }

  tex.update();
  return tex;
}

export function createJerseyTexture(
  scene: Scene,
  primaryHex: string,
  secondaryHex: string,
  squadNumber: number = 7
): DynamicTexture {
  const size = 1024;
  const tex = new DynamicTexture(`jerseyTex_${primaryHex}_${squadNumber}`, size, scene, false);
  const ctx = tex.getContext() as any;

  // Solid background in team primaryColor (fully replaces original graphic)
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  // Contrasting collar & sleeve trim bands in secondaryColor
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(0, 0, size, 70); // collar trim
  ctx.fillRect(0, 480, size, 50); // chest stripe
  ctx.fillRect(0, size - 70, size, 70); // hem trim

  // Squad Number printed prominently on back/chest
  ctx.font = 'bold 220px Inter, Montserrat, sans-serif';
  ctx.fillStyle = secondaryHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(squadNumber.toString(), size * 0.5, 270);
  ctx.fillText(squadNumber.toString(), size * 0.5, 730);

  tex.update();
  return tex;
}
