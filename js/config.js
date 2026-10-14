// ============================================================================
// Brew POS — Configuration (Firebase Optional)
// ============================================================================
// This system uses localStorage by default. Firebase is only used when
// explicitly enabled via ?firebase=1 URL parameter.
// Project: admin-side-68d3d
// Database: https://admin-side-68d3d-default-rtdb.firebaseio.com
// ============================================================================

// Firebase configuration
// Project: admin-side-68d3d
// Database: https://admin-side-68d3d-default-rtdb.firebaseio.com
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCJqWSXZa9nv5x5G9crKX_Zj192IL6lGUo",
  authDomain: "admin-side-68d3d.firebaseapp.com",
  databaseURL: "https://admin-side-68d3d-default-rtdb.firebaseio.com",
  projectId: "admin-side-68d3d",
  storageBucket: "admin-side-68d3d.firebasestorage.app",
  messagingSenderId: "1050564349697",
  appId: "1:1050564349697:web:602e6c6bc6a702486fd500",
  measurementId: "G-29P7VQ2J3B",
};

export function isFirebaseConfigured() {
  // Firebase is considered configured only when explicitly enabled via URL
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.databaseURL
  );
}

// Placeholder brand info — change freely, or later wire this up to Settings
// so it's editable from inside the app.
export const APP_BRAND = {
  name: "Waffle King",
  tagline: "Waffles. Coffee. Milktea. Done.",
};

export const DEFAULT_SETTINGS = {
  shopName: "Waffle King",
  taxRate: 0.12, // 12% — change in Settings once logged in as admin
  currency: "₱",
  receiptFooter: "Thank you for visiting Waffle King!",
  printer: {
    type: "none", // "none" | "bluetooth" | "wifi"
    name: "",
    ip: "",
    port: 9100,
  },
};
