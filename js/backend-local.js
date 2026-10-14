// ============================================================================
// Brew POS — LocalStorage backend fallback
// ============================================================================
// Provides the same interface as the Firebase backend so the app works fully
// offline in a single browser without any external setup.
// ============================================================================

import { DEFAULT_SETTINGS } from "./config.js";
import { sha256 } from "./utils.js";

const STORE_PREFIX = "brewpos";
const STORAGE_KEYS = {
  users: `${STORE_PREFIX}_users`,
  categories: `${STORE_PREFIX}_categories`,
  products: `${STORE_PREFIX}_products`,
  settings: `${STORE_PREFIX}_settings`,
  orderSeq: `${STORE_PREFIX}_orderSeq`,
  orders: `${STORE_PREFIX}_orders`,
  stockLog: `${STORE_PREFIX}_stockLog`,
  session: `${STORE_PREFIX}_session`,
  migrationDone: `${STORE_PREFIX}_migration_done`,
  ingredients: `${STORE_PREFIX}_ingredients`,
  ingredientsMigrationDone: `${STORE_PREFIX}_ingredients_migration_done`,
};

const listeners = {
  orders: new Set(),
  products: new Set(),
  stockLog: new Set(),
  ingredients: new Set(),
};

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function withIds(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ id, ...v }));
}

function notify(kind) {
  const list = listeners[kind];
  const data = (() => {
    if (kind === "orders") return withIds(safeRead(STORAGE_KEYS.orders, {})).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (kind === "products") return withIds(safeRead(STORAGE_KEYS.products, {}));
    if (kind === "stockLog") return withIds(safeRead(STORAGE_KEYS.stockLog, {})).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 200);
    if (kind === "ingredients") return withIds(safeRead(STORAGE_KEYS.ingredients, {}));
    return [];
  })();
  for (const cb of list) cb(data);
}

// Cross-tab sync: listen for localStorage changes from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    const key = e.key;
    if (key === STORAGE_KEYS.orders) notify("orders");
    if (key === STORAGE_KEYS.products) notify("products");
    if (key === STORAGE_KEYS.stockLog) notify("stockLog");
    if (key === STORAGE_KEYS.ingredients) notify("ingredients");
  });
}

function maybeSeedData() {
  const migrationDone = safeRead(STORAGE_KEYS.migrationDone, false);

  // Migration: Update categories to new structure if old structure exists
  const categories = safeRead(STORAGE_KEYS.categories, null);
  const hasOldCategories = categories && (
    categories.cat_waffle ||
    categories.cat_drinks ||
    categories.cat_others
  );

  if (!migrationDone && (hasOldCategories || !categories || Object.keys(categories).length === 0)) {
    safeWrite(STORAGE_KEYS.categories, {
      cat_waffle: { name: "Waffle", sortOrder: 1 },
      cat_donut: { name: "Donut", sortOrder: 2 },
      cat_milktea: { name: "Milktea", sortOrder: 3 },
      cat_coffee: { name: "Coffee", sortOrder: 4 },
      cat_addons: { name: "Add-ons", sortOrder: 5 },
      cat_others: { name: "Others", sortOrder: 6 },
    });
  }

  // Migration: Update products to new menu if old products exist
  const products = safeRead(STORAGE_KEYS.products, null);
  const hasOldProducts = products && (
    products.p_w_classic ||
    products.p_d_coffee ||
    products.p_o_donut
  );

  if (!migrationDone && (hasOldProducts || !products || Object.keys(products).length === 0)) {
    safeWrite(STORAGE_KEYS.products, {
      // WAFFLE CATEGORY
      p_w_wafflepop: {
        categoryId: "cat_waffle",
        name: "Waffle Pop",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Cheese", priceDelta: 0 },
          { name: "Ube", priceDelta: 0 },
          { name: "Chocolate", priceDelta: 0 },
          { name: "Matcha", priceDelta: 0 },
          { name: "Strawberry", priceDelta: 0 },
          { name: "Nutella", priceDelta: 0 },
          { name: "Biscoff", priceDelta: 0 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
        recipe: [
          { ingredientId: "ing_waffle_batter", qty: 50 },
          { ingredientId: "ing_waffle_stick", qty: 1 },
          { ingredientId: "ing_chocolate_filling", qty: 15 },
          { ingredientId: "ing_wrapper", qty: 1 },
        ],
      },
      p_w_wafflepop_topping: {
        categoryId: "cat_waffle",
        name: "Waffle Pop Topping",
        price: 75,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Nutella", priceDelta: 0 },
          { name: "Biscoff", priceDelta: 0 }
        ],
        stock: 40,
        costPrice: 35,
        lowStockThreshold: 10,
      },
      p_w_belgian_oreo: {
        categoryId: "cat_waffle",
        name: "Belgian Waffle - Oreo",
        price: 69,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 32,
        lowStockThreshold: 10,
      },
      p_w_belgian_chocoreo: {
        categoryId: "cat_waffle",
        name: "Belgian Waffle - Choco Oreo",
        price: 69,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 32,
        lowStockThreshold: 10,
      },
      p_w_belgian_chocobanana: {
        categoryId: "cat_waffle",
        name: "Belgian Waffle - Choco Banana",
        price: 69,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 32,
        lowStockThreshold: 10,
      },
      p_w_belgian_strawberry: {
        categoryId: "cat_waffle",
        name: "Belgian Waffle - Strawberry",
        price: 69,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 32,
        lowStockThreshold: 10,
      },
      p_w_belgian_mango: {
        categoryId: "cat_waffle",
        name: "Belgian Waffle - Mango",
        price: 69,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 32,
        lowStockThreshold: 10,
      },
      p_w_bubble_ube: {
        categoryId: "cat_waffle",
        name: "Bubble Waffle - Ube Ice Cream with Cheese",
        price: 110,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 50,
        lowStockThreshold: 10,
      },
      p_w_bubble_strawberry: {
        categoryId: "cat_waffle",
        name: "Bubble Waffle - Strawberry Ice Cream",
        price: 110,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 50,
        lowStockThreshold: 10,
      },
      p_w_bubble_chocolate: {
        categoryId: "cat_waffle",
        name: "Bubble Waffle - Chocolate Ice Cream",
        price: 110,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 50,
        lowStockThreshold: 10,
      },
      p_w_bubble_vanilla: {
        categoryId: "cat_waffle",
        name: "Bubble Waffle - Vanilla Ice Cream",
        price: 110,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 50,
        lowStockThreshold: 10,
      },

      // DONUT CATEGORY
      p_d_halfdozen: {
        categoryId: "cat_donut",
        name: "Mini Donut - Half Dozen",
        price: 65,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Ube", priceDelta: 0 },
          { name: "Chocolate", priceDelta: 0 },
          { name: "Matcha", priceDelta: 0 },
          { name: "Strawberry", priceDelta: 0 }
        ],
        stock: 40,
        costPrice: 30,
        lowStockThreshold: 10,
      },
      p_d_dozen: {
        categoryId: "cat_donut",
        name: "Mini Donut - Dozen",
        price: 125,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Ube", priceDelta: 0 },
          { name: "Chocolate", priceDelta: 0 },
          { name: "Matcha", priceDelta: 0 },
          { name: "Strawberry", priceDelta: 0 }
        ],
        stock: 40,
        costPrice: 58,
        lowStockThreshold: 10,
      },

      // MILKTEA CATEGORY
      p_m_classic: {
        categoryId: "cat_milktea",
        name: "Milktea - Classic",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_chocolate: {
        categoryId: "cat_milktea",
        name: "Milktea - Chocolate",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_okinawa: {
        categoryId: "cat_milktea",
        name: "Milktea - Okinawa",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_hokkaido: {
        categoryId: "cat_milktea",
        name: "Milktea - Hokkaido",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_matcha: {
        categoryId: "cat_milktea",
        name: "Milktea - Matcha",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_redvelvet: {
        categoryId: "cat_milktea",
        name: "Milktea - Red Velvet",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },
      p_m_wintermelon: {
        categoryId: "cat_milktea",
        name: "Milktea - Wintermelon",
        price: 39,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 18,
        lowStockThreshold: 10,
      },

      // COFFEE CATEGORY
      p_c_iced_americano: {
        categoryId: "cat_coffee",
        name: "Iced Coffee - Americano",
        price: 49,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 22,
        lowStockThreshold: 10,
      },
      p_c_iced_frenchvanilla: {
        categoryId: "cat_coffee",
        name: "Iced Coffee - French Vanilla",
        price: 49,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 22,
        lowStockThreshold: 10,
      },
      p_c_iced_saltedcaramel: {
        categoryId: "cat_coffee",
        name: "Iced Coffee - Salted Caramel",
        price: 49,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 22,
        lowStockThreshold: 10,
      },
      p_c_iced_hazelnut: {
        categoryId: "cat_coffee",
        name: "Iced Coffee - Hazelnut",
        price: 49,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 22,
        lowStockThreshold: 10,
      },
      p_c_iced_spanishlatte: {
        categoryId: "cat_coffee",
        name: "Iced Coffee - Spanish Latte",
        price: 49,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 22,
        lowStockThreshold: 10,
      },
      p_c_hot_roasted: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Roasted Coffee",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_hazelnut: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Hazelnut",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_saltedcaramel: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Salted Caramel",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_caramelmacchiato: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Caramel Macchiato",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_cappuccino: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Cappuccino",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_darkchoco: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - Dark Choco",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },
      p_c_hot_frenchvanilla: {
        categoryId: "cat_coffee",
        name: "Hot Coffee - French Vanilla",
        price: 59,
        imageUrl: "",
        isAvailable: true,
        modifiers: [
          { name: "Medium", priceDelta: 0 },
          { name: "Large", priceDelta: 10 }
        ],
        stock: 40,
        costPrice: 27,
        lowStockThreshold: 10,
      },

      // ADD-ONS CATEGORY
      p_a_almond: {
        categoryId: "cat_addons",
        name: "Add-on - Almond",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_mininips: {
        categoryId: "cat_addons",
        name: "Add-on - Mini Nips",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_rainbowsprinkles: {
        categoryId: "cat_addons",
        name: "Add-on - Rainbow Sprinkles",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_minimallows: {
        categoryId: "cat_addons",
        name: "Add-on - Mini Mallows",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_crushedoreo: {
        categoryId: "cat_addons",
        name: "Add-on - Crushed Oreo",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_butternut: {
        categoryId: "cat_addons",
        name: "Add-on - Butternut",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },
      p_a_crushedgraham: {
        categoryId: "cat_addons",
        name: "Add-on - Crushed Graham",
        price: 10,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 100,
        costPrice: 5,
        lowStockThreshold: 20,
      },

      // OTHERS CATEGORY
      p_o_cornedbeef: {
        categoryId: "cat_others",
        name: "Sandwich - Corned Beef w/ Cheese",
        price: 99,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 45,
        lowStockThreshold: 10,
      },
      p_o_tuna: {
        categoryId: "cat_others",
        name: "Sandwich - Tuna w/ Cheese",
        price: 99,
        imageUrl: "",
        isAvailable: true,
        modifiers: [],
        stock: 40,
        costPrice: 45,
        lowStockThreshold: 10,
      },
    });
    // Mark migration as done
    safeWrite(STORAGE_KEYS.migrationDone, true);
  }

  // Ingredients migration - seed ingredients if not present
  const ingredientsMigrationDone = safeRead(STORAGE_KEYS.ingredientsMigrationDone, false);
  const ingredients = safeRead(STORAGE_KEYS.ingredients, null);

  if (!ingredientsMigrationDone && (!ingredients || Object.keys(ingredients).length === 0)) {
    safeWrite(STORAGE_KEYS.ingredients, {
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
    safeWrite(STORAGE_KEYS.ingredientsMigrationDone, true);
  }

  if (!safeRead(STORAGE_KEYS.settings, null)) {
    safeWrite(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  }

  if (!safeRead(STORAGE_KEYS.orderSeq, null)) {
    safeWrite(STORAGE_KEYS.orderSeq, 0);
  }
}

function readUsers() {
  return safeRead(STORAGE_KEYS.users, {});
}

function writeUsers(data) {
  safeWrite(STORAGE_KEYS.users, data);
}

async function ensureDefaultAdmin() {
  const users = readUsers();
  const adminEmail = "admin123@waffleking.com";
  const adminExists = Object.values(users).some(
    (user) => String(user.email || "").toLowerCase() === adminEmail
  );

  if (adminExists) return users;

  const adminUser = {
    uid: "admin_default",
    name: "Admin User",
    email: adminEmail,
    passwordHash: await sha256("Admin123"),
    role: "admin",
    createdAt: Date.now(),
  };

  users[adminUser.uid] = adminUser;
  writeUsers(users);
  return users;
}

function getCurrentSession() {
  return safeRead(STORAGE_KEYS.session, null);
}

function setCurrentSession(user) {
  if (user) {
    safeWrite(STORAGE_KEYS.session, user);
  } else {
    localStorage.removeItem(STORAGE_KEYS.session);
  }
}

function updateSessionFromUser(user) {
  if (!user) {
    setCurrentSession(null);
    return;
  }
  const session = getCurrentSession();
  if (!session || session.uid !== user.uid) {
    setCurrentSession(user);
  }
}

function emitSessionChange(user) {
  const listenersSet = authListeners;
  for (const cb of listenersSet) cb(user);
}

maybeSeedData();
await ensureDefaultAdmin();

const authListeners = new Set();

export const localAuth = {
  onAuthChange(cb) {
    authListeners.add(cb);
    const current = getCurrentSession();
    cb(current);
    return () => authListeners.delete(cb);
  },

  getCurrentUser() {
    return getCurrentSession();
  },

  async signUp({ name, email, password, role = null }) {
    const users = readUsers();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      throw new Error("Please provide a valid email.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (Object.values(users).some((u) => String(u.email || "").toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists.");
    }
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const isFirstUser = Object.keys(users).length === 0;
    const effectiveRole = role === "admin" || (isFirstUser && role !== "cashier") ? "admin" : "cashier";
    const user = {
      uid: userId,
      name: name || "New User",
      email: normalized,
      passwordHash: await sha256(password),
      role: effectiveRole,
      createdAt: Date.now(),
    };
    users[userId] = user;
    writeUsers(users);
    setCurrentSession({ uid: user.uid, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
    emitSessionChange(getCurrentSession());
    return getCurrentSession();
  },

  async signIn({ email, password }) {
    const users = readUsers();
    const normalized = String(email || "").trim().toLowerCase();
    const match = Object.values(users).find((u) => String(u.email || "").toLowerCase() === normalized);
    if (!match) {
      throw new Error("No account found with this email.");
    }
    const hash = await sha256(password || "");
    if (match.passwordHash !== hash) {
      throw new Error("Incorrect password.");
    }
    const safeUser = { uid: match.uid, name: match.name, email: match.email, role: match.role, createdAt: match.createdAt };
    setCurrentSession(safeUser);
    emitSessionChange(getCurrentSession());
    return safeUser;
  },

  async signOut() {
    setCurrentSession(null);
    emitSessionChange(null);
  },
};

function toList(key) {
  return withIds(safeRead(key, {}));
}

export const localDb = {
  async listCategories() {
    const list = toList(STORAGE_KEYS.categories).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return list;
  },

  async saveCategory(id, data) {
    const categories = safeRead(STORAGE_KEYS.categories, {});
    const catId = id || `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    categories[catId] = { ...(categories[catId] || {}), ...data };
    safeWrite(STORAGE_KEYS.categories, categories);
    return catId;
  },

  async deleteCategory(id) {
    const categories = safeRead(STORAGE_KEYS.categories, {});
    delete categories[id];
    safeWrite(STORAGE_KEYS.categories, categories);
    return true;
  },

  async listProducts() {
    return toList(STORAGE_KEYS.products);
  },

  async saveProduct(id, data) {
    const products = safeRead(STORAGE_KEYS.products, {});
    const productId = id || `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    products[productId] = { ...(products[productId] || {}), ...data };
    safeWrite(STORAGE_KEYS.products, products);
    notify("products");
    return productId;
  },

  async deleteProduct(id) {
    const products = safeRead(STORAGE_KEYS.products, {});
    delete products[id];
    safeWrite(STORAGE_KEYS.products, products);
    notify("products");
    return true;
  },

  async getSettings() {
    const settings = safeRead(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  async saveSettings(patch) {
    const settings = { ...DEFAULT_SETTINGS, ...(safeRead(STORAGE_KEYS.settings, DEFAULT_SETTINGS)), ...(patch || {}) };
    safeWrite(STORAGE_KEYS.settings, settings);
    return settings;
  },

  async nextOrderNumber() {
    const seq = Number(safeRead(STORAGE_KEYS.orderSeq, 0)) || 0;
    const next = seq + 1;
    safeWrite(STORAGE_KEYS.orderSeq, next);
    return String(next).padStart(4, "0");
  },

  async createOrder(order) {
    const orders = safeRead(STORAGE_KEYS.orders, {});
    const id = order.id || `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderRecord = {
      ...order,
      id,
      status: order.status || "completed",
      dateKey: order.dateKey || new Date(order.createdAt || Date.now()).toISOString().slice(0, 10),
    };
    orders[id] = orderRecord;
    safeWrite(STORAGE_KEYS.orders, orders);

    const items = Object.values(orderRecord.items || {});
    const products = safeRead(STORAGE_KEYS.products, {});
    const ingredients = safeRead(STORAGE_KEYS.ingredients, {});
    const log = safeRead(STORAGE_KEYS.stockLog, {});

    // Track ingredient consumption and calculate COGS
    const ingredientUsage = [];
    let totalCogs = 0;

    for (const item of items) {
      if (!item.productId) continue;

      // Legacy: still decrement product stock for backward compatibility
      const current = Number(products[item.productId]?.stock ?? 0);
      const nextQty = Math.max(0, current - Number(item.qty || 0));
      products[item.productId] = { ...(products[item.productId] || {}), stock: nextQty };

      const entryId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      log[entryId] = {
        productId: item.productId,
        productName: item.name,
        type: "sale",
        qty: -(Number(item.qty || 0)),
        stockAfter: nextQty,
        note: `Order #${orderRecord.orderNumber}`,
        byUid: orderRecord.cashierId || "",
        byName: orderRecord.cashierName || "",
        createdAt: orderRecord.createdAt || Date.now(),
      };

      // New: track ingredient consumption from recipe
      const product = products[item.productId];
      const recipe = product?.recipe || [];
      for (const recipeItem of recipe) {
        const ing = ingredients[recipeItem.ingredientId];
        if (!ing) continue;

        const qtyNeeded = recipeItem.qty * (item.qty || 0);
        const currentIngStock = Number(ing.stock ?? 0);
        const nextIngStock = Math.max(0, currentIngStock - qtyNeeded);

        ingredients[recipeItem.ingredientId] = { ...ing, stock: nextIngStock };

        // Log ingredient movement
        const ingLogId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        log[ingLogId] = {
          ingredientId: recipeItem.ingredientId,
          ingredientName: ing.name,
          type: "sale",
          qty: -qtyNeeded,
          stockAfter: nextIngStock,
          note: `Order #${orderRecord.orderNumber}`,
          orderNumber: orderRecord.orderNumber,
          byUid: orderRecord.cashierId || "",
          byName: orderRecord.cashierName || "",
          createdAt: orderRecord.createdAt || Date.now(),
        };

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
    }

    // Save ingredient usage snapshot and COGS on order
    orders[id] = {
      ...orderRecord,
      ingredientUsage,
      cogs: totalCogs,
    };

    safeWrite(STORAGE_KEYS.orders, orders);
    safeWrite(STORAGE_KEYS.products, products);
    safeWrite(STORAGE_KEYS.ingredients, ingredients);
    safeWrite(STORAGE_KEYS.stockLog, log);

    notify("orders");
    notify("products");
    notify("ingredients");
    notify("stockLog");
    return id;
  },

  async updateOrder(id, patch) {
    const orders = safeRead(STORAGE_KEYS.orders, {});
    if (!orders[id]) return;
    orders[id] = { ...orders[id], ...patch };
    safeWrite(STORAGE_KEYS.orders, orders);
    notify("orders");
  },

  async cancelOrder(id) {
    const orders = safeRead(STORAGE_KEYS.orders, {});
    const order = orders[id];
    if (!order || order.status === "cancelled") return;
    orders[id] = { ...order, status: "cancelled" };
    safeWrite(STORAGE_KEYS.orders, orders);

    const products = safeRead(STORAGE_KEYS.products, {});
    const ingredients = safeRead(STORAGE_KEYS.ingredients, {});
    const log = safeRead(STORAGE_KEYS.stockLog, {});

    // Restore product stock (legacy)
    for (const item of Object.values(order.items || {})) {
      if (!item.productId) continue;
      const current = Number(products[item.productId]?.stock ?? 0);
      const nextQty = current + Number(item.qty || 0);
      products[item.productId] = { ...(products[item.productId] || {}), stock: nextQty };
      const entryId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      log[entryId] = {
        productId: item.productId,
        productName: item.name,
        type: "return",
        qty: Number(item.qty || 0),
        stockAfter: nextQty,
        note: `Cancelled order #${order.orderNumber}`,
        byUid: order.cashierId || "",
        byName: order.cashierName || "",
        createdAt: Date.now(),
      };
    }

    // Restore ingredients from snapshot or recompute from recipe
    if (order.ingredientUsage && Array.isArray(order.ingredientUsage)) {
      // Restore from snapshot
      for (const usage of order.ingredientUsage) {
        const ing = ingredients[usage.ingredientId];
        if (!ing) continue;

        const currentIngStock = Number(ing.stock ?? 0);
        const nextIngStock = currentIngStock + usage.qty;
        ingredients[usage.ingredientId] = { ...ing, stock: nextIngStock };

        const ingLogId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        log[ingLogId] = {
          ingredientId: usage.ingredientId,
          ingredientName: usage.name,
          type: "return",
          qty: usage.qty,
          stockAfter: nextIngStock,
          note: `Cancelled order #${order.orderNumber}`,
          orderNumber: order.orderNumber,
          byUid: order.cashierId || "",
          byName: order.cashierName || "",
          createdAt: Date.now(),
        };
      }
    } else {
      // Fallback: recompute from recipe (for legacy orders)
      for (const item of Object.values(order.items || {})) {
        if (!item.productId) continue;
        const product = products[item.productId];
        const recipe = product?.recipe || [];
        for (const recipeItem of recipe) {
          const ing = ingredients[recipeItem.ingredientId];
          if (!ing) continue;

          const qtyToRestore = recipeItem.qty * (item.qty || 0);
          const currentIngStock = Number(ing.stock ?? 0);
          const nextIngStock = currentIngStock + qtyToRestore;
          ingredients[recipeItem.ingredientId] = { ...ing, stock: nextIngStock };

          const ingLogId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          log[ingLogId] = {
            ingredientId: recipeItem.ingredientId,
            ingredientName: ing.name,
            type: "return",
            qty: qtyToRestore,
            stockAfter: nextIngStock,
            note: `Cancelled order #${order.orderNumber} (recomputed)`,
            orderNumber: order.orderNumber,
            byUid: order.cashierId || "",
            byName: order.cashierName || "",
            createdAt: Date.now(),
          };
        }
      }
    }

    safeWrite(STORAGE_KEYS.products, products);
    safeWrite(STORAGE_KEYS.ingredients, ingredients);
    safeWrite(STORAGE_KEYS.stockLog, log);
    notify("orders");
    notify("products");
    notify("ingredients");
    notify("stockLog");
  },

  async adjustStock(productId, delta, meta = {}) {
    const products = safeRead(STORAGE_KEYS.products, {});
    const current = Number(products[productId]?.stock ?? 0);
    const nextQty = Math.max(0, current + Number(delta || 0));
    products[productId] = { ...(products[productId] || {}), stock: nextQty };
    safeWrite(STORAGE_KEYS.products, products);

    const log = safeRead(STORAGE_KEYS.stockLog, {});
    const entryId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    log[entryId] = {
      productId,
      productName: meta.productName || products[productId]?.name || "",
      type: meta.type || (delta >= 0 ? "restock" : "adjustment"),
      qty: Number(delta || 0),
      stockAfter: nextQty,
      note: meta.note || "",
      byUid: meta.byUid || "",
      byName: meta.byName || "",
      createdAt: Date.now(),
    };
    safeWrite(STORAGE_KEYS.stockLog, log);
    notify("products");
    notify("stockLog");
    return { id: productId, ...products[productId] };
  },

  async listStockLog({ limit = 200 } = {}) {
    return withIds(safeRead(STORAGE_KEYS.stockLog, {}))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
  },

  // -- Ingredients -----------------------------------------------------------
  async listIngredients() {
    return toList(STORAGE_KEYS.ingredients);
  },

  async saveIngredient(id, data) {
    const ingredients = safeRead(STORAGE_KEYS.ingredients, {});
    const ingId = id || `ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    ingredients[ingId] = { ...(ingredients[ingId] || {}), ...data, updatedAt: Date.now() };
    if (!ingredients[ingId].createdAt) ingredients[ingId].createdAt = Date.now();
    safeWrite(STORAGE_KEYS.ingredients, ingredients);
    notify("ingredients");
    return ingId;
  },

  async deleteIngredient(id) {
    const ingredients = safeRead(STORAGE_KEYS.ingredients, {});
    delete ingredients[id];
    safeWrite(STORAGE_KEYS.ingredients, ingredients);
    notify("ingredients");
    return true;
  },

  async adjustIngredientStock(ingredientId, delta, meta = {}) {
    const ingredients = safeRead(STORAGE_KEYS.ingredients, {});
    const current = Number(ingredients[ingredientId]?.stock ?? 0);
    const nextQty = Math.max(0, current + Number(delta || 0));
    ingredients[ingredientId] = { ...(ingredients[ingredientId] || {}), stock: nextQty, updatedAt: Date.now() };
    safeWrite(STORAGE_KEYS.ingredients, ingredients);

    const log = safeRead(STORAGE_KEYS.stockLog, {});
    const entryId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    log[entryId] = {
      ingredientId,
      ingredientName: meta.ingredientName || ingredients[ingredientId]?.name || "",
      type: meta.type || (delta >= 0 ? "restock" : "adjustment"),
      qty: Number(delta || 0),
      stockAfter: nextQty,
      note: meta.note || "",
      orderNumber: meta.orderNumber || "",
      byUid: meta.byUid || "",
      byName: meta.byName || "",
      createdAt: Date.now(),
    };
    safeWrite(STORAGE_KEYS.stockLog, log);
    notify("ingredients");
    notify("stockLog");
    return { id: ingredientId, ...ingredients[ingredientId] };
  },

  onIngredientsChange(cb) {
    listeners.ingredients.add(cb);
    cb(toList(STORAGE_KEYS.ingredients));
    return () => listeners.ingredients.delete(cb);
  },

  onOrdersChange(cb) {
    listeners.orders.add(cb);
    cb(withIds(safeRead(STORAGE_KEYS.orders, {})).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    return () => listeners.orders.delete(cb);
  },

  onProductsChange(cb) {
    listeners.products.add(cb);
    cb(withIds(safeRead(STORAGE_KEYS.products, {})));
    return () => listeners.products.delete(cb);
  },

  onStockLogChange(cb) {
    listeners.stockLog.add(cb);
    cb(withIds(safeRead(STORAGE_KEYS.stockLog, {})).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 200));
    return () => listeners.stockLog.delete(cb);
  },

  async listOrders({ date, status } = {}) {
    let list = withIds(safeRead(STORAGE_KEYS.orders, {}));
    if (date) {
      list = list.filter((o) => String(o.dateKey || "") === String(date));
    }
    if (status && status !== "all") {
      list = list.filter((o) => o.status === status);
    }
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async getOrder(id) {
    const orders = safeRead(STORAGE_KEYS.orders, {});
    return orders[id] ? { id, ...orders[id] } : null;
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (!event.key) return;
    if (event.key === STORAGE_KEYS.orders) notify("orders");
    if (event.key === STORAGE_KEYS.products) notify("products");
    if (event.key === STORAGE_KEYS.stockLog) notify("stockLog");
  });
}

window?.addEventListener?.("beforeunload", () => {
  // no-op; kept to ensure the module loads in the browser without build tools.
});
