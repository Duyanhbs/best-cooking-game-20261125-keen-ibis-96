// Phở Rush — main: the game loop, the canvas setup and the deterministic
// screenshot scenes (?shot=start|cook|serve|rush). In shot mode the clock
// is frozen so a screenshot always catches the same moment.

import { VIEW_W, VIEW_H, dishById } from './config.js';
import { Kitchen, PHASE } from './kitchen.js';
import { makeOrder } from './orders.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { sfx } from './sound.js';

// Small seeded RNG so the screenshot scenes are the same every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setOrder(kitchen, dishId, left, patience) {
  const dish = dishById(dishId);
  const order = makeOrder(dish, kitchen.elapsed, false);
  order.left = left;
  order.patience = patience;
  kitchen.board.orders.push(order);
  return order;
}

function setStation(kitchen, key, fields) {
  Object.assign(kitchen.stations[key], { busy: true }, fields);
}

// Build one frozen scene for a screenshot. Returns true when a shot applied.
function applyShot(kitchen, shot) {
  const seed = mulberry32(20261125);
  kitchen.random = seed;
  kitchen.board.random = seed;
  kitchen.start();
  kitchen.flash = null;
  if (shot === 'start') {
    kitchen.phase = PHASE.TITLE;
    kitchen.score = 0;
    kitchen.coins = 0;
    setOrder(kitchen, 'pho', 34, 42);
    setOrder(kitchen, 'banhmi', 26, 38);
    return true;
  }
  if (shot === 'cook') {
    kitchen.timeLeft = 98;
    kitchen.elapsed = 52;
    kitchen.score = 640;
    kitchen.coins = 42;
    kitchen.combo = 2;
    kitchen.served = 3;
    setOrder(kitchen, 'pho', 30, 42);
    setOrder(kitchen, 'banhmi', 18, 38);
    setOrder(kitchen, 'comtam', 25, 36);
    setStation(kitchen, 'pot', { progress: 0.6, seconds: 6, item: 'broth' });
    setStation(kitchen, 'grill', { progress: 0.45, seconds: 5, item: 'beef', result: 'grilledBeef' });
    setStation(kitchen, 'board', { progress: 1 / 3, seconds: 0, item: 'herb', result: 'choppedHerb', taps: 1, tapsNeeded: 3 });
    kitchen.plate = ['noodle', 'choppedHerb'];
    kitchen.hand = ['beef'];
    return true;
  }
  if (shot === 'serve') {
    kitchen.timeLeft = 72;
    kitchen.elapsed = 78;
    kitchen.score = 1250;
    kitchen.coins = 96;
    kitchen.combo = 3;
    kitchen.served = 6;
    setOrder(kitchen, 'pho', 28, 42);
    setOrder(kitchen, 'buncha', 12, 34);
    setStation(kitchen, 'grill', { progress: 0.8, seconds: 5, item: 'pork', result: 'grilledPork' });
    kitchen.plate = ['broth', 'noodle', 'grilledBeef', 'choppedHerb'];
    kitchen.hand = ['pork'];
    return true;
  }
  if (shot === 'rush') {
    kitchen.timeLeft = 28;
    kitchen.elapsed = 122;
    kitchen.rush = true;
    kitchen.score = 3200;
    kitchen.coins = 210;
    kitchen.combo = 5;
    kitchen.bestCombo = 5;
    kitchen.served = 14;
    setOrder(kitchen, 'pho', 6, 42);
    setOrder(kitchen, 'banhmi', 9, 38);
    setOrder(kitchen, 'comtam', 14, 36);
    setOrder(kitchen, 'goicuon', 20, 32);
    setStation(kitchen, 'pot', { progress: 0.9, seconds: 6, item: 'broth' });
    setStation(kitchen, 'grill', { progress: 0.3, seconds: 5, item: 'beef', result: 'grilledBeef' });
    setStation(kitchen, 'board', { progress: 2 / 3, seconds: 0, item: 'chili', result: 'choppedChili', taps: 2, tapsNeeded: 3 });
    kitchen.plate = ['bread', 'grilledPork'];
    kitchen.hand = ['choppedHerb', 'chili'];
    return true;
  }
  return false;
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const kitchen = new Kitchen();
  window.__kitchen = kitchen;

  let frozen = false;
  if (shot) frozen = applyShot(kitchen, shot);

  attachInput(canvas, kitchen);

  function resize() {
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let wasRush = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!frozen) {
      kitchen.update(dt);
      if (kitchen.rush && !wasRush) sfx.rush();
      wasRush = kitchen.rush;
      if (kitchen.phase === PHASE.OVER && !frame.ended) {
        frame.ended = true;
        sfx.over();
      }
      if (kitchen.phase === PHASE.PLAYING) frame.ended = false;
    }
    drawGame(ctx, kitchen);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__shotReady = true;
}

document.addEventListener('DOMContentLoaded', boot);
