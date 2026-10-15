// ============================================================================
// Brew POS — Firebase backend
// ============================================================================
// Same interface as backend-local.js, backed by Firebase Authentication +
// Realtime Database. Loaded only when js/config.js is filled in with a real
// project (see isFirebaseConfigured()).
//
// Requires, in the Firebase console:
//   1. Authentication -> Sign-in method -> Email/Password -> enabled
//   2. Realtime Database -> created (any region), rules per database.rules.json
// ============================================================================

import { FIREBASE_CONFIG, DEFAULT_SETTINGS } from "./config.js";

const { initializeApp } = await import(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"
);
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut: fbSignOut,
  onAuthStateChanged,
  updateProfile,
} = await import(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"
);
const {
  getDatabase,
  ref,
  get,
  set,
  push,
  update,
  remove,
  runTransaction,
  query,
  orderByChild,
  equalTo,
  onValue,
} = await import(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js"
);

let app = null;
let auth = null;
let db = null;
let cachedUser = null;
const authListeners = new Set();

function initializeFirebase() {
  if (app) return; // Already initialized
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getDatabase(app);

  onAuthStateChanged(auth, async (fbUser) => {
    cachedUser = await buildFullUser(fbUser);
    authListeners.forEach((cb) => cb(cachedUser));

    if (cachedUser?.role === "admin") {
      await ensureAdminFirebaseSeed();
    }
  });
}

async function ensureAdminFirebaseSeed() {
  if (!auth || !auth.currentUser) return;

  try {
    const currentUser = auth.currentUser;
    const userSnap = await get(ref(db, `users/${currentUser.uid}`)).catch(() => null);
    const userProfile = userSnap?.exists() ? userSnap.val() : null;
    if (!userProfile || userProfile.role !== "admin") return;

    await seedFirebaseIfEmpty();
  } catch (err) {
    const isPermissionDenied = err?.message?.includes("Permission denied") || err?.code === "PERMISSION_DENIED";
    if (isPermissionDenied) {
      console.warn("Firebase seed skipped: database rules do not allow writes yet.");
      return;
    }
    console.warn("Firebase seed warning:", err?.message || err);
  }
}

async function seedFirebaseIfEmpty() {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return;
  }

  const userSnap = await get(ref(db, `users/${currentUser.uid}`)).catch(() => null);
  const userProfile = userSnap?.exists() ? userSnap.val() : null;
  if (!userProfile || userProfile.role !== "admin") {
    return;
  }

  try {
    const catsSnap = await get(ref(db, "categories"));
    if (!catsSnap.exists()) {
      await set(ref(db, "categories"), {
        cat_waffle: { name: "Waffle", sortOrder: 1 },
        cat_drinks: { name: "Drinks", sortOrder: 2 },
        cat_others: { name: "Others", sortOrder: 3 },
      });
    }

    const prodsSnap = await get(ref(db, "products"));
    if (!prodsSnap.exists()) {
      await set(ref(db, "products"), {
        p_w_classic: { categoryId: "cat_waffle", name: "Classic Waffle", price: 59, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 27, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 60 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 20 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_w_chocolate: { categoryId: "cat_waffle", name: "Chocolate Waffle", price: 69, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 31, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 60 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 30 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_w_strawberry: { categoryId: "cat_waffle", name: "Strawberry Waffle", price: 69, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 31, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 60 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 15 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_w_banana: { categoryId: "cat_waffle", name: "Banana Waffle", price: 69, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 31, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 60 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 15 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_w_nutella: { categoryId: "cat_waffle", name: "Nutella Waffle", price: 79, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 36, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 60 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 25 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_d_coffee: { categoryId: "cat_drinks", name: "Hot Coffee", price: 49, imageUrl: "", isAvailable: true, modifiers: [{ name: "Regular", priceDelta: 0 }, { name: "Large", priceDelta: 10 }], stock: 40, costPrice: 22, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_coffee_powder", qty: 10 },
          { ingredientId: "ing_sugar", qty: 15 },
          { ingredientId: "ing_milk", qty: 100 },
        ]},
        p_d_icedcoffee: { categoryId: "cat_drinks", name: "Iced Coffee", price: 49, imageUrl: "", isAvailable: true, modifiers: [{ name: "Regular", priceDelta: 0 }, { name: "Large", priceDelta: 10 }], stock: 40, costPrice: 22, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_coffee_powder", qty: 10 },
          { ingredientId: "ing_sugar", qty: 15 },
          { ingredientId: "ing_milk", qty: 150 },
        ]},
        p_d_milktea: { categoryId: "cat_drinks", name: "Milktea", price: 39, imageUrl: "", isAvailable: true, modifiers: [{ name: "Regular", priceDelta: 0 }, { name: "Large", priceDelta: 10 }], stock: 40, costPrice: 18, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_tea_powder", qty: 10 },
          { ingredientId: "ing_sugar", qty: 20 },
          { ingredientId: "ing_milk", qty: 150 },
        ]},
        p_d_frappe: { categoryId: "cat_drinks", name: "Frappe", price: 59, imageUrl: "", isAvailable: true, modifiers: [{ name: "Regular", priceDelta: 0 }, { name: "Large", priceDelta: 10 }], stock: 40, costPrice: 27, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_coffee_powder", qty: 15 },
          { ingredientId: "ing_sugar", qty: 25 },
          { ingredientId: "ing_milk", qty: 200 },
        ]},
        p_d_latte: { categoryId: "cat_drinks", name: "Latte", price: 59, imageUrl: "", isAvailable: true, modifiers: [{ name: "Regular", priceDelta: 0 }, { name: "Large", priceDelta: 10 }], stock: 40, costPrice: 27, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_coffee_powder", qty: 12 },
          { ingredientId: "ing_sugar", qty: 15 },
          { ingredientId: "ing_milk", qty: 200 },
        ]},
        p_o_donut: { categoryId: "cat_others", name: "Donut", price: 29, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 13, lowStockThreshold: 10, recipe: [
          { ingredientId: "ing_waffle_batter", qty: 40 },
          { ingredientId: "ing_sugar", qty: 10 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ]},
        p_o_sandwich: { categoryId: "cat_others", name: "Sandwich", price: 79, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 36, lowStockThreshold: 10, recipe: []},
        p_o_fries: { categoryId: "cat_others", name: "Fries", price: 49, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 22, lowStockThreshold: 10, recipe: []},
        p_o_burger: { categoryId: "cat_others", name: "Burger", price: 89, imageUrl: "", isAvailable: true, modifiers: [], stock: 40, costPrice: 40, lowStockThreshold: 10, recipe: []},
      });
    }

    const settingsSnap = await get(ref(db, "settings"));
    if (!settingsSnap.exists()) {
      await set(ref(db, "settings"), DEFAULT_SETTINGS);
    }

    const seqRef = ref(db, "counters/orderSeq");
    const seqSnap = await get(seqRef);
    if (!seqSnap.exists()) {
      await set(seqRef, 0);
    }

    // Seed ingredients if not present
    const ingSnap = await get(ref(db, "ingredients"));
    if (!ingSnap.exists()) {
      await set(ref(db, "ingredients"), {
        ing_waffle_batter: {
          name: "Waffle Batter",
          unit: "g",
          stock: 5000,
          lowStockThreshold: 1000,
          costPerUnit: 0.15,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_waffle_stick: {
          name: "Waffle Stick",
          unit: "pcs",
          stock: 500,
          lowStockThreshold: 100,
          costPerUnit: 2.5,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_chocolate_filling: {
          name: "Chocolate Filling",
          unit: "g",
          stock: 2000,
          lowStockThreshold: 500,
          costPerUnit: 0.25,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_wrapper: {
          name: "Wrapper/Packaging",
          unit: "pcs",
          stock: 1000,
          lowStockThreshold: 200,
          costPerUnit: 1.0,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_ube_jam: {
          name: "Ube Jam",
          unit: "g",
          stock: 1500,
          lowStockThreshold: 300,
          costPerUnit: 0.30,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_milk: {
          name: "Milk",
          unit: "ml",
          stock: 10000,
          lowStockThreshold: 2000,
          costPerUnit: 0.05,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_coffee_powder: {
          name: "Coffee Powder",
          unit: "g",
          stock: 3000,
          lowStockThreshold: 500,
          costPerUnit: 0.40,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_sugar: {
          name: "Sugar",
          unit: "g",
          stock: 8000,
          lowStockThreshold: 1500,
          costPerUnit: 0.08,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ing_tea_powder: {
          name: "Tea Powder",
          unit: "g",
          stock: 2500,
          lowStockThreshold: 500,
          costPerUnit: 0.35,
          supplier: "",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });
    }
  } catch (err) {
    const isPermissionDenied = err?.message?.includes("Permission denied") || err?.code === "PERMISSION_DENIED";
    if (isPermissionDenied) {
      console.warn("Firebase seed skipped: database rules do not allow writes yet.");
      return;
    }
    console.warn("Firebase seed warning:", err?.message || err);
  }
}

// Remove the old unconditional seed call. The app now seeds only after an admin is authenticated.

async function buildFullUser(fbUser) {
  if (!fbUser) return null;
  const snap = await get(ref(db, `users/${fbUser.uid}`));
  const profile = snap.exists() ? snap.val() : { name: fbUser.email, role: "cashier" };
  return { uid: fbUser.uid, email: fbUser.email, ...profile };
}

export function initFirebase() {
  initializeFirebase();
}

export const firebaseAuth = {
  onAuthChange(cb) {
    authListeners.add(cb);
    cb(cachedUser);
    return () => authListeners.delete(cb);
  },

  getCurrentUser() {
    return cachedUser;
  },

  async signUp({ name, email, password, role = null }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const usersSnap = await get(ref(db, "users"));
    const isFirstUser = !usersSnap.exists();
    const effectiveRole = role === "admin" || (isFirstUser && role !== "cashier") ? "admin" : "cashier";

    const profile = {
      name,
      email,
      role: effectiveRole,
      createdAt: Date.now(),
    };
    await set(ref(db, `users/${cred.user.uid}`), profile);
    cachedUser = { uid: cred.user.uid, ...profile };
    return cachedUser;
  },

  async signIn({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    cachedUser = await buildFullUser(cred.user);
    return cachedUser;
  },

  async signOut() {
    await fbSignOut(auth);
    cachedUser = null;
  },
};

function withIds(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ id, ...v }));
}

export const firebaseDb = {
  async listCategories() {
    const snap = await get(ref(db, "categories"));
    return withIds(snap.val()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
  },

  async saveCategory(id, data) {
    const catId = id || push(ref(db, "categories")).key;
    await update(ref(db, `categories/${catId}`), data);
    return catId;
  },

  async deleteCategory(id) {
    await remove(ref(db, `categories/${id}`));
  },

  async listProducts() {
    const snap = await get(ref(db, "products"));
    return withIds(snap.val());
  },

  async saveProduct(id, data) {
    const prodId = id || push(ref(db, "products")).key;
    await update(ref(db, `products/${prodId}`), data);
    return prodId;
  },

  async deleteProduct(id) {
    await remove(ref(db, `products/${id}`));
  },

  async getSettings() {
    const snap = await get(ref(db, "settings"));
    const saved = snap.exists() ? snap.val() : {};
    // Ensure taxRate has a valid default if not set or is 0
    const taxRate = saved.taxRate !== undefined && saved.taxRate !== null ? saved.taxRate : DEFAULT_SETTINGS.taxRate;
    return { ...DEFAULT_SETTINGS, ...saved, taxRate };
  },

  async saveSettings(patch) {
    await update(ref(db, "settings"), patch);
    return this.getSettings();
  },

  async nextOrderNumber() {
    const counterRef = ref(db, "counters/orderSeq");
    const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
    return String(result.snapshot.val()).padStart(4, "0");
  },

  async createOrder(order) {
    const newRef = push(ref(db, "orders"));
    await set(newRef, order);

    // Decrement inventory for every line item via a per-product transaction
    // (safe under concurrent registers) and record a "sale" movement.
    const items = Object.values(order.items || {});
    const productsSnap = await get(ref(db, "products"));
    const products = productsSnap.val() || {};
    const ingredientsSnap = await get(ref(db, "ingredients"));
    const ingredients = ingredientsSnap.val() || {};

    // Track ingredient consumption and calculate COGS
    const ingredientUsage = [];
    let totalCogs = 0;

    await Promise.all(
      items.map(async (item) => {
        if (!item.productId) return;
        try {
          // Legacy: decrement product stock
          const stockRef = ref(db, `products/${item.productId}/stock`);
          const result = await runTransaction(stockRef, (current) =>
            Math.max(0, (current || 0) - (item.qty || 0))
          );
          const stockAfter = result.snapshot.val();
          await set(push(ref(db, "stockLog")), {
            productId: item.productId,
            productName: item.name,
            type: "sale",
            qty: -(item.qty || 0),
            stockAfter: stockAfter ?? null,
            note: `Order #${order.orderNumber}`,
            byUid: order.cashierId || "",
            byName: order.cashierName || "",
            createdAt: order.createdAt || Date.now(),
          });

          // New: track ingredient consumption from recipe
          const product = products[item.productId];
          const recipe = product?.recipe || [];
          for (const recipeItem of recipe) {
            const ing = ingredients[recipeItem.ingredientId];
            if (!ing) continue;

            const qtyNeeded = recipeItem.qty * (item.qty || 0);
            const ingStockRef = ref(db, `ingredients/${recipeItem.ingredientId}/stock`);
            const ingResult = await runTransaction(ingStockRef, (current) =>
              Math.max(0, (current || 0) - qtyNeeded)
            );
            const ingStockAfter = ingResult.snapshot.val();

            await set(push(ref(db, "stockLog")), {
              ingredientId: recipeItem.ingredientId,
              ingredientName: ing.name,
              type: "sale",
              qty: -qtyNeeded,
              stockAfter: ingStockAfter ?? null,
              note: `Order #${order.orderNumber}`,
              orderNumber: order.orderNumber,
              byUid: order.cashierId || "",
              byName: order.cashierName || "",
              createdAt: order.createdAt || Date.now(),
            });

            // Track for snapshot
            ingredientUsage.push({
              ingredientId: recipeItem.ingredientId,
              name: ing.name,
              qty: qtyNeeded,
              unit: ing.unit,
              costPerUnit: ing.costPerUnit || 0,
            });

            // Add to COGS
            totalCogs += qtyNeeded * (ing.costPerUnit || 0);
          }
        } catch (err) {
          console.error(`Failed to decrement stock for product ${item.productId}:`, err);
          // Continue with other items even if one fails
        }
      })
    );

    // Save ingredient usage snapshot and COGS on order
    await update(ref(db, `orders/${newRef.key}`), {
      ingredientUsage,
      cogs: totalCogs,
    });

    return newRef.key;
  },

  async updateOrder(id, patch) {
    await update(ref(db, `orders/${id}`), patch);
  },

  // Cancelling an order returns its items to stock (as a "return" movement)
  // instead of just changing status, so Inventory stays accurate.
  async cancelOrder(id) {
    const snap = await get(ref(db, `orders/${id}`));
    if (!snap.exists()) throw new Error("Order not found.");
    const order = snap.val();
    if (order.status === "cancelled") return;
    await update(ref(db, `orders/${id}`), { status: "cancelled" });

    const items = Object.values(order.items || {});
    const productsSnap = await get(ref(db, "products"));
    const products = productsSnap.val() || {};
    const ingredientsSnap = await get(ref(db, "ingredients"));
    const ingredients = ingredientsSnap.val() || {};

    // Restore product stock (legacy)
    await Promise.all(
      items.map(async (item) => {
        if (!item.productId) return;
        try {
          const stockRef = ref(db, `products/${item.productId}/stock`);
          const result = await runTransaction(stockRef, (current) => (current || 0) + (item.qty || 0));
          await set(push(ref(db, "stockLog")), {
            productId: item.productId,
            productName: item.name,
            type: "return",
            qty: item.qty || 0,
            stockAfter: result.snapshot.val() ?? null,
            note: `Cancelled order #${order.orderNumber}`,
            createdAt: Date.now(),
          });
        } catch (err) {
          console.error(`Failed to restore stock for product ${item.productId}:`, err);
          // Continue with other items even if one fails
        }
      })
    );

    // Restore ingredients from snapshot or recompute from recipe
    if (order.ingredientUsage && Array.isArray(order.ingredientUsage)) {
      // Restore from snapshot
      await Promise.all(
        order.ingredientUsage.map(async (usage) => {
          const ing = ingredients[usage.ingredientId];
          if (!ing) return;
          try {
            const ingStockRef = ref(db, `ingredients/${usage.ingredientId}/stock`);
            const result = await runTransaction(ingStockRef, (current) => (current || 0) + usage.qty);
            await set(push(ref(db, "stockLog")), {
              ingredientId: usage.ingredientId,
              ingredientName: usage.name,
              type: "return",
              qty: usage.qty,
              stockAfter: result.snapshot.val() ?? null,
              note: `Cancelled order #${order.orderNumber}`,
              orderNumber: order.orderNumber,
              byUid: order.cashierId || "",
              byName: order.cashierName || "",
              createdAt: Date.now(),
            });
          } catch (err) {
            console.error(`Failed to restore ingredient ${usage.ingredientId}:`, err);
          }
        })
      );
    } else {
      // Fallback: recompute from recipe (for legacy orders)
      await Promise.all(
        items.map(async (item) => {
          if (!item.productId) return;
          const product = products[item.productId];
          const recipe = product?.recipe || [];
          await Promise.all(
            recipe.map(async (recipeItem) => {
              const ing = ingredients[recipeItem.ingredientId];
              if (!ing) return;
              try {
                const qtyToRestore = recipeItem.qty * (item.qty || 0);
                const ingStockRef = ref(db, `ingredients/${recipeItem.ingredientId}/stock`);
                const result = await runTransaction(ingStockRef, (current) => (current || 0) + qtyToRestore);
                await set(push(ref(db, "stockLog")), {
                  ingredientId: recipeItem.ingredientId,
                  ingredientName: ing.name,
                  type: "return",
                  qty: qtyToRestore,
                  stockAfter: result.snapshot.val() ?? null,
                  note: `Cancelled order #${order.orderNumber} (recomputed)`,
                  orderNumber: order.orderNumber,
                  byUid: order.cashierId || "",
                  byName: order.cashierName || "",
                  createdAt: Date.now(),
                });
              } catch (err) {
                console.error(`Failed to restore ingredient ${recipeItem.ingredientId}:`, err);
              }
            })
          );
        })
      );
    }
  },

  // -- Inventory ------------------------------------------------------------
  async adjustStock(productId, delta, meta = {}) {
    try {
      const stockRef = ref(db, `products/${productId}/stock`);
      const result = await runTransaction(stockRef, (current) =>
        Math.max(0, (current || 0) + delta)
      );
      const stockAfter = result.snapshot.val();
      await set(push(ref(db, "stockLog")), {
        productId,
        productName: meta.productName || "",
        type: meta.type || (delta >= 0 ? "restock" : "adjustment"),
        qty: delta,
        stockAfter: stockAfter ?? null,
        note: meta.note || "",
        byUid: meta.byUid || "",
        byName: meta.byName || "",
        createdAt: Date.now(),
      });
      const snap = await get(ref(db, `products/${productId}`));
      return snap.exists() ? { id: productId, ...snap.val() } : null;
    } catch (err) {
      console.error(`Failed to adjust stock for product ${productId}:`, err);
      throw err;
    }
  },

  async listStockLog({ limit = 200 } = {}) {
    const snap = await get(ref(db, "stockLog"));
    return withIds(snap.val())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // -- Ingredients -----------------------------------------------------------
  async listIngredients() {
    const snap = await get(ref(db, "ingredients"));
    return withIds(snap.val());
  },

  async saveIngredient(id, data) {
    const ingId = id || push(ref(db, "ingredients")).key;
    await update(ref(db, `ingredients/${ingId}`), { ...data, updatedAt: Date.now() });
    if (!data.createdAt) {
      await update(ref(db, `ingredients/${ingId}`), { createdAt: Date.now() });
    }
    return ingId;
  },

  async deleteIngredient(id) {
    await remove(ref(db, `ingredients/${id}`));
  },

  async adjustIngredientStock(ingredientId, delta, meta = {}) {
    const stockRef = ref(db, `ingredients/${ingredientId}/stock`);
    const result = await runTransaction(stockRef, (current) =>
      Math.max(0, (current || 0) + delta)
    );
    const stockAfter = result.snapshot.val();
    await set(push(ref(db, "stockLog")), {
      ingredientId,
      ingredientName: meta.ingredientName || "",
      type: meta.type || (delta >= 0 ? "restock" : "adjustment"),
      qty: delta,
      stockAfter: stockAfter ?? null,
      note: meta.note || "",
      orderNumber: meta.orderNumber || "",
      byUid: meta.byUid || "",
      byName: meta.byName || "",
      createdAt: Date.now(),
    });
    await update(ref(db, `ingredients/${ingredientId}`), { updatedAt: Date.now() });
    const snap = await get(ref(db, `ingredients/${ingredientId}`));
    return snap.exists() ? { id: ingredientId, ...snap.val() } : null;
  },

  onIngredientsChange(cb) {
    const r = ref(db, "ingredients");
    return onValue(r, (snap) => cb(withIds(snap.val())));
  },

  // -- Realtime listeners -----------------------------------------------------
  onOrdersChange(cb) {
    const r = ref(db, "orders");
    return onValue(r, (snap) =>
      cb(withIds(snap.val()).sort((a, b) => b.createdAt - a.createdAt))
    );
  },

  onProductsChange(cb) {
    const r = ref(db, "products");
    return onValue(r, (snap) => cb(withIds(snap.val())));
  },

  onStockLogChange(cb) {
    const r = ref(db, "stockLog");
    return onValue(r, (snap) => {
      const log = withIds(snap.val());
      cb(log.sort((a, b) => b.createdAt - a.createdAt).slice(0, 200));
    });
  },

  async listOrders({ date, status } = {}) {
    let list;
    if (date) {
      const q = query(ref(db, "orders"), orderByChild("dateKey"), equalTo(date));
      const snap = await get(q);
      list = withIds(snap.val());
    } else {
      const snap = await get(ref(db, "orders"));
      list = withIds(snap.val());
    }
    if (status && status !== "all") list = list.filter((o) => o.status === status);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getOrder(id) {
    const snap = await get(ref(db, `orders/${id}`));
    return snap.exists() ? { id, ...snap.val() } : null;
  },
};
