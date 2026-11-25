// Phở Rush — configuration: dishes, ingredients, stations and layout.
// Everything the other modules need to know about the kitchen lives here,
// so tuning the game means editing this file alone.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const DAY_SECONDS = 150;
export const RUSH_AT = 45; // seconds left when rush hour starts
export const HAND_SIZE = 3;
export const MAX_ORDERS = 4;

// --- Ingredients -----------------------------------------------------------
export const INGREDIENTS = [
  { id: 'noodle', name: 'Bánh phở', emoji: '🍜', key: '1' },
  { id: 'rice', name: 'Cơm', emoji: '🍚', key: '2' },
  { id: 'beef', name: 'Thịt bò', emoji: '🥩', key: '3' },
  { id: 'pork', name: 'Thịt heo', emoji: '🍖', key: '4' },
  { id: 'herb', name: 'Rau thơm', emoji: '🌿', key: '5' },
  { id: 'chili', name: 'Ớt', emoji: '🌶️', key: '6' },
  { id: 'egg', name: 'Trứng', emoji: '🥚', key: '7' },
  { id: 'bread', name: 'Bánh mì', emoji: '🥖', key: '8' },
];

// Cooking turns a raw ingredient into a prepared one. `station` is where it
// is cooked, `seconds` how long it takes, `result` what comes out.
export const PREP = {
  beef: { station: 'grill', seconds: 5, result: 'grilledBeef', label: 'Bò nướng' },
  pork: { station: 'grill', seconds: 5, result: 'grilledPork', label: 'Heo nướng' },
  herb: { station: 'board', seconds: 0, result: 'choppedHerb', label: 'Rau cắt', taps: 3 },
  chili: { station: 'board', seconds: 0, result: 'choppedChili', label: 'Ớt cắt', taps: 3 },
};

// Prepared ingredients (what a dish actually needs).
export const PREPARED = {
  broth: { name: 'Nước dùng', emoji: '🍲' },
  grilledBeef: { name: 'Bò nướng', emoji: '🥩' },
  grilledPork: { name: 'Heo nướng', emoji: '🍖' },
  choppedHerb: { name: 'Rau cắt', emoji: '🥬' },
  choppedChili: { name: 'Ớt cắt', emoji: '🌶️' },
  noodle: { name: 'Bánh phở', emoji: '🍜' },
  rice: { name: 'Cơm', emoji: '🍚' },
  egg: { name: 'Trứng', emoji: '🥚' },
  bread: { name: 'Bánh mì', emoji: '🥖' },
};

// --- Dishes (recipes) -------------------------------------------------------
export const DISHES = [
  {
    id: 'pho',
    name: 'Phở Bò',
    emoji: '🍜',
    needs: ['broth', 'noodle', 'grilledBeef', 'choppedHerb'],
    coins: 18,
    patience: 42,
  },
  {
    id: 'banhmi',
    name: 'Bánh Mì',
    emoji: '🥖',
    needs: ['bread', 'grilledPork', 'choppedHerb', 'choppedChili'],
    coins: 15,
    patience: 38,
  },
  {
    id: 'comtam',
    name: 'Cơm Tấm',
    emoji: '🍚',
    needs: ['rice', 'grilledPork', 'egg'],
    coins: 14,
    patience: 36,
  },
  {
    id: 'buncha',
    name: 'Bún Chả',
    emoji: '🍲',
    needs: ['noodle', 'grilledPork', 'choppedHerb'],
    coins: 13,
    patience: 34,
  },
  {
    id: 'goicuon',
    name: 'Gỏi Cuốn',
    emoji: '🌯',
    needs: ['choppedHerb', 'grilledPork', 'choppedChili'],
    coins: 12,
    patience: 32,
  },
];

// --- Stations ---------------------------------------------------------------
export const STATIONS = {
  pot: { name: 'Nồi nước dùng', emoji: '🍲', key: 'Q', makes: 'broth', seconds: 6 },
  grill: { name: 'Bếp nướng', emoji: '🔥', key: 'W' },
  board: { name: 'Thớt', emoji: '🔪', key: 'E' },
};

// --- Layout (logical 1280x800 canvas) ---------------------------------------
export const LAYOUT = {
  header: { x: 0, y: 0, w: 1280, h: 64 },
  orders: { x: 16, y: 76, w: 1248, h: 104 },
  bins: { x: 16, y: 200, w: 560, h: 220 },
  stations: { x: 600, y: 200, w: 664, h: 220 },
  plate: { x: 16, y: 444, w: 560, h: 220 },
  serve: { x: 600, y: 444, w: 664, h: 220 },
  hands: { x: 16, y: 684, w: 1248, h: 100 },
};

export function dishById(id) {
  return DISHES.find((d) => d.id === id);
}

export function ingredientById(id) {
  return INGREDIENTS.find((i) => i.id === id);
}

export function preparedName(id) {
  if (PREPARED[id]) return PREPARED[id].name;
  const ing = INGREDIENTS.find((i) => i.id === id);
  return ing ? ing.name : id;
}

export function preparedEmoji(id) {
  if (PREPARED[id]) return PREPARED[id].emoji;
  const ing = INGREDIENTS.find((i) => i.id === id);
  return ing ? ing.emoji : '❓';
}
