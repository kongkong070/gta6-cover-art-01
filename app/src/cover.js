// Neon Sunset Cover Studio — poster renderer.
//
// Draws a multi-panel poster onto any 2D canvas: photos cropped into
// panels, a sunset/neon colour grade over the top, and bold caption
// lettering. The same routine paints the on-screen preview and the
// full-resolution PNG export, so what you see is what you share.

export const PANEL_LAYOUTS = {
  hero: {
    label: 'Hero + strip',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.62, w: 0.32, h: 0.38 },
      { x: 0.34, y: 0.62, w: 0.32, h: 0.38 },
      { x: 0.68, y: 0.62, w: 0.32, h: 0.38 },
    ],
  },
  quad: {
    label: 'Four square',
    panels: [
      { x: 0, y: 0, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0, w: 0.49, h: 0.49 },
      { x: 0, y: 0.51, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
    ],
  },
  triptych: {
    label: 'Three tall',
    panels: [
      { x: 0, y: 0, w: 0.32, h: 1 },
      { x: 0.34, y: 0, w: 0.32, h: 1 },
      { x: 0.68, y: 0, w: 0.32, h: 1 },
    ],
  },
  solo: {
    label: 'One big shot',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

export const COLOUR_GRADES = {
  sunset: {
    label: 'Vice sunset',
    washTop: 'rgba(255, 122, 26, 0.10)',
    washBottom: 'rgba(214, 38, 120, 0.42)',
    sun: '#ff9e3d',
    sunCore: '#ffe9a8',
    accent: '#ffb347',
  },
  neon: {
    label: 'Neon nights',
    washTop: 'rgba(64, 224, 255, 0.12)',
    washBottom: 'rgba(255, 0, 153, 0.45)',
    sun: '#ff2e9a',
    sunCore: '#ffd7f2',
    accent: '#3ee6ff',
  },
  dusk: {
    label: 'Palm dusk',
    washTop: 'rgba(120, 80, 255, 0.10)',
    washBottom: 'rgba(255, 94, 20, 0.40)',
    sun: '#ff6a3d',
    sunCore: '#ffd9a0',
    accent: '#c9a7ff',
  },
  noir: {
    label: 'After dark',
    washTop: 'rgba(10, 10, 30, 0.18)',
    washBottom: 'rgba(10, 10, 30, 0.55)',
    sun: '#f2f2f2',
    sunCore: '#ffffff',
    accent: '#e8e8e8',
  },
};

export const CAPTION_COLOURS = {
  white: { fill: '#ffffff', edge: '#160a24' },
  pink: { fill: '#ff5db1', edge: '#2b0a33' },
  gold: { fill: '#ffd166', edge: '#331a00' },
  cyan: { fill: '#59e3ff', edge: '#062a33' },
};

/** A fresh poster state: hero layout, no photos yet, sunset grade. */
export function freshState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'One last ride down the boulevard',
    captionPlace: 'bottom',
    captionColour: 'white',
    captionScale: 1,
    photos: [],
    panels: PANEL_LAYOUTS.hero.panels.map(() => ({
      photo: -1,
      zoom: 1,
      dx: 0,
      dy: 0,
    })),
  };
}

/** Panels for a layout key, falling back to the hero layout. */
export function layoutPanels(key) {
  return (PANEL_LAYOUTS[key] ?? PANEL_LAYOUTS.hero).panels;
}

function coverFit(img, rect, zoom, dx, dy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  return {
    x: rect.x + rect.w / 2 + dx * rect.w - pw / 2,
    y: rect.y + rect.h / 2 + dy * rect.h - ph / 2,
    w: pw,
    h: ph,
  };
}

function paintPhoto(ctx, img, rect, slot) {
  const box = coverFit(img, rect, slot.zoom, slot.dx, slot.dy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, box.x, box.y, box.w, box.h);
  ctx.restore();
}

function paintEmptyPanel(ctx, rect, index) {
  ctx.fillStyle = index % 2 === 0 ? '#241533' : '#1b0f2a';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(1, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.02, rect.w * 0.015]);
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.setLineDash([]);
  const size = Math.min(rect.w, rect.h) * 0.16;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function paintSun(ctx, w, h, grade) {
  const r = w * 0.13;
  const cx = w * 0.76;
  const cy = h * 0.4;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, grade.sunCore);
  glow.addColorStop(0.35, grade.sun);
  glow.addColorStop(1, 'rgba(255, 80, 120, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  ctx.restore();
}

function paintGradeWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(0.55, 'rgba(255, 80, 120, 0.05)');
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const edge = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(10, 0, 20, 0.42)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

function fitTitleSize(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = titleFont(size);
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = titleFont(size);
  }
  return size;
}

function titleFont(size) {
  return `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
}

function paintCaption(ctx, w, h, state) {
  const title = state.title.trim().toUpperCase();
  const sub = state.subtitle.trim();
  const colours = CAPTION_COLOURS[state.captionColour] ?? CAPTION_COLOURS.white;
  const grade = COLOUR_GRADES[state.grade] ?? COLOUR_GRADES.sunset;
  const bottom = state.captionPlace !== 'top';
  const base = Math.min(w, h) * 0.115 * state.captionScale;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    const size = fitTitleSize(ctx, title, w * 0.9, base);
    const y = bottom ? h - h * 0.055 : h * 0.055 + size;
    ctx.font = titleFont(size);
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colours.edge;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, w / 2, y);
    const fill = ctx.createLinearGradient(0, y - size, 0, y);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, colours.fill);
    ctx.fillStyle = fill;
    ctx.fillText(title, w / 2, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // A short accent rule under (or over) the title, a poster touch.
    const ruleW = w * 0.12;
    const ruleH = Math.max(3, size * 0.05);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(
      w / 2 - ruleW / 2,
      bottom ? y + size * 0.22 : y - size * 1.18,
      ruleW,
      ruleH,
    );
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  if (sub) {
    const size = Math.max(12, Math.min(w, h) * 0.032 * state.captionScale);
    ctx.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.22)}px`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.4;
    const y = bottom
      ? h - h * 0.055 - base * 1.05
      : h * 0.055 + base * 1.35;
    ctx.fillText(sub.toUpperCase(), w / 2, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.restore();
}

function paintFrame(ctx, w, h) {
  const t = Math.max(2, Math.min(w, h) * 0.006);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = t;
  ctx.strokeRect(t / 2, t / 2, w - t, h - t);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = t * 0.6;
  ctx.strokeRect(t * 1.8, t * 1.8, w - t * 3.6, h - t * 3.6);
}

/**
 * Paints the whole poster onto `canvas` from `state`.
 * `opts.selected` (a panel index) draws a selection outline — preview only,
 * never part of an export.
 */
export function drawPoster(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = COLOUR_GRADES[state.grade] ?? COLOUR_GRADES.sunset;
  const panels = layoutPanels(state.layout);
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.012));

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((unit, i) => {
    const rect = {
      x: Math.round(unit.x * w) + (unit.x > 0 ? gap / 2 : 0),
      y: Math.round(unit.y * h) + (unit.y > 0 ? gap / 2 : 0),
      w: Math.round(unit.w * w) - gap,
      h: Math.round(unit.h * h) - gap,
    };
    const slot = state.panels[i] ?? { photo: -1, zoom: 1, dx: 0, dy: 0 };
    const img = slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (img) paintPhoto(ctx, img, rect, slot);
    else paintEmptyPanel(ctx, rect, i);
    if (opts.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#3ee6ff';
      ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
      ctx.setLineDash([Math.min(w, h) * 0.02, Math.min(w, h) * 0.012]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  });

  paintSun(ctx, w, h, grade);
  paintGradeWash(ctx, w, h, grade);
  paintCaption(ctx, w, h, state);
  paintFrame(ctx, w, h);
}
