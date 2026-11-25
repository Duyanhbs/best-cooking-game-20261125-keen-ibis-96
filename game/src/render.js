// Phở Rush — render: draws the whole kitchen on one canvas.
// Layout is fixed to the 1280x800 logical view from config.js; the page
// scales the canvas to the window. All art is canvas shapes + emoji.

import { VIEW_W, VIEW_H, INGREDIENTS, PREP, STATIONS, LAYOUT, dishById, preparedEmoji, preparedName } from './config.js';
import { PHASE } from './kitchen.js';

const CREAM = '#f7ead2';
const WOOD = '#a06a3b';
const WOOD_DARK = '#7c4f27';
const WOOD_LIGHT = '#c98f4e';
const RED = '#b3372a';
const RED_DARK = '#8e2a20';
const GREEN = '#3f7d3a';
const GOLD = '#e9a13b';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill, stroke) {
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg = '#e0cba8') {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// --- Hit zones (shared with input.js) ---------------------------------------
export function hitZones() {
  const bins = INGREDIENTS.map((ing, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      id: ing.id,
      rect: { x: LAYOUT.bins.x + 8 + col * 138, y: LAYOUT.bins.y + 30 + row * 92, w: 128, h: 82 },
    };
  });
  const stations = ['pot', 'grill', 'board'].map((key, i) => ({
    key,
    rect: { x: LAYOUT.stations.x + 8 + i * 218, y: LAYOUT.stations.y + 30, w: 204, h: 168 },
  }));
  return {
    bins,
    stations,
    plate: { x: LAYOUT.plate.x + 8, y: LAYOUT.plate.y + 30, w: 300, h: 168 },
    clearPlate: { x: LAYOUT.plate.x + 330, y: LAYOUT.plate.y + 30, w: 210, h: 60 },
    serve: { x: LAYOUT.serve.x + 8, y: LAYOUT.serve.y + 30, w: 648, h: 168 },
    hands: [0, 1, 2].map((i) => ({
      x: LAYOUT.hands.x + 150 + i * 92, y: LAYOUT.hands.y + 22, w: 80, h: 64,
    })),
    start: { x: VIEW_W / 2 - 160, y: 560, w: 320, h: 64 },
    restart: { x: VIEW_W / 2 - 160, y: 580, w: 320, h: 64 },
  };
}

function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function zoneAt(px, py) {
  const z = hitZones();
  for (const b of z.bins) if (inRect(px, py, b.rect)) return { type: 'bin', id: b.id };
  for (const s of z.stations) if (inRect(px, py, s.rect)) return { type: 'station', key: s.key };
  if (inRect(px, py, z.plate)) return { type: 'plate' };
  if (inRect(px, py, z.clearPlate)) return { type: 'clearPlate' };
  if (inRect(px, py, z.serve)) return { type: 'serve' };
  for (let i = 0; i < z.hands.length; i++) if (inRect(px, py, z.hands[i])) return { type: 'hand', index: i };
  return null;
}

// --- Sections ----------------------------------------------------------------

function drawHeader(ctx, k) {
  const rush = k.rush && k.phase === PHASE.PLAYING;
  panel(ctx, 0, 0, VIEW_W, 64, rush ? '#8e2a20' : RED, RED_DARK);
  text(ctx, '🍜 PHỞ RUSH', 20, 34, 30, '#fff', 'bold');
  text(ctx, 'Quán phở đường phố', 230, 36, 15, '#ffd9a8');
  text(ctx, `⭐ ${k.score}`, 520, 34, 24, '#fff');
  text(ctx, `🪙 ${k.coins}`, 650, 34, 24, '#ffe08a');
  if (k.combo >= 2) text(ctx, `🔥 Combo x${k.combo}`, 780, 34, 24, '#ffb347');
  if (rush) {
    const pulse = 0.5 + 0.5 * Math.sin(k.elapsed * 6);
    ctx.globalAlpha = 0.85 + 0.15 * pulse;
    panel(ctx, 945, 12, 170, 40, '#d43d2a', '#ffd9a8');
    text(ctx, '🔥 GIỜ CAO ĐIỂM!', 1030, 33, 16, '#fff', 'bold', 'center');
    ctx.globalAlpha = 1;
  } else {
    text(ctx, `Đã phục vụ: ${k.served}`, 1000, 36, 15, '#ffd9a8');
  }
  const low = k.timeLeft <= 30 && k.phase === PHASE.PLAYING;
  text(ctx, `⏱ ${fmtTime(k.timeLeft)}`, 1130, 34, 26, low ? '#ffdf6b' : '#fff', 'bold', 'left');
}

function drawOrders(ctx, k) {
  const { x, y, w } = LAYOUT.orders;
  text(ctx, '📋 ĐƠN KHÁCH', x + 4, y + 8, 18, WOOD_DARK);
  const slotW = 300;
  for (let i = 0; i < 4; i++) {
    const ox = x + i * (slotW + 16);
    const order = k.board.orders[i];
    if (!order) {
      panel(ctx, ox, y + 26, slotW, 76, '#efe0c2', '#dcc79b');
      text(ctx, '— chờ khách —', ox + slotW / 2, y + 64, 15, '#a98f66', 'normal', 'center');
      continue;
    }
    const dish = dishById(order.dishId);
    const urgent = order.left < 10;
    panel(ctx, ox, y + 26, slotW, 76, urgent ? '#ffe3d6' : '#fffdf6', urgent ? '#e05a3a' : '#dcc79b');
    text(ctx, dish.emoji, ox + 30, y + 58, 34, '#000', 'normal', 'center');
    text(ctx, dish.name, ox + 56, y + 48, 19, '#3a2a18');
    const needs = dish.needs.map(preparedEmoji).join(' ');
    text(ctx, needs, ox + 56, y + 76, 17, '#6b543a', 'normal');
    const frac = Math.max(0, order.left / order.patience);
    bar(ctx, ox + 12, y + 90, slotW - 24, 8, frac, frac > 0.5 ? GREEN : frac > 0.25 ? GOLD : '#d43d2a');
  }
}

function drawBins(ctx, k) {
  const { x, y } = LAYOUT.bins;
  text(ctx, '🧺 NGUYÊN LIỆU — bấm để lấy (phím 1–8)', x + 4, y + 8, 18, WOOD_DARK);
  const z = hitZones();
  for (const b of z.bins) {
    const ing = INGREDIENTS.find((i) => i.id === b.id);
    const r = b.rect;
    panel(ctx, r.x, r.y, r.w, r.h, '#fffdf6', '#dcc79b');
    text(ctx, ing.emoji, r.x + r.w / 2, r.y + 28, 32, '#000', 'normal', 'center');
    text(ctx, ing.name, r.x + r.w / 2, r.y + 60, 14, '#3a2a18', 'bold', 'center');
    const prep = PREP[ing.id];
    text(ctx, prep ? (prep.station === 'grill' ? '→ nướng 🔥' : '→ cắt 🔪') : 'dùng ngay', r.x + r.w / 2, r.y + 76, 11, '#a98f66', 'normal', 'center');
  }
}

function drawStations(ctx, k) {
  const { x, y } = LAYOUT.stations;
  text(ctx, '👨‍🍳 BẾP — bấm để nấu / lấy ra (Q · W · E)', x + 4, y + 8, 18, WOOD_DARK);
  const z = hitZones();
  for (const s of z.stations) {
    const r = s.rect;
    const st = k.stations[s.key];
    const info = STATIONS[s.key];
    panel(ctx, r.x, r.y, r.w, r.h, st.busy ? '#fff3d6' : '#fffdf6', st.busy && st.progress >= 1 ? GREEN : '#dcc79b');
    text(ctx, info.emoji, r.x + r.w / 2, r.y + 34, 40, '#000', 'normal', 'center');
    text(ctx, info.name, r.x + r.w / 2, r.y + 74, 16, '#3a2a18', 'bold', 'center');
    if (!st.busy) {
      const hint = s.key === 'pot' ? 'Nấu nước dùng (6s)' : s.key === 'grill' ? 'Nướng thịt (5s)' : 'Cắt rau/ớt (3 nhát)';
      text(ctx, hint, r.x + r.w / 2, r.y + 100, 13, '#a98f66', 'normal', 'center');
      text(ctx, `[${info.key}]`, r.x + r.w / 2, r.y + 124, 13, '#c98f4e', 'bold', 'center');
    } else if (st.progress >= 1) {
      const label = s.key === 'pot' ? 'Nước dùng 🍲' : preparedName(st.result);
      text(ctx, `✅ ${label} xong!`, r.x + r.w / 2, r.y + 100, 15, GREEN, 'bold', 'center');
      text(ctx, 'Bấm để lấy', r.x + r.w / 2, r.y + 126, 13, '#a98f66', 'normal', 'center');
    } else if (s.key === 'board') {
      bar(ctx, r.x + 20, r.y + 98, r.w - 40, 14, st.progress, '#d43d2a');
      text(ctx, `Cắt… ${st.taps}/${st.tapsNeeded} (bấm thêm)`, r.x + r.w / 2, r.y + 126, 13, '#8a5a2a', 'bold', 'center');
    } else {
      bar(ctx, r.x + 20, r.y + 98, r.w - 40, 14, st.progress, '#e07b39');
      const item = s.key === 'pot' ? 'Nước dùng' : preparedName(st.result);
      text(ctx, `${item}… ${Math.round(st.progress * 100)}%`, r.x + r.w / 2, r.y + 126, 13, '#8a5a2a', 'bold', 'center');
    }
  }
}

function drawPlate(ctx, k) {
  const { x, y } = LAYOUT.plate;
  text(ctx, '🍽️ ĐĨA LẮP MÓN — bấm đĩa để xếp nguyên liệu', x + 4, y + 8, 18, WOOD_DARK);
  const z = hitZones();
  const r = z.plate;
  panel(ctx, r.x, r.y, r.w, r.h, '#fffdf6', '#dcc79b');
  const dish = k.plateDish();
  // The plate itself.
  ctx.beginPath();
  ctx.ellipse(r.x + 130, r.y + 84, 92, 54, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fdf6e8';
  ctx.fill();
  ctx.strokeStyle = '#c98f4e';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(r.x + 130, r.y + 84, 66, 36, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#e0cba8';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (k.plate.length === 0) {
    text(ctx, 'Đĩa trống', r.x + 130, r.y + 84, 15, '#a98f66', 'normal', 'center');
  } else {
    const items = k.plate.map(preparedEmoji).join(' ');
    text(ctx, items, r.x + 130, r.y + 76, 30, '#000', 'normal', 'center');
  }
  if (dish) {
    text(ctx, `✅ ${dish.name} sẵn sàng!`, r.x + 130, r.y + 156, 16, GREEN, 'bold', 'center');
  } else if (k.plate.length > 0) {
    const cands = k.dishCandidates();
    text(ctx, cands.length ? `Đang làm: ${cands.map((d) => d.name).join(' / ')}` : 'Chưa thành món nào', r.x + 130, r.y + 156, 13, '#8a5a2a', 'normal', 'center');
  }
  // Clear button.
  const c = z.clearPlate;
  panel(ctx, c.x, c.y, c.w, c.h, '#f3e3c8', '#dcc79b');
  text(ctx, '🗑️ Dọn đĩa', c.x + c.w / 2, c.y + c.h / 2, 16, '#7c4f27', 'bold', 'center');
  text(ctx, 'Xếp đủ món khách gọi', x + 330, y + 118, 13, '#a98f66', 'normal', 'left');
  text(ctx, 'mới được tính điểm.', x + 330, y + 140, 13, '#a98f66', 'normal', 'left');
}

function drawServe(ctx, k) {
  const { x, y } = LAYOUT.serve;
  text(ctx, '🛎️ PHỤC VỤ — bấm để đưa món cho khách (Space)', x + 4, y + 8, 18, WOOD_DARK);
  const z = hitZones();
  const r = z.serve;
  const dish = k.plateDish();
  const order = dish ? k.board.findForDish(dish.id) : null;
  const ready = Boolean(dish && order);
  panel(ctx, r.x, r.y, r.w, r.h, ready ? '#e8f5df' : '#fffdf6', ready ? GREEN : '#dcc79b');
  if (ready) {
    text(ctx, dish.emoji, r.x + 90, r.y + 84, 56, '#000', 'normal', 'center');
    text(ctx, `${dish.name} — khách đang chờ!`, r.x + 150, r.y + 60, 22, '#2c5a26', 'bold');
    text(ctx, `Phục vụ ngay để giữ combo x${Math.max(1, k.combo + 1)}`, r.x + 150, r.y + 96, 15, '#4a7a42', 'normal');
    text(ctx, '👉 BẤM VÀO ĐÂY', r.x + 150, r.y + 132, 18, GREEN, 'bold');
  } else if (dish) {
    text(ctx, dish.emoji, r.x + 90, r.y + 84, 56, '#000', 'normal', 'center');
    text(ctx, `${dish.name} đã xong…`, r.x + 150, r.y + 60, 22, '#3a2a18', 'bold');
    text(ctx, '…nhưng chưa có khách gọi món này.', r.x + 150, r.y + 96, 15, '#8a5a2a', 'normal');
    text(ctx, 'Chờ đơn mới, hoặc dọn đĩa làm món khác.', r.x + 150, r.y + 132, 15, '#a98f66', 'normal');
  } else {
    text(ctx, '🛎️', r.x + 90, r.y + 84, 48, '#000', 'normal', 'center');
    text(ctx, 'Chưa có món sẵn sàng', r.x + 150, r.y + 60, 22, '#6b543a', 'bold');
    text(ctx, 'Lắp đủ nguyên liệu lên đĩa rồi bấm phục vụ.', r.x + 150, r.y + 96, 15, '#8a5a2a', 'normal');
    text(ctx, 'Món càng nhanh, tiền tip càng cao!', r.x + 150, r.y + 132, 15, '#a98f66', 'normal');
  }
}

function drawHands(ctx, k) {
  const { x, y } = LAYOUT.hands;
  panel(ctx, x, y, 1248, 84, WOOD, WOOD_DARK);
  text(ctx, '✋ TAY CỦA BẠN', x + 16, y + 44, 17, '#ffe9c4');
  const z = hitZones();
  for (let i = 0; i < 3; i++) {
    const r = z.hands[i];
    panel(ctx, r.x, r.y, r.w, r.h, k.hand[i] ? '#fffdf6' : '#8a5f36', k.hand[i] ? '#dcc79b' : '#6b4423');
    if (k.hand[i]) {
      text(ctx, preparedEmoji(k.hand[i]), r.x + r.w / 2, r.y + 24, 26, '#000', 'normal', 'center');
      text(ctx, preparedName(k.hand[i]), r.x + r.w / 2, r.y + 50, 11, '#3a2a18', 'bold', 'center');
    } else {
      text(ctx, '—', r.x + r.w / 2, r.y + 32, 18, '#c9a06a', 'normal', 'center');
    }
  }
  text(ctx, 'Bấm ô tay để bỏ món · Phím 1–8 lấy nguyên liệu · Q/W/E bếp · Space phục vụ', x + 460, y + 30, 14, '#ffe9c4', 'normal');
  text(ctx, 'Nấu nước dùng trước, nướng thịt trong lúc chờ — đừng để khách đợi lâu!', x + 460, y + 56, 13, '#e8c98f', 'normal');
}

function drawFlash(ctx, k) {
  if (!k.flash || k.elapsed > k.flash.until) return;
  const good = k.flash.kind === 'good';
  const w = 520;
  const x = (VIEW_W - w) / 2;
  panel(ctx, x, 188, w, 40, good ? '#e8f5df' : '#ffe3d6', good ? GREEN : '#d43d2a');
  text(ctx, k.flash.text, VIEW_W / 2, 209, 17, good ? '#2c5a26' : '#8e2a20', 'bold', 'center');
}

function drawTitle(ctx, k) {
  ctx.fillStyle = 'rgba(40,18,8,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 330, 120, 660, 420, '#fff7e6', '#c98f4e');
  text(ctx, '🍜', VIEW_W / 2, 190, 72, '#000', 'normal', 'center');
  text(ctx, 'PHỞ RUSH', VIEW_W / 2, 260, 54, RED, 'bold', 'center');
  text(ctx, 'Quán phở đường phố — nấu nhanh, phục vụ đúng món!', VIEW_W / 2, 300, 18, '#6b543a', 'normal', 'center');
  text(ctx, '1️⃣ Lấy nguyên liệu  →  2️⃣ Nấu ở bếp  →  3️⃣ Xếp lên đĩa  →  4️⃣ Phục vụ', VIEW_W / 2, 340, 17, '#3a2a18', 'bold', 'center');
  text(ctx, 'Khách đợi càng lâu càng mất kiên nhẫn. Combo càng cao, tip càng lớn!', VIEW_W / 2, 372, 15, '#8a5a2a', 'normal', 'center');
  text(ctx, '⏱ 150 giây một ca · Giờ cao điểm 45 giây cuối', VIEW_W / 2, 400, 15, '#8a5a2a', 'normal', 'center');
  panel(ctx, VIEW_W / 2 - 160, 440, 320, 64, RED, RED_DARK);
  text(ctx, '▶  MỞ QUÁN', VIEW_W / 2, 473, 26, '#fff', 'bold', 'center');
  text(ctx, 'Bấm nút, hoặc nhấn Enter', VIEW_W / 2, 522, 13, '#a98f66', 'normal', 'center');
}

function drawOver(ctx, k) {
  ctx.fillStyle = 'rgba(40,18,8,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 330, 120, 660, 440, '#fff7e6', '#c98f4e');
  text(ctx, '🏁 HẾT CA!', VIEW_W / 2, 180, 44, RED, 'bold', 'center');
  text(ctx, `⭐ Điểm: ${k.score}    🪙 Tiền: ${k.coins} xu`, VIEW_W / 2, 240, 24, '#3a2a18', 'bold', 'center');
  text(ctx, `🍽️ Đã phục vụ: ${k.served} món · 😤 Khách bỏ đi: ${k.lost}`, VIEW_W / 2, 282, 19, '#6b543a', 'normal', 'center');
  text(ctx, `🔥 Combo cao nhất: x${Math.max(1, k.bestCombo)}`, VIEW_W / 2, 316, 19, '#6b543a', 'normal', 'center');
  const rank = k.score >= 2500 ? '🏆 Bếp trưởng huyền thoại!' : k.score >= 1500 ? '👨‍🍳 Bếp trưởng cứng tay!' : k.score >= 800 ? '🍜 Đầu bếp triển vọng!' : '🥄 Tập sự — nấu lại ca nữa nhé!';
  text(ctx, rank, VIEW_W / 2, 356, 20, RED, 'bold', 'center');
  panel(ctx, VIEW_W / 2 - 160, 400, 320, 64, RED, RED_DARK);
  text(ctx, '↻  CHƠI LẠI', VIEW_W / 2, 433, 26, '#fff', 'bold', 'center');
  text(ctx, 'Bấm nút, hoặc nhấn R', VIEW_W / 2, 492, 13, '#a98f66', 'normal', 'center');
}

export function drawGame(ctx, k) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawHeader(ctx, k);
  drawOrders(ctx, k);
  drawBins(ctx, k);
  drawStations(ctx, k);
  drawPlate(ctx, k);
  drawServe(ctx, k);
  drawHands(ctx, k);
  drawFlash(ctx, k);
  if (k.phase === PHASE.TITLE) drawTitle(ctx, k);
  if (k.phase === PHASE.OVER) drawOver(ctx, k);
}
