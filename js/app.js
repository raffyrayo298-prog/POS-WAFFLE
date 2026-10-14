// ============================================================================
// Brew POS — App shell
// ============================================================================

import { auth, db, isUsingHybrid, getSyncStatus } from "./backend.js";
import { requireAuth } from "./auth-guard.js";
import { printerManager } from "./printer.js";
import { qs, qsa, customAlert } from "./utils.js";
import { initOrderView } from "./order-view.js";
import { initHistoryView } from "./history-view.js";
import { initSettingsView } from "./settings-view.js";

requireAuth((user) => {
  (async () => {
    try {
      const settings = await db.getSettings();
      setupTopBar(user, settings);
      const activate = setupNav();
      setupPrinterPill(settings);
      setupSyncPill();

      // Mount all views once; switching tabs just toggles visibility so
      // in-progress cart state / filters aren't lost.
      try {
        await initOrderView(qs("#view-order"), { user, db, settings });
      } catch (err) {
        console.error("Order view failed:", err);
        qs("#view-order").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load order view: ${err.message}</div>`;
      }

      try {
        await initHistoryView(qs("#view-history"), { user, db, settings });
      } catch (err) {
        console.error("History view failed:", err);
        qs("#view-history").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load history: ${err.message}</div>`;
      }

      try {
        await initSettingsView(qs("#view-settings"), { user, db, settings, onSettingsSaved: (s) => {
          Object.assign(settings, s);
          qs("#shop-name").textContent = settings.shopName || "Brew POS";
        }});
      } catch (err) {
        console.error("Settings view failed:", err);
        qs("#view-settings").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load settings: ${err.message}</div>`;
      }

      // Ensure order view is visible after initialization
      setTimeout(() => activate("order"), 200);
    } catch (err) {
      console.error("Failed to initialize app:", err);
      customAlert("Error initializing app: " + err.message, "Error");
    }
  })();
});

function setupTopBar(user, settings) {
  qs("#shop-name").textContent = settings.shopName || "Brew POS";
  qs("#user-name").textContent = user.name;
  qs("#user-menu-name").textContent = user.name;
  qs("#user-menu-role").textContent = user.role;
  qs("#user-avatar").textContent = (user.name || "?").trim().charAt(0).toUpperCase();
  if (user.role === "admin") qs("#admin-portal-link").classList.remove("hidden");

  const menuBtn = qs("#user-menu-btn");
  const menu = qs("#user-menu");

  menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!menuBtn.contains(event.target) && !menu.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });

  qs("#logout-btn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
}

function setupNav() {
  const buttons = qsa(".bp-nav-btn");
  console.log("Setting up app navigation, found", buttons.length, "buttons");

  function activate(tab) {
    console.log("App nav: activating tab", tab);
    buttons.forEach((b) => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle("bg-espresso-900", isActive);
      b.classList.toggle("text-cream-50", isActive);
      b.classList.toggle("text-espresso-200", !isActive);
    });

    const orderView = qs("#view-order");
    const historyView = qs("#view-history");
    const settingsView = qs("#view-settings");
    const main = qs("#app-main");

    if (orderView) orderView.classList.toggle("hidden", tab !== "order");
    if (historyView) historyView.classList.toggle("hidden", tab !== "history");
    if (settingsView) settingsView.classList.toggle("hidden", tab !== "settings");
    if (main) main.classList.toggle("bp-order-main", tab === "order");

    if (tab === "history") document.dispatchEvent(new CustomEvent("bp:history-shown"));
  }

  buttons.forEach((b) => {
    console.log("Adding click listener to button with tab:", b.dataset.tab);
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tab = b.dataset.tab;
      console.log("Button clicked, tab:", tab);
      activate(tab);
    });
  });

  return activate;
}

function setupPrinterPill(settings) {
  const pill = qs("#printer-pill");
  const dot = qs("#printer-dot");
  const label = qs("#printer-label");

  printerManager.onChange((status) => {
    dot.classList.toggle("bg-rust-500", !status.connected);
    dot.classList.toggle("bg-sage-500", status.connected);
    dot.classList.toggle("bp-pulse", status.connected);
    label.textContent = status.connected ? status.label : "No printer";
  });

  pill.addEventListener("click", () => {
    qsa(".bp-nav-btn")[2].click(); // jump to Settings
  });
}

function setupSyncPill() {
  if (!isUsingHybrid()) {
    return;
  }

  const pill = qs("#sync-pill");
  const dot = qs("#sync-dot");
  const label = qs("#sync-label");

  if (!pill) return;

  pill.classList.remove("hidden");

  // Update sync status every 2 seconds
  setInterval(async () => {
    try {
      const status = await getSyncStatus();
      if (!status) return;

      if (status.isOnline && status.firebaseAvailable) {
        if (status.queueLength > 0) {
          dot.classList.remove("bg-emerald-400", "bg-amber-400", "bg-rust-500");
          dot.classList.add("bg-amber-400");
          dot.classList.add("animate-pulse");
          label.textContent = `Syncing (${status.queueLength})`;
        } else {
          dot.classList.remove("bg-emerald-400", "bg-amber-400", "bg-rust-500");
          dot.classList.add("bg-emerald-400");
          dot.classList.remove("animate-pulse");
          label.textContent = "Synced";
        }
      } else {
        dot.classList.remove("bg-emerald-400", "bg-amber-400", "bg-rust-500");
        dot.classList.add("bg-rust-500");
        dot.classList.remove("animate-pulse");
        label.textContent = "Offline";
      }
    } catch (err) {
      console.warn("Failed to get sync status:", err);
    }
  }, 2000);

  // Initial update
  setTimeout(async () => {
    try {
      const status = await getSyncStatus();
      if (status && status.isOnline && status.firebaseAvailable) {
        pill.classList.remove("hidden");
      }
    } catch (err) {
      console.warn("Failed to check sync status:", err);
    }
  }, 1000);
}
