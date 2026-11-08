import * as THREE from 'three';
import { FaceExpressionId, UniformPresetId } from '../types/character';

function configureColorTexture(tex: THREE.CanvasTexture, maxAnisotropy: number): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createFaceTexture(
  skinTone: string,
  expression: FaceExpressionId,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base skin tone
  ctx.fillStyle = skinTone;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle cheek blush
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.beginPath();
  ctx.ellipse(145, 305, 32, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(367, 305, 32, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#18181B';
  ctx.fillStyle = '#18181B';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Eyebrows
  ctx.lineWidth = 12;
  if (expression === 'semangat') {
    ctx.beginPath();
    ctx.moveTo(145, 185);
    ctx.lineTo(210, 202);
    ctx.moveTo(367, 185);
    ctx.lineTo(302, 202);
    ctx.stroke();
  } else if (expression === 'kaget') {
    ctx.beginPath();
    ctx.arc(178, 180, 32, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(334, 180, 32, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(145, 195);
    ctx.quadraticCurveTo(178, 182, 210, 194);
    ctx.moveTo(302, 194);
    ctx.quadraticCurveTo(334, 182, 367, 195);
    ctx.stroke();
  }

  // Eyes (Classic Roblox pill-oval eyes with crisp white catchlights)
  const drawRobloxEyes = (yOffset = 0, scaleY = 1) => {
    ctx.fillStyle = '#141417';
    ctx.beginPath();
    ctx.ellipse(180, 245 + yOffset, 22, 30 * scaleY, 0, 0, Math.PI * 2);
    ctx.ellipse(332, 245 + yOffset, 22, 30 * scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    // White eye shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(172, 232 + yOffset, 7, 0, Math.PI * 2);
    ctx.arc(324, 232 + yOffset, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(187, 255 + yOffset, 3.5, 0, Math.PI * 2);
    ctx.arc(339, 255 + yOffset, 3.5, 0, Math.PI * 2);
    ctx.fill();
  };

  drawRobloxEyes(0, expression === 'fokus' ? 0.82 : 1);

  // Glasses overlay if expression === 'kacamata'
  if (expression === 'kacamata') {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 11;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.roundRect(126, 206, 108, 76, 14);
    ctx.roundRect(278, 206, 108, 76, 14);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(234, 238);
    ctx.lineTo(278, 238);
    ctx.stroke();
  }

  // Mouth
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 12;

  if (expression === 'ceria' || expression === 'kacamata') {
    // Classic Roblox big D-smile with teeth
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.arc(256, 320, 52, 0.08 * Math.PI, 0.92 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White teeth top bar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.rect(210, 322, 92, 16);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#F87171';
    ctx.beginPath();
    ctx.ellipse(256, 358, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === 'semangat') {
    // Determined confident grin
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(198, 320, 116, 38, 16);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(204, 339);
    ctx.lineTo(308, 339);
    ctx.lineWidth = 5;
    ctx.stroke();
  } else if (expression === 'fokus') {
    // Focused serious slight smile
    ctx.beginPath();
    ctx.moveTo(215, 336);
    ctx.quadraticCurveTo(256, 352, 297, 330);
    ctx.stroke();
  } else if (expression === 'kaget') {
    // Surprised 'O' mouth
    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath();
    ctx.ellipse(256, 342, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

function drawTutWuriBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer Pentagon Shield (Maroon/Red SD)
  ctx.fillStyle = '#991B1B';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner Gold Star / Torch motif
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(0, -2, size * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.36)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SD', 0, 2);

  ctx.restore();
}

export function createUniformFrontTexture(
  uniform: UniformPresetId,
  studentName: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const shortName = (studentName || 'BUDI S.').toUpperCase().slice(0, 12);

  if (uniform === 'merah_putih') {
    // Crisp White SD Shirt
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle fabric shading on sides
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(148, 163, 184, 0.22)');
    grad.addColorStop(0.15, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(148, 163, 184, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Center button placket
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(236, 50, 40, 400);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.strokeRect(236, 50, 40, 400);

    // Buttons
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    [120, 200, 280, 360].forEach((by) => {
      ctx.beginPath();
      ctx.arc(256, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Left Chest Pocket (viewer's right: x=310..430)
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(310, 155);
    ctx.lineTo(430, 155);
    ctx.lineTo(430, 265);
    ctx.lineTo(370, 288);
    ctx.lineTo(310, 265);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tut Wuri Handayani SD Emblem on Pocket
    drawTutWuriBadge(ctx, 370, 222, 42);

    // Embroidered Name Tag on Right Chest (viewer's left: x=75..205)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.fillRect(72, 165, 136, 36);
    ctx.strokeRect(72, 165, 136, 36);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortName, 140, 183);

    // Black Belt with Gold SD Buckle at bottom
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 444, 512, 68);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(216, 448, 80, 58);
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SD', 256, 478);
  } else if (uniform === 'pramuka') {
    // Pramuka Cokelat Muda Shirt
    ctx.fillStyle = '#D6B588';
    ctx.fillRect(0, 0, 512, 512);

    // Placket
    ctx.fillStyle = '#C6A16E';
    ctx.fillRect(236, 50, 40, 400);

    // Two Scout Pockets (Cokelat Tua flaps)
    const drawScoutPocket = (px: number) => {
      ctx.fillStyle = '#C9A675';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 4;
      ctx.fillRect(px, 170, 124, 115);
      ctx.strokeRect(px, 170, 124, 115);
      // Dark brown flap
      ctx.fillStyle = '#5C3A21';
      ctx.fillRect(px - 2, 166, 128, 34);
      // Gold button
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(px + 62, 186, 7, 0, Math.PI * 2);
      ctx.fill();
    };
    drawScoutPocket(76);
    drawScoutPocket(312);

    // WOSM Purple Circle Badge (Right chest above pocket)
    ctx.fillStyle = '#6D28D9';
    ctx.beginPath();
    ctx.arc(138, 128, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Tunas Kelapa Red Diamond Badge (Left chest)
    ctx.save();
    ctx.translate(374, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#B91C1C';
    ctx.fillRect(-16, -16, 32, 32);
    ctx.restore();

    // Name Tag
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 3;
    ctx.fillRect(76, 302, 124, 30);
    ctx.strokeRect(76, 302, 124, 30);
    ctx.fillStyle = '#451A03';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortName, 138, 317);

    // Belt
    ctx.fillStyle = '#29180B';
    ctx.fillRect(0, 444, 512, 68);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(256, 478, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (uniform === 'batik') {
    // Batik SD Nasional (Crimson & Indigo Kawung pattern)
    ctx.fillStyle = '#881337';
    ctx.fillRect(0, 0, 512, 512);

    // Geometric Batik Kawung & Floral Grid
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3;
    const step = 64;
    for (let y = 0; y <= 512; y += step) {
      for (let x = 0; x <= 512; x += step) {
        ctx.fillStyle = '#9F1239';
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Four Kawung petals
        ctx.fillStyle = '#FEF08A';
        [
          [-12, -12],
          [12, -12],
          [-12, 12],
          [12, 12],
        ].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Center placket
    ctx.fillStyle = '#4C0519';
    ctx.fillRect(240, 0, 32, 448);

    // Pocket + Tut Wuri Badge
    ctx.fillStyle = '#4C0519';
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3;
    ctx.fillRect(318, 165, 110, 115);
    ctx.strokeRect(318, 165, 110, 115);
    drawTutWuriBadge(ctx, 373, 222, 36);

    // Belt
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 444, 512, 68);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(220, 450, 72, 54);
  } else {
    // Seragam Olahraga SD (Kuning Cerah & Hijau / Merah)
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, 0, 512, 512);

    // Sporty side panels (Emerald Green)
    ctx.fillStyle = '#15803D';
    ctx.fillRect(0, 0, 86, 512);
    ctx.fillRect(426, 0, 86, 512);

    // White athletic stripes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(86, 0, 14, 512);
    ctx.fillRect(412, 0, 14, 512);

    // V-neck collar trim
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.moveTo(170, 0);
    ctx.lineTo(256, 115);
    ctx.lineTo(342, 0);
    ctx.closePath();
    ctx.fill();

    // Chest Text & Emblem
    drawTutWuriBadge(ctx, 355, 185, 36);
    ctx.fillStyle = '#14532D';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SDN SUSUKAN 03', 256, 310);
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`ATLET MUDA · ${shortName}`, 256, 345);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createUniformBackTexture(
  uniform: UniformPresetId,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (uniform === 'merah_putih') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 125);
    ctx.lineTo(512, 125);
    ctx.stroke();
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 444, 512, 68);
  } else if (uniform === 'pramuka') {
    ctx.fillStyle = '#D6B588';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#B89058';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 125);
    ctx.lineTo(512, 125);
    ctx.stroke();
    ctx.fillStyle = '#29180B';
    ctx.fillRect(0, 444, 512, 68);
  } else if (uniform === 'batik') {
    ctx.fillStyle = '#881337';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3;
    for (let y = 0; y <= 512; y += 64) {
      for (let x = 0; x <= 512; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 444, 512, 68);
  } else {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#15803D';
    ctx.fillRect(0, 0, 86, 512);
    ctx.fillRect(426, 0, 86, 512);
    ctx.fillStyle = '#14532D';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PENDIDIKAN JASMANI', 256, 150);
    ctx.font = 'bold 140px sans-serif';
    ctx.fillText('03', 256, 310);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createTopiSDTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Red SD base all around, white front panel in center
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 0, 512, 256);

  // White front panel of Topi SD
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(176, 0, 160, 256);

  // Tut Wuri Handayani Emblem on white front panel
  drawTutWuriBadge(ctx, 256, 132, 58);

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createNotebookTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Iconic Indonesian Notebook (Buku Tulis SiDu style)
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(0, 0, 256, 340);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, 0, 32, 340);
  ctx.fillRect(32, 36, 224, 52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUKU TULIS', 144, 68);

  // Label box
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(54, 125, 168, 110, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('NAMA: ANAK SD', 138, 158);
  ctx.fillText('KELAS: 4A SDN SUSUKAN 03', 138, 186);
  ctx.fillText('MAPEL: MATEMATIKA', 138, 214);

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCourtyardPavingTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, 0, 512, 512);

  // Indonesian School Courtyard Hex/Brick Paving Block Pattern
  const rows = 8;
  const cols = 4;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const offsetX = r % 2 === 0 ? 0 : w / 2;
      const x = c * w + offsetX;
      const y = r * h;

      ctx.fillStyle = (r + c) % 3 === 0 ? '#BEC8D4' : '#CBD5E1';
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    }
  }

  const tex = configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  return tex;
}

export function createSignboardTexture(
  title: string,
  subtitle = '',
  bgColor = '#0F766E',
  textColor = '#FFFFFF',
  borderColor = '#FACC15',
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 220);

  // Inner decorative corner accents
  ctx.fillStyle = borderColor;
  ctx.fillRect(30, 30, 18, 6);
  ctx.fillRect(30, 30, 6, 18);
  ctx.fillRect(976, 30, 18, 6);
  ctx.fillRect(988, 30, 6, 18);
  ctx.fillRect(30, 220, 18, 6);
  ctx.fillRect(30, 208, 6, 18);
  ctx.fillRect(976, 220, 18, 6);
  ctx.fillRect(988, 208, 6, 18);

  const maxTextWidth = 880; // Generous 72px padding on both left and right so letters never clip
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (subtitle) {
    let titleSize = 74;
    ctx.font = `bold ${titleSize}px sans-serif`;
    while (ctx.measureText(title).width > maxTextWidth && titleSize > 32) {
      titleSize -= 2;
      ctx.font = `bold ${titleSize}px sans-serif`;
    }
    ctx.fillStyle = textColor;
    ctx.fillText(title, 512, 94, maxTextWidth);

    let subSize = 38;
    ctx.font = `bold ${subSize}px sans-serif`;
    while (ctx.measureText(subtitle).width > maxTextWidth && subSize > 20) {
      subSize -= 2;
      ctx.font = `bold ${subSize}px sans-serif`;
    }
    ctx.fillStyle = borderColor;
    ctx.fillText(subtitle, 512, 178, maxTextWidth);
  } else {
    let titleSize = 86;
    ctx.font = `bold ${titleSize}px sans-serif`;
    while (ctx.measureText(title).width > maxTextWidth && titleSize > 34) {
      titleSize -= 2;
      ctx.font = `bold ${titleSize}px sans-serif`;
    }
    ctx.fillStyle = textColor;
    ctx.fillText(title, 512, 128, maxTextWidth);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createRoadAsphaltTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  ctx.fillStyle = '#1E293B';
  for (let i = 0; i < 400; i++) {
    const rx = (i * 73) % 512;
    const ry = (i * 137) % 512;
    ctx.fillRect(rx, ry, 4, 4);
  }

  // White dashed center road markings
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(36, 244, 160, 24);
  ctx.fillRect(296, 244, 160, 24);

  // Sidewalk curb stripes (zebra black-white)
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = (x / 64) % 2 === 0 ? '#F8FAFC' : '#0F172A';
    ctx.fillRect(x, 0, 64, 24);
    ctx.fillRect(x, 488, 64, 24);
  }

  const tex = configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 1);
  return tex;
}

export function createSportsCourtTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  // Outer Terracotta Court Apron
  ctx.fillStyle = '#9A3412';
  ctx.fillRect(0, 0, 1024, 640);

  // Inner Emerald Green Court Surface
  ctx.fillStyle = '#15803D';
  ctx.fillRect(64, 52, 896, 536);

  // Orange Basketball Key / Penalty Boxes on Left & Right
  ctx.fillStyle = '#C2410C';
  ctx.fillRect(64, 210, 150, 220);
  ctx.fillRect(810, 210, 150, 220);

  // Crisp White Court Lines
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 10;

  // Outer Sidelines & Baselines
  ctx.strokeRect(64, 52, 896, 536);

  // Center Halfway Line
  ctx.beginPath();
  ctx.moveTo(512, 52);
  ctx.lineTo(512, 588);
  ctx.stroke();

  // Center Circle & Kickoff Spot
  ctx.beginPath();
  ctx.arc(512, 320, 88, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(512, 320, 12, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right Penalty / Key Boxes + Free Throw Semicircles
  ctx.strokeRect(64, 210, 150, 220);
  ctx.strokeRect(810, 210, 150, 220);

  ctx.beginPath();
  ctx.arc(214, 320, 68, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(810, 320, 68, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.stroke();

  // Three-Point Arcs (Left & Right)
  ctx.beginPath();
  ctx.arc(90, 320, 210, -Math.PI * 0.42, Math.PI * 0.42);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(934, 320, 210, Math.PI * 0.58, Math.PI * 1.42);
  ctx.stroke();

  // Subtle Court Text Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAPANGAN OLAHRAGA SDN SUSUKAN 03', 512, 108);

  return configureColorTexture(new THREE.CanvasTexture(canvas), maxAnisotropy);
}


