// Phở Rush — kitchen: the whole game state and every action the player can
// take. Pure logic, no DOM, so the smoke test can play a full round in Node.
// The cook carries up to HAND_SIZE items, cooks raw food at the stations,
// assembles a dish on the plate and serves it to the matching order.

import {
  DAY_SECONDS,
  RUSH_AT,
  HAND_SIZE,
  PREP,
  STATIONS,
  DISHES,
} from './config.js';
import { OrderBoard } from './orders.js';

export const PHASE = { TITLE: 'title', PLAYING: 'playing', OVER: 'over' };

export class Kitchen {
  constructor(random = Math.random) {
    this.random = random;
    this.phase = PHASE.TITLE;
    this.timeLeft = DAY_SECONDS;
    this.elapsed = 0;
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.lost = 0;
    this.hand = []; // prepared/raw ingredient ids, max HAND_SIZE
    this.stations = {
      pot: { busy: false, progress: 0, seconds: STATIONS.pot.seconds, item: null },
      grill: { busy: false, progress: 0, seconds: 0, item: null, result: null },
      board: { busy: false, progress: 0, seconds: 0, item: null, result: null, taps: 0, tapsNeeded: 0 },
    };
    this.plate = []; // prepared ingredient ids on the assembly plate
    this.board = new OrderBoard(random);
    this.flash = null; // {kind:'good'|'bad', text, until}
    this.rush = false;
    this.muted = false;
  }

  get rushActive() {
    return this.timeLeft <= RUSH_AT && this.phase === PHASE.PLAYING;
  }

  start() {
    this.phase = PHASE.PLAYING;
    this.timeLeft = DAY_SECONDS;
    this.elapsed = 0;
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.lost = 0;
    this.hand = [];
    this.plate = [];
    this.board.reset();
    for (const key of Object.keys(this.stations)) {
      this.stations[key] = { busy: false, progress: 0, seconds: 0, item: null, result: null, taps: 0, tapsNeeded: 0 };
    }
    this.stations.pot.seconds = STATIONS.pot.seconds;
    this.flash = { kind: 'good', text: 'Mở quán! Khách đang tới…', until: this.elapsed + 2.5 };
  }

  update(dt) {
    if (this.phase !== PHASE.PLAYING) return;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.rush = this.rushActive;
    const expired = this.board.update(dt, this.elapsed, this.rush);
    for (const _order of expired) {
      this.lost += 1;
      this.combo = 0;
      this.flash = { kind: 'bad', text: 'Khách bỏ đi rồi!', until: this.elapsed + 2 };
    }
    // Cooking progress.
    for (const key of ['pot', 'grill']) {
      const st = this.stations[key];
      if (st.busy && st.progress < 1) {
        st.progress = Math.min(1, st.progress + dt / st.seconds);
        if (st.progress >= 1) {
          this.flash = { kind: 'good', text: key === 'pot' ? 'Nước dùng sôi rồi!' : 'Nướng xong rồi!', until: this.elapsed + 1.6 };
        }
      }
    }
    if (this.timeLeft <= 0) this.phase = PHASE.OVER;
  }

  // --- Player actions -------------------------------------------------------

  pickIngredient(id) {
    if (this.phase !== PHASE.PLAYING) return false;
    if (this.hand.length >= HAND_SIZE) {
      this.flash = { kind: 'bad', text: 'Tay đầy rồi!', until: this.elapsed + 1.2 };
      return false;
    }
    this.hand.push(id);
    return true;
  }

  // Start cooking at a station, or collect what is finished there.
  useStation(key) {
    if (this.phase !== PHASE.PLAYING) return false;
    const st = this.stations[key];
    if (st.busy) {
      if (st.progress >= 1) return this.collectStation(key);
      if (key === 'board') return this.chopOnce();
      return false; // still cooking
    }
    if (key === 'pot') {
      st.busy = true;
      st.progress = 0;
      st.seconds = STATIONS.pot.seconds;
      st.item = 'broth';
      return true;
    }
    // Grill / board need a matching raw ingredient in hand.
    const idx = this.hand.findIndex((item) => PREP[item] && PREP[item].station === key);
    if (idx === -1) {
      this.flash = { kind: 'bad', text: key === 'grill' ? 'Cần thịt sống để nướng!' : 'Cần rau/ớt để cắt!', until: this.elapsed + 1.4 };
      return false;
    }
    const raw = this.hand.splice(idx, 1)[0];
    const prep = PREP[raw];
    st.busy = true;
    st.progress = 0;
    st.item = raw;
    st.result = prep.result;
    if (key === 'grill') {
      st.seconds = prep.seconds;
    } else {
      st.taps = 0;
      st.tapsNeeded = prep.taps;
    }
    return true;
  }

  chopOnce() {
    const st = this.stations.board;
    if (!st.busy) return false;
    st.taps += 1;
    st.progress = st.taps / st.tapsNeeded;
    if (st.taps >= st.tapsNeeded) st.progress = 1;
    return true;
  }

  collectStation(key) {
    const st = this.stations[key];
    if (!st.busy || st.progress < 1) return false;
    if (this.hand.length >= HAND_SIZE) {
      this.flash = { kind: 'bad', text: 'Tay đầy rồi!', until: this.elapsed + 1.2 };
      return false;
    }
    const result = key === 'pot' ? 'broth' : st.result;
    this.hand.push(result);
    this.stations[key] = { busy: false, progress: 0, seconds: 0, item: null, result: null, taps: 0, tapsNeeded: 0 };
    if (key === 'pot') this.stations.pot.seconds = STATIONS.pot.seconds;
    return true;
  }

  // Move one matching prepared item from hand onto the assembly plate.
  placeOnPlate() {
    if (this.phase !== PHASE.PLAYING) return false;
    const dish = this.plateDish();
    if (dish) return false; // plate already holds a finished dish
    // What does the plate still need? Any open dish the hand can feed.
    const idx = this.hand.findIndex((item) => this.plateNeeds(item));
    if (idx === -1) {
      this.flash = { kind: 'bad', text: 'Món này không cần nguyên liệu đó!', until: this.elapsed + 1.4 };
      return false;
    }
    this.plate.push(this.hand.splice(idx, 1)[0]);
    return true;
  }

  // Is this prepared item still missing from the plate for some dish?
  plateNeeds(item) {
    const counts = {};
    for (const p of this.plate) counts[p] = (counts[p] ?? 0) + 1;
    return this.dishCandidates().some((dish) => {
      const need = {};
      for (const n of dish.needs) need[n] = (need[n] ?? 0) + 1;
      return (need[item] ?? 0) > (counts[item] ?? 0);
    });
  }

  dishCandidates() {
    // Dishes the plate could still become, given what is on it.
    const counts = {};
    for (const p of this.plate) counts[p] = (counts[p] ?? 0) + 1;
    return DISHES.filter((dish) => {
      const need = {};
      for (const n of dish.needs) need[n] = (need[n] ?? 0) + 1;
      return Object.keys(counts).every((k) => (counts[k] ?? 0) <= (need[k] ?? 0));
    });
  }

  // The finished dish on the plate, or null.
  plateDish() {
    const counts = {};
    for (const p of this.plate) counts[p] = (counts[p] ?? 0) + 1;
    for (const dish of DISHES) {
      const need = {};
      for (const n of dish.needs) need[n] = (need[n] ?? 0) + 1;
      const keys = new Set([...Object.keys(need), ...Object.keys(counts)]);
      if ([...keys].every((k) => (need[k] ?? 0) === (counts[k] ?? 0))) return dish;
    }
    return null;
  }

  clearPlate() {
    this.plate = [];
  }

  // Serve the finished dish to its waiting order.
  serve() {
    if (this.phase !== PHASE.PLAYING) return false;
    const dish = this.plateDish();
    if (!dish) {
      this.flash = { kind: 'bad', text: 'Đĩa chưa đủ món!', until: this.elapsed + 1.4 };
      return false;
    }
    const order = this.board.findForDish(dish.id);
    if (!order) {
      this.flash = { kind: 'bad', text: 'Không ai gọi món này!', until: this.elapsed + 1.4 };
      return false;
    }
    this.board.serve(order);
    this.plate = [];
    this.served += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const tip = Math.round(dish.coins * (1 + 0.25 * (this.combo - 1)) * (1 + Math.max(0, order.left / order.patience) * 0.5));
    this.coins += tip;
    this.score += tip * 10 + this.combo * 5;
    this.flash = { kind: 'good', text: `Phục vụ ${dish.name} +${tip} xu${this.combo > 1 ? ` · Combo x${this.combo}` : ''}`, until: this.elapsed + 2 };
    return true;
  }

  // Put a hand item back (trash it).
  dropHand(index) {
    if (index >= 0 && index < this.hand.length) this.hand.splice(index, 1);
  }
}
