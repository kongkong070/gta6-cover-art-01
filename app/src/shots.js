// Fixed scenes for screenshots, driven by the page's query string.
//
//   ?shot=editor&photo=pier,boulevard&caption=Sunset%20Heist
//       — the editor with sample photos loaded, for the app-at-work shot.
//   ?shot=cover&photo=pier,boulevard&caption=Sunset%20Heist&layout=hero
//       &grade=sunset&size=wide — the poster alone, sized for the shot.
//   Optional: &subtitle=… &place=top &colour=pink &scale=1
// window.__shotReady is set once the scene has painted.

import { layoutPanels, PANEL_LAYOUTS, COLOUR_GRADES } from './cover.js';

function splitList(value, fallback) {
  const list = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}

export async function runShot(shot, query, api) {
  const names = splitList(query.get('photo'), ['pier']);
  const photos = [];
  for (const name of names) photos.push(await api.loadSample(name));

  const layout = PANEL_LAYOUTS[query.get('layout')] ? query.get('layout') : 'hero';
  const grade = COLOUR_GRADES[query.get('grade')] ? query.get('grade') : 'sunset';
  const panels = layoutPanels(layout).map((_, i) => ({
    photo: photos.length === 1 ? 0 : Math.min(i, photos.length - 1),
    zoom: Number(query.get(`zoom${i}`) ?? 1) || 1,
    dx: Number(query.get(`dx${i}`) ?? 0) || 0,
    dy: Number(query.get(`dy${i}`) ?? 0) || 0,
  }));
  // A two-photo scene reads best when the hero panel and the strip differ.
  if (photos.length > 1 && layout === 'hero') {
    panels[0].photo = 0;
    panels[1].photo = 1;
    panels[2].photo = 0;
    panels[3].photo = 1;
  }

  const next = {
    layout,
    grade,
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'One last ride down the boulevard',
    captionPlace: query.get('place') === 'top' ? 'top' : 'bottom',
    captionColour: query.get('colour') ?? 'white',
    captionScale: Number(query.get('scale') ?? 1) || 1,
    photos,
    panels,
  };

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') ?? 'square';
    const dims = {
      square: [1080, 1080],
      portrait: [1080, 1350],
      wide: [1920, 1080],
    }[size] ?? [1080, 1080];
    const stage = document.getElementById('stage');
    stage.width = dims[0];
    stage.height = dims[1];
  }

  api.applyShot(next);
  requestAnimationFrame(() => requestAnimationFrame(() => api.ready()));
}
