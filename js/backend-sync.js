// ============================================================================
// Brew POS — Hybrid Sync Layer (Local + Firebase)
// ============================================================================
// Provides offline-first storage with Firebase sync when online
// All writes go to localStorage immediately, then sync to Firebase when online
// Reads from localStorage for instant access, with background sync from Firebase
// ============================================================================

import { localAuth, localDb } from "./backend-local.js";
import { isFirebaseConfigured } from "./config.js";

// Sync state
const syncState = {
  isOnline: navigator.onLine,
  syncQueue: [],
  isSyncing: false,
  firebaseAvailable: false,
  firebaseAuth: null,
  firebaseDb: null
};

// Load sync queue from localStorage
function loadSyncQueue() {
  try {
    const queue = localStorage.getItem('brewpos_sync_queue');
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

// Save sync queue to localStorage
function saveSyncQueue() {
  try {
    localStorage.setItem('brewpos_sync_queue', JSON.stringify(syncState.syncQueue));
  } catch (e) {
    console.warn('Failed to save sync queue:', e);
  }
}

// Initialize sync queue
syncState.syncQueue = loadSyncQueue();

// Initialize Firebase if configured
async function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured, using local-only mode');
    return false;
  }

  try {
    const { firebaseAuth, firebaseDb, initFirebase } = await import("./backend-firebase.js");
    initFirebase();
    syncState.firebaseAuth = firebaseAuth;
    syncState.firebaseDb = firebaseDb;
    syncState.firebaseAvailable = true;
    console.log('Firebase initialized for sync');
    return true;
  } catch (err) {
    console.warn('Firebase initialization failed, using local-only mode:', err);
    return false;
  }
}

// Queue a Firebase write operation
function queueFirebaseWrite(operation) {
  syncState.syncQueue.push({
    ...operation,
    timestamp: Date.now(),
    attempts: 0
  });
  saveSyncQueue();
  processSyncQueue();
}

// Process the sync queue when online
async function processSyncQueue() {
  if (!syncState.isOnline || !syncState.firebaseAvailable || syncState.isSyncing) {
    return;
  }

  if (syncState.syncQueue.length === 0) {
    return;
  }

  syncState.isSyncing = true;
  console.log(`Processing ${syncState.syncQueue.length} queued operations...`);

  const queue = [...syncState.syncQueue];
  const remaining = [];

  for (const op of queue) {
    try {
      await executeFirebaseOperation(op);
      console.log('Synced operation:', op.type);
    } catch (err) {
      console.warn('Failed to sync operation:', op.type, err);
      op.attempts++;
      if (op.attempts < 5) {
        remaining.push(op);
      } else {
        console.error('Dropping operation after 5 failed attempts:', op);
      }
    }
  }

  syncState.syncQueue = remaining;
  saveSyncQueue();
  syncState.isSyncing = false;

  if (remaining.length > 0) {
    // Retry after delay
    setTimeout(processSyncQueue, 5000);
  }
}

// Execute a queued Firebase operation
async function executeFirebaseOperation(op) {
  const db = syncState.firebaseDb;
  if (!db) throw new Error('Firebase DB not available');

  switch (op.type) {
    case 'saveCategory':
      await db.saveCategory(op.id, op.data);
      break;
    case 'deleteCategory':
      await db.deleteCategory(op.id);
      break;
    case 'saveProduct':
      await db.saveProduct(op.id, op.data);
      break;
    case 'deleteProduct':
      await db.deleteProduct(op.id);
      break;
    case 'saveSettings':
      await db.saveSettings(op.patch);
      break;
    case 'createOrder':
      await db.createOrder(op.order);
      break;
    case 'updateOrder':
      await db.updateOrder(op.id, op.patch);
      break;
    case 'cancelOrder':
      await db.cancelOrder(op.id);
      break;
    case 'adjustStock':
      await db.adjustStock(op.productId, op.delta, op.meta);
      break;
    case 'saveIngredient':
      await db.saveIngredient(op.id, op.data);
      break;
    case 'deleteIngredient':
      await db.deleteIngredient(op.id);
      break;
    case 'adjustIngredientStock':
      await db.adjustIngredientStock(op.ingredientId, op.delta, op.meta);
      break;
    default:
      console.warn('Unknown operation type:', op.type);
  }
}

// Sync from Firebase to localStorage (one-way sync for reads)
async function syncFromFirebase() {
  if (!syncState.isOnline || !syncState.firebaseAvailable) {
    return;
  }

  try {
    const db = syncState.firebaseDb;
    console.log('Syncing data from Firebase to localStorage...');

    // Sync categories
    const categories = await db.listCategories();
    if (categories.length > 0) {
      const categoriesObj = {};
      categories.forEach(cat => {
        categoriesObj[cat.id] = cat;
      });
      localStorage.setItem('brewpos_categories', JSON.stringify(categoriesObj));
    }

    // Sync products
    const products = await db.listProducts();
    if (products.length > 0) {
      const productsObj = {};
      products.forEach(prod => {
        productsObj[prod.id] = prod;
      });
      localStorage.setItem('brewpos_products', JSON.stringify(productsObj));
    }

    // Sync settings
    const settings = await db.getSettings();
    if (settings) {
      localStorage.setItem('brewpos_settings', JSON.stringify(settings));
    }

    // Sync orders (last 1000)
    const orders = await db.listOrders({ limit: 1000 });
    if (orders.length > 0) {
      const ordersObj = {};
      orders.forEach(order => {
        ordersObj[order.id] = order;
      });
      localStorage.setItem('brewpos_orders', JSON.stringify(ordersObj));
    }

    // Sync ingredients
    const ingredients = await db.listIngredients();
    if (ingredients.length > 0) {
      const ingredientsObj = {};
      ingredients.forEach(ing => {
        ingredientsObj[ing.id] = ing;
      });
      localStorage.setItem('brewpos_ingredients', JSON.stringify(ingredientsObj));
    }

    console.log('Firebase sync completed');
  } catch (err) {
    console.warn('Firebase sync failed:', err);
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  syncState.isOnline = true;
  console.log('App is online, starting sync...');
  processSyncQueue();
  syncFromFirebase();
});

window.addEventListener('offline', () => {
  syncState.isOnline = false;
  console.log('App is offline, using local storage');
});

// Create hybrid auth object
export const hybridAuth = {
  getCurrentUser() {
    // Always check local first for instant access
    const localUser = localAuth.getCurrentUser();
    if (localUser) return localUser;

    // Fall back to Firebase if available
    if (syncState.firebaseAvailable && syncState.firebaseAuth) {
      return syncState.firebaseAuth.getCurrentUser();
    }

    return null;
  },

  onAuthChange(cb) {
    // Listen to local auth changes
    const localUnsub = localAuth.onAuthChange((user) => {
      cb(user);
    });

    // Also listen to Firebase if available
    let firebaseUnsub = () => {};
    if (syncState.firebaseAvailable && syncState.firebaseAuth) {
      firebaseUnsub = syncState.firebaseAuth.onAuthChange((user) => {
        // Only update if local doesn't have a user
        if (!localAuth.getCurrentUser()) {
          cb(user);
        }
      });
    }

    return () => {
      localUnsub();
      firebaseUnsub();
    };
  },

  async signUp(payload) {
    // Sign up locally first
    const localUser = await localAuth.signUp(payload);

    // Queue Firebase signup if online
    if (syncState.firebaseAvailable && syncState.isOnline) {
      try {
        await syncState.firebaseAuth.signUp(payload);
      } catch (err) {
        console.warn('Firebase signup failed:', err);
      }
    } else if (syncState.firebaseAvailable) {
      queueFirebaseWrite({
        type: 'signUp',
        payload
      });
    }

    return localUser;
  },

  async signIn(payload) {
    // Sign in locally first
    const localUser = await localAuth.signIn(payload);

    // Also sign in to Firebase if available
    if (syncState.firebaseAvailable && syncState.isOnline) {
      try {
        await syncState.firebaseAuth.signIn(payload);
      } catch (err) {
        console.warn('Firebase sign in failed:', err);
      }
    }

    return localUser;
  },

  async signOut() {
    // Sign out locally
    await localAuth.signOut();

    // Sign out from Firebase if available
    if (syncState.firebaseAvailable && syncState.firebaseAuth) {
      try {
        await syncState.firebaseAuth.signOut();
      } catch (err) {
        console.warn('Firebase sign out failed:', err);
      }
    }
  }
};

// Create hybrid database object
export const hybridDb = {
  async listCategories() {
    // Always read from local for instant access
    return localDb.listCategories();
  },

  async saveCategory(id, data) {
    // Save locally first
    await localDb.saveCategory(id, data);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'saveCategory', id, data });
    }
  },

  async deleteCategory(id) {
    // Delete locally first
    await localDb.deleteCategory(id);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'deleteCategory', id });
    }
  },

  async listProducts() {
    // Always read from local for instant access
    return localDb.listProducts();
  },

  async saveProduct(id, data) {
    // Save locally first
    await localDb.saveProduct(id, data);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'saveProduct', id, data });
    }
  },

  async deleteProduct(id) {
    // Delete locally first
    await localDb.deleteProduct(id);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'deleteProduct', id });
    }
  },

  async getSettings() {
    // Always read from local for instant access
    return localDb.getSettings();
  },

  async saveSettings(patch) {
    // Save locally first
    await localDb.saveSettings(patch);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'saveSettings', patch });
    }
  },

  async nextOrderNumber() {
    return localDb.nextOrderNumber();
  },

  async createOrder(order) {
    // Create locally first
    const result = await localDb.createOrder(order);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'createOrder', order });
    }

    return result;
  },

  async updateOrder(id, patch) {
    // Update locally first
    await localDb.updateOrder(id, patch);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'updateOrder', id, patch });
    }
  },

  async cancelOrder(id) {
    // Cancel locally first
    await localDb.cancelOrder(id);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'cancelOrder', id });
    }
  },

  async adjustStock(productId, delta, meta = {}) {
    // Adjust locally first
    await localDb.adjustStock(productId, delta, meta);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'adjustStock', productId, delta, meta });
    }
  },

  async listStockLog(options) {
    return localDb.listStockLog(options);
  },

  async listIngredients() {
    return localDb.listIngredients();
  },

  async saveIngredient(id, data) {
    // Save locally first
    await localDb.saveIngredient(id, data);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'saveIngredient', id, data });
    }
  },

  async deleteIngredient(id) {
    // Delete locally first
    await localDb.deleteIngredient(id);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'deleteIngredient', id });
    }
  },

  async adjustIngredientStock(ingredientId, delta, meta = {}) {
    // Adjust locally first
    await localDb.adjustIngredientStock(ingredientId, delta, meta);

    // Queue Firebase write
    if (syncState.firebaseAvailable) {
      queueFirebaseWrite({ type: 'adjustIngredientStock', ingredientId, delta, meta });
    }
  },

  onOrdersChange(cb) {
    return localDb.onOrdersChange(cb);
  },

  onProductsChange(cb) {
    return localDb.onProductsChange(cb);
  },

  onStockLogChange(cb) {
    return localDb.onStockLogChange(cb);
  },

  onIngredientsChange(cb) {
    return localDb.onIngredientsChange(cb);
  },

  async listOrders(options) {
    return localDb.listOrders(options);
  },

  async getOrder(id) {
    return localDb.getOrder(id);
  }
};

// Initialize Firebase on load
initFirebase();

// Check initial online status
if (!navigator.onLine) {
  syncState.isOnline = false;
  console.log('Starting in offline mode');
}

// Export sync state for monitoring
export function getSyncStatus() {
  return {
    isOnline: syncState.isOnline,
    firebaseAvailable: syncState.firebaseAvailable,
    queueLength: syncState.syncQueue.length,
    isSyncing: syncState.isSyncing
  };
}
