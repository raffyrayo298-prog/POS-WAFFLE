// ============================================================================
// Brew POS — Cart state
// ============================================================================

import { uid } from "./utils.js";

class Cart {
  constructor() {
    this.items = []; // { lineId, productId, name, unitPrice, qty, modifiers:[names], modifierTotal, note, itemTotal }
    this.listeners = new Set();
  }

  onChange(cb) {
    this.listeners.add(cb);
    cb(this);
    return () => this.listeners.delete(cb);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this));
  }

  add({ productId, name, basePrice, selectedModifiers = [] }) {
    const modifierTotal = selectedModifiers.reduce((s, m) => s + (m.priceDelta || 0), 0);
    const unitPrice = basePrice + modifierTotal;
    // Merge with an identical existing line (same product + same modifiers)
    const modKey = selectedModifiers.map((m) => m.name).sort().join("|");
    const existing = this.items.find(
      (i) => i.productId === productId && i._modKey === modKey && !i.note
    );
    if (existing) {
      existing.qty += 1;
      existing.itemTotal = existing.unitPrice * existing.qty;
    } else {
      this.items.push({
        lineId: uid("line"),
        productId,
        name,
        unitPrice,
        qty: 1,
        modifiers: selectedModifiers.map((m) => m.name),
        _modKey: modKey,
        note: "",
        itemTotal: unitPrice,
      });
    }
    this.notify();
  }

  updateQty(lineId, qty) {
    const item = this.items.find((i) => i.lineId === lineId);
    if (!item) return;
    if (qty <= 0) {
      this.remove(lineId);
      return;
    }
    item.qty = qty;
    item.itemTotal = item.unitPrice * qty;
    this.notify();
  }

  setNote(lineId, note) {
    const item = this.items.find((i) => i.lineId === lineId);
    if (!item) return;
    item.note = note;
    this.notify();
  }

  remove(lineId) {
    this.items = this.items.filter((i) => i.lineId !== lineId);
    this.notify();
  }

  clear() {
    this.items = [];
    this.notify();
  }

  subtotal() {
    return this.items.reduce((s, i) => s + i.itemTotal, 0);
  }

  count() {
    return this.items.reduce((s, i) => s + i.qty, 0);
  }
}

export const cart = new Cart();
