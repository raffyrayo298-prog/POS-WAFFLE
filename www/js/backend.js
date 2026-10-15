// ============================================================================
// Brew POS — Backend selector (Hybrid Sync Mode)
// ============================================================================
// Uses hybrid sync mode by default: localStorage for offline access + Firebase sync when online
// This ensures the app works offline while still backing up to Firebase
// ============================================================================
// Every page imports { auth, db, backendMode } from here.
// ============================================================================
import { isFirebaseConfigured } from "./config.js";
import { localAuth, localDb } from "./backend-local.js";

export let backendMode = "hybrid";

const STALE_FIREBASE_KEYS = [
  "brewpos_force_firebase",
  "brewpos_firebase_mode",
  "firebase_debug_mode",
];

function clearStaleFirebaseState() {
  for (const key of STALE_FIREBASE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access issues in restricted contexts.
    }
  }
}

function isPermissionDenied(err) {
  return Boolean(
    err && (
      err?.message?.includes("Permission denied") ||
      err?.code === "PERMISSION_DENIED" ||
      err?.message?.includes("permission")
    )
  );
}

function firebaseOverrideEnabled() {
  try {
    const query = new URLSearchParams(window.location.search);
    const queryOverride = query.get("firebase") === "1";

    // Always clear stale debug flags. Firebase must never auto-enable itself from
    // an old browser session or a prior debug run.
    clearStaleFirebaseState();

    return isFirebaseConfigured() && queryOverride;
  } catch {
    return false;
  }
}

function localOnlyOverrideEnabled() {
  try {
    const query = new URLSearchParams(window.location.search);
    return query.get("local") === "1";
  } catch {
    return false;
  }
}

const state = {
  auth: localAuth,
  db: localDb,
};

async function tryInitBackend() {
  // Check for local-only override
  if (localOnlyOverrideEnabled()) {
    console.log("Using local-only backend (local=1 in URL)");
    state.auth = localAuth;
    state.db = localDb;
    backendMode = "local";
    return;
  }

  // Check for Firebase-only override
  if (firebaseOverrideEnabled()) {
    if (!isFirebaseConfigured()) {
      console.log("Firebase not configured, falling back to hybrid mode");
      // Fall through to hybrid mode
    } else {
      try {
        const { firebaseAuth, firebaseDb, initFirebase } = await import("./backend-firebase.js");
        const localUser = localAuth.getCurrentUser?.();

        if (localUser) {
          state.auth = localAuth;
          state.db = localDb;
          backendMode = "local";
          console.log("Using local backend (local user exists, firebase=1 override ignored)");
          return;
        }

        // Initialize Firebase explicitly
        initFirebase();

        state.auth = firebaseAuth;
        state.db = firebaseDb;
        backendMode = "firebase";
        console.log("Firebase backend enabled via explicit opt-in (?firebase=1)");
        return;
      } catch (err) {
        if (isPermissionDenied(err)) {
          console.warn("Firebase access blocked by database rules; falling back to hybrid mode.");
        } else {
          console.warn("Firebase init failed; falling back to hybrid mode:", err?.message || err);
        }
        // Fall through to hybrid mode
      }
    }
  }

  // Default: Use hybrid sync mode
  try {
    const { hybridAuth, hybridDb } = await import("./backend-sync.js");
    state.auth = hybridAuth;
    state.db = hybridDb;
    backendMode = "hybrid";
    console.log("Using hybrid sync mode (localStorage + Firebase sync when online)");
  } catch (err) {
    console.warn("Hybrid sync mode failed, falling back to local-only:", err);
    state.auth = localAuth;
    state.db = localDb;
    backendMode = "local";
  }
}

tryInitBackend();

export const auth = {
  getCurrentUser() {
    return state.auth?.getCurrentUser?.() ?? localAuth.getCurrentUser?.() ?? null;
  },
  onAuthChange(cb) {
    return state.auth?.onAuthChange?.(cb) ?? localAuth.onAuthChange(cb);
  },
  async signUp(payload) {
    return state.auth?.signUp?.(payload) ?? localAuth.signUp(payload);
  },
  async signIn(payload) {
    return state.auth?.signIn?.(payload) ?? localAuth.signIn(payload);
  },
  async signOut() {
    return state.auth?.signOut?.() ?? localAuth.signOut();
  },
};

export const db = {
  async listCategories() {
    return state.db.listCategories();
  },
  async saveCategory(id, data) {
    return state.db.saveCategory(id, data);
  },
  async deleteCategory(id) {
    return state.db.deleteCategory(id);
  },
  async listProducts() {
    return state.db.listProducts();
  },
  async saveProduct(id, data) {
    return state.db.saveProduct(id, data);
  },
  async deleteProduct(id) {
    return state.db.deleteProduct(id);
  },
  async getSettings() {
    return state.db.getSettings();
  },
  async saveSettings(patch) {
    return state.db.saveSettings(patch);
  },
  async nextOrderNumber() {
    return state.db.nextOrderNumber();
  },
  async createOrder(order) {
    return state.db.createOrder(order);
  },
  async updateOrder(id, patch) {
    return state.db.updateOrder(id, patch);
  },
  async cancelOrder(id) {
    return state.db.cancelOrder(id);
  },
  async adjustStock(productId, delta, meta = {}) {
    return state.db.adjustStock(productId, delta, meta);
  },
  async listStockLog(options) {
    return state.db.listStockLog(options);
  },
  async listIngredients() {
    return state.db.listIngredients?.() || [];
  },
  async saveIngredient(id, data) {
    return state.db.saveIngredient?.(id, data);
  },
  async deleteIngredient(id) {
    return state.db.deleteIngredient?.(id);
  },
  async adjustIngredientStock(ingredientId, delta, meta = {}) {
    return state.db.adjustIngredientStock?.(ingredientId, delta, meta);
  },
  onOrdersChange(cb) {
    return state.db.onOrdersChange(cb);
  },
  onProductsChange(cb) {
    return state.db.onProductsChange(cb);
  },
  onStockLogChange(cb) {
    return state.db.onStockLogChange(cb);
  },
  onIngredientsChange(cb) {
    return state.db.onIngredientsChange?.(cb) || (() => {});
  },
  async listOrders(options) {
    return state.db.listOrders(options);
  },
  async getOrder(id) {
    return state.db.getOrder(id);
  },
};

export function isUsingFirebase() {
  return backendMode === "firebase";
}

export function isUsingHybrid() {
  return backendMode === "hybrid";
}

export async function getSyncStatus() {
  if (backendMode === "hybrid") {
    try {
      const { getSyncStatus } = await import("./backend-sync.js");
      return getSyncStatus();
    } catch {
      return null;
    }
  }
  return null;
}
