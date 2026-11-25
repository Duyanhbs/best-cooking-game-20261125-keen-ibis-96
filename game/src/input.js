// Phở Rush — input: mouse clicks and keyboard shortcuts, translated into
// kitchen actions. Knows the hit zones from render.js, nothing else.

import { INGREDIENTS, STATIONS } from './config.js';
import { PHASE } from './kitchen.js';
import { zoneAt, hitZones } from './render.js';
import { sfx, ensureAudio } from './sound.js';

export function attachInput(canvas, kitchen, view) {
  function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function act(ok, good, bad) {
    if (ok) {
      if (good) sfx[good]();
    } else if (bad) {
      sfx[bad]();
    }
  }

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    const { x, y } = toLogical(e);
    const zones = hitZones();
    if (kitchen.phase === PHASE.TITLE) {
      if (x >= zones.start.x && x <= zones.start.x + zones.start.w && y >= zones.start.y && y <= zones.start.y + zones.start.h) {
        kitchen.start();
        sfx.start();
      }
      return;
    }
    if (kitchen.phase === PHASE.OVER) {
      if (x >= zones.restart.x && x <= zones.restart.x + zones.restart.w && y >= zones.restart.y && y <= zones.restart.y + zones.restart.h) {
        kitchen.start();
        sfx.start();
      }
      return;
    }
    const zone = zoneAt(x, y);
    if (!zone) return;
    if (zone.type === 'bin') {
      act(kitchen.pickIngredient(zone.id), 'pick', 'bad');
    } else if (zone.type === 'station') {
      const before = kitchen.stations[zone.key].progress;
      const ok = kitchen.useStation(zone.key);
      if (ok) {
        if (zone.key === 'board' && kitchen.stations.board.busy) sfx.chop();
        else if (kitchen.stations[zone.key].progress >= 1 && before >= 1) sfx.pick();
        else sfx.start();
      } else {
        sfx.bad();
      }
    } else if (zone.type === 'plate') {
      act(kitchen.placeOnPlate(), 'plate', 'bad');
    } else if (zone.type === 'clearPlate') {
      kitchen.clearPlate();
      sfx.pick();
    } else if (zone.type === 'serve') {
      act(kitchen.serve(), 'serve', 'bad');
    } else if (zone.type === 'hand') {
      kitchen.dropHand(zone.index);
      sfx.pick();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    ensureAudio();
    if (kitchen.phase === PHASE.TITLE && (e.key === 'Enter' || e.key === ' ')) {
      kitchen.start();
      sfx.start();
      return;
    }
    if (kitchen.phase === PHASE.OVER && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) {
      kitchen.start();
      sfx.start();
      return;
    }
    if (kitchen.phase !== PHASE.PLAYING) return;
    const ing = INGREDIENTS.find((i) => i.key === e.key);
    if (ing) {
      act(kitchen.pickIngredient(ing.id), 'pick', 'bad');
      return;
    }
    const stationKey = Object.keys(STATIONS).find((k) => STATIONS[k].key.toLowerCase() === e.key.toLowerCase());
    if (stationKey) {
      const ok = kitchen.useStation(stationKey);
      if (ok) sfx.start();
      else sfx.bad();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      act(kitchen.serve(), 'serve', 'bad');
    } else if (e.key === 'm' || e.key === 'M') {
      kitchen.muted = !kitchen.muted;
    }
  });
}
