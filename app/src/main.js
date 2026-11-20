// Neon Sunset Cover Studio — page wiring.
//
// Owns the editor state, the controls, and the preview. Photos are read
// on this machine and never leave it; exporting renders the same poster
// routine off-screen at the chosen post size and saves it as a PNG.

import { drawPoster, freshState, layoutPanels, PANEL_LAYOUTS, COLOUR_GRADES, CAPTION_COLOURS } from './cover.js';
import { runShot } from './shots.js';

const EXPORT_SIZES = [
  { key: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { key: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

const stage = document.getElementById('stage');
const status = document.getElementById('status');
const state = freshState();
let selected = 0;
let exportSize = EXPORT_SIZES[0];
let lastPhotoCount = -1;

const $ = (id) => document.getElementById(id);

function say(message) {
  status.textContent = message;
}

function redraw() {
  drawPoster(stage, state, { selected });
  syncPanelControls();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function addPhoto(img, name) {
  state.photos.push(img);
  const index = state.photos.length - 1;
  // First photo fills every panel; later photos take the next empty one.
  if (index === 0) {
    state.panels.forEach((slot) => { slot.photo = 0; });
  } else {
    const empty = state.panels.find((slot) => slot.photo < 0);
    if (empty) empty.photo = index;
  }
  renderPhotoTray(name, index);
  redraw();
  say(`${name} loaded — ${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} in the tray.`);
}

function renderPhotoTray(name, index) {
  const tray = $('tray');
  const card = document.createElement('div');
  card.className = 'photo-card';
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = 96;
  const img = state.photos[index];
  const tctx = thumb.getContext('2d');
  const scale = Math.max(96 / img.naturalWidth, 96 / img.naturalHeight);
  tctx.drawImage(
    img,
    (96 - img.naturalWidth * scale) / 2,
    (96 - img.naturalHeight * scale) / 2,
    img.naturalWidth * scale,
    img.naturalHeight * scale,
  );
  const label = document.createElement('span');
  label.textContent = name.length > 14 ? `${name.slice(0, 12)}…` : name;
  const fill = document.createElement('button');
  fill.type = 'button';
  fill.textContent = 'All panels';
  fill.title = 'Fill every panel with this photo';
  fill.addEventListener('click', () => {
    state.panels.forEach((slot) => { slot.photo = index; });
    redraw();
    say(`Every panel now shows ${name}.`);
  });
  card.append(thumb, label, fill);
  tray.append(card);
}

function syncPanelControls() {
  const slot = state.panels[selected] ?? { photo: -1, zoom: 1, dx: 0, dy: 0 };
  $('panel-name').textContent = `Panel ${selected + 1} of ${state.panels.length}`;
  const pick = $('panel-photo');
  // Rebuild the photo list only when a photo arrived, so slider drags
  // never steal focus from the select.
  if (state.photos.length !== lastPhotoCount) {
    lastPhotoCount = state.photos.length;
    pick.innerHTML = '';
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = 'Empty panel';
    pick.append(none);
    state.photos.forEach((_, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Photo ${i + 1}`;
      pick.append(option);
    });
  }
  pick.value = String(slot.photo);
  $('panel-zoom').value = slot.zoom;
  $('panel-x').value = slot.dx;
  $('panel-y').value = slot.dy;
  $('zoom-readout').textContent = `${Math.round(slot.zoom * 100)}%`;
}

function buildButtons(container, entries, current, onPick) {
  const box = $(container);
  box.innerHTML = '';
  entries.forEach(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(key === current));
    button.addEventListener('click', () => {
      onPick(key);
      buildButtons(container, entries, key, onPick);
    });
    box.append(button);
  });
}

function applyLayout(key) {
  state.layout = key;
  const count = layoutPanels(key).length;
  const old = state.panels;
  state.panels = layoutPanels(key).map((_, i) => old[i] ?? { photo: -1, zoom: 1, dx: 0, dy: 0 });
  if (selected >= count) selected = 0;
  redraw();
  say(`${PANEL_LAYOUTS[key].label} layout — ${count} panels.`);
}

function applyGrade(key) {
  state.grade = key;
  redraw();
  say(`${COLOUR_GRADES[key].label} grade.`);
}

function applyCaptionColour(key) {
  state.captionColour = key;
  redraw();
}

function setExportSize(key) {
  exportSize = EXPORT_SIZES.find((s) => s.key === key) ?? EXPORT_SIZES[0];
  $('export').textContent = `Export PNG · ${exportSize.w} × ${exportSize.h}`;
}

function exportPoster() {
  const off = document.createElement('canvas');
  off.width = exportSize.w;
  off.height = exportSize.h;
  drawPoster(off, state);
  off.toBlob((blob) => {
    if (!blob) {
      say('Export failed — the browser could not make the PNG.');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-cover-${exportSize.w}x${exportSize.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    say(`Saved neon-cover-${exportSize.w}x${exportSize.h}.png — ${exportSize.w} × ${exportSize.h}.`);
  }, 'image/png');
}

function panelAt(px, py) {
  const rect = stage.getBoundingClientRect();
  const x = (px - rect.left) / rect.width;
  const y = (py - rect.top) / rect.height;
  return layoutPanels(state.layout).findIndex((unit) => (
    x >= unit.x && x < unit.x + unit.w && y >= unit.y && y < unit.y + unit.h
  ));
}

stage.addEventListener('click', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit >= 0) {
    selected = hit;
    redraw();
    say(`Panel ${hit + 1} selected — pick its photo, zoom and position below.`);
  }
});

$('photo-files').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      say(`Could not read ${file.name} — try another image file.`);
    }
  }
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      addPhoto(await loadImage(`samples/${button.dataset.sample}.jpg`), button.dataset.sample);
    } catch {
      say('Sample photo failed to load.');
    }
  });
});

$('panel-photo').addEventListener('change', (e) => {
  state.panels[selected].photo = Number(e.target.value);
  redraw();
});
$('panel-zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redraw();
});
$('panel-x').addEventListener('input', (e) => {
  state.panels[selected].dx = Number(e.target.value);
  redraw();
});
$('panel-y').addEventListener('input', (e) => {
  state.panels[selected].dy = Number(e.target.value);
  redraw();
});
$('fill-all').addEventListener('click', () => {
  const slot = state.panels[selected];
  if (slot.photo < 0) {
    say('Pick a photo for this panel first.');
    return;
  }
  state.panels.forEach((p) => { p.photo = slot.photo; });
  redraw();
  say('All panels now use this panel’s photo.');
});
$('reset-frame').addEventListener('click', () => {
  const slot = state.panels[selected];
  slot.zoom = 1;
  slot.dx = 0;
  slot.dy = 0;
  redraw();
  say(`Panel ${selected + 1} framing reset.`);
});

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('caption-place').addEventListener('change', (e) => { state.captionPlace = e.target.value; redraw(); });
$('caption-scale').addEventListener('input', (e) => {
  state.captionScale = Number(e.target.value);
  $('scale-readout').textContent = `${Math.round(state.captionScale * 100)}%`;
  redraw();
});
$('export').addEventListener('click', exportPoster);

buildButtons('layout-pick', Object.entries(PANEL_LAYOUTS).map(([k, v]) => [k, v.label]), 'hero', applyLayout);
buildButtons('grade-pick', Object.entries(COLOUR_GRADES).map(([k, v]) => [k, v.label]), 'sunset', applyGrade);
buildButtons('colour-pick', Object.entries(CAPTION_COLOURS).map(([k]) => [k, k]), 'white', applyCaptionColour);
buildButtons('size-pick', EXPORT_SIZES.map((s) => [s.key, s.label]), 'square', setExportSize);

stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('dropping'); });
stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  stage.classList.remove('dropping');
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      say(`Could not read ${file.name}.`);
    }
  }
});

// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the poster alone at export size.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    async loadSample(name) {
      return loadImage(`samples/${name}.jpg`);
    },
    applyShot(next) {
      Object.assign(state, next);
      selected = 0;
      drawPoster(stage, state, {});
      syncPanelControls();
    },
    ready() {
      window.__shotReady = true;
    },
  });
} else {
  redraw();
  say('Add a photo to begin — or try a sample below.');
}
