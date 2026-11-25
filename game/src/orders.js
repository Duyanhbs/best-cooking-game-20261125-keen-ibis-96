// Phở Rush — orders: spawning, patience and matching.
// Pure logic, no DOM: the smoke test imports this file in Node.

import { DISHES, MAX_ORDERS } from './config.js';

let nextOrderId = 1;

export function makeOrder(dish, now, rush) {
  const patience = dish.patience * (rush ? 0.75 : 1);
  return {
    id: nextOrderId++,
    dishId: dish.id,
    bornAt: now,
    patience,
    left: patience,
    done: false,
  };
}

export function pickDish(random, servedCount) {
  // Early on, favour the quick dishes; the full menu opens up as you serve.
  const pool = servedCount < 3 ? DISHES.slice(0, 3) : DISHES;
  return pool[Math.floor(random() * pool.length)];
}

export class OrderBoard {
  constructor(random) {
    this.random = random;
    this.orders = [];
    this.spawnIn = 1.5;
    this.servedCount = 0;
  }

  // Advance the clock by dt seconds. Returns orders that just expired.
  update(dt, now, rush) {
    const expired = [];
    for (const order of this.orders) {
      order.left -= dt;
      if (order.left <= 0) expired.push(order);
    }
    this.orders = this.orders.filter((o) => o.left > 0);
    this.spawnIn -= dt;
    const interval = rush ? 5 : 8;
    if (this.spawnIn <= 0 && this.orders.length < MAX_ORDERS) {
      this.orders.push(makeOrder(pickDish(this.random, this.servedCount), now, rush));
      this.spawnIn = interval + this.random() * 3;
    }
    return expired;
  }

  // First order waiting for this dish, or null.
  findForDish(dishId) {
    return this.orders.find((o) => o.dishId === dishId) ?? null;
  }

  serve(order) {
    this.orders = this.orders.filter((o) => o.id !== order.id);
    this.servedCount += 1;
  }

  reset() {
    this.orders = [];
    this.spawnIn = 1.5;
    this.servedCount = 0;
  }
}
