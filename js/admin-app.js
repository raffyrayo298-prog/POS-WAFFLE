// ============================================================================
// Admin Portal — shell
// ============================================================================

import { auth, db, isUsingHybrid, getSyncStatus } from "./backend.js";
import { requireAdmin } from "./auth-guard.js";
import { qs, qsa, customAlert } from "./utils.js";
import { initAdminDashboardView } from "./admin-dashboard.js";
import { initAdminInventoryView } from "./admin-inventory.js";
import { initAdminSettingsView } from "./admin-settings.js";
import { initOrderView } from "./order-view.js";
import { initAdminOrderHistoryView } from "./admin-order-history.js";
import { initAdminSalesTrackerView } from "./admin-sales-tracker.js";

let activate = null; // Hoist to module scope

requireAdmin((user) => {
  (async () => {
    try {
      const settings = await db.getSettings();
      setupTopBar(user, settings);
      activate = setupNav();
      setupSyncPill();

      const ctx = { user, db, settings, onSettingsSaved: (saved) => {
        Object.assign(settings, saved);
        qs("#shop-name").textContent = `${settings.shopName || "Brew POS"} — Admin`;
      }};

      // Initialize all views
      try {
        await initAdminDashboardView(qs("#view-dashboard"), ctx);
      } catch (err) {
        console.error("Dashboard view failed:", err);
        qs("#view-dashboard").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load dashboard: ${err.message}</div>`;
      }

      try {
        await initAdminInventoryView(qs("#view-inventory"), ctx);
      } catch (err) {
        console.error("Inventory view failed:", err);
        qs("#view-inventory").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load inventory: ${err.message}</div>`;
      }

      try {
        await initOrderView(qs("#view-pos"), { ...ctx, isAdminMode: true });
      } catch (err) {
        console.error("POS view failed:", err);
        qs("#view-pos").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load POS: ${err.message}</div>`;
      }

      try {
        await initAdminOrderHistoryView(qs("#view-order-history"), ctx);
      } catch (err) {
        console.error("Order History view failed:", err);
        qs("#view-order-history").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load order history: ${err.message}</div>`;
      }

      try {
        await initAdminSalesTrackerView(qs("#view-sales-tracker"), ctx);
      } catch (err) {
        console.error("Sales Tracker view failed:", err);
        qs("#view-sales-tracker").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load sales tracker: ${err.message}</div>`;
      }

      try {
        await initAdminSettingsView(qs("#view-settings"), ctx);
      } catch (err) {
        console.error("Settings view failed:", err);
        qs("#view-settings").innerHTML = `<div class="p-6 text-center text-rust-600">Failed to load settings: ${err.message}</div>`;
      }

      // Ensure dashboard is visible after initialization
      setTimeout(() => activate && activate("dashboard"), 200);
    } catch (err) {
      console.error("Failed to initialize admin app:", err);
      customAlert("Error initializing admin app: " + err.message, "Error");
    }
  })();
});

function setupTopBar(user, settings) {
  qs("#shop-name").textContent = `${settings.shopName || "Brew POS"} — Admin`;
  qs("#user-name").textContent = user.name;
  qs("#user-menu-name").textContent = user.name;
  qs("#user-menu-role").textContent = user.role || "Admin";
  qs("#user-avatar").textContent = (user.name || "?").trim().charAt(0).toUpperCase();

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

  qs("#dropdown-logout-btn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });

  // Handle sidebar and mobile logout buttons
  qsa('[data-action="logout"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = "admin-login.html";
    });
  });
}

function setupNav() {
  const buttons = qsa(".bp-nav-btn");

  function activate(tab) {
    if (tab === "logout") {
      auth.signOut().then(() => {
        window.location.href = "admin-login.html";
      });
      return;
    }

    // Update button styles
    buttons.forEach((b) => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle("bg-espresso-900", isActive);
      b.classList.toggle("text-cream-50", isActive);
      b.classList.toggle("text-espresso-200", !isActive);
    });

    // Show/hide views
    const main = qs("#admin-main");
    if (main) main.classList.toggle("bp-order-main", tab === "pos");

    ["dashboard", "inventory", "pos", "order-history", "sales-tracker", "settings"].forEach((t) => {
      const el = qs(`#view-${t}`);
      if (el) {
        el.classList.toggle("hidden", t !== tab);
      }
    });
  }

  // Add click listeners to all navigation buttons
  buttons.forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tab = b.dataset.tab;
      activate(tab);
    });
  });

  // Initialize with dashboard visible
  setTimeout(() => activate("dashboard"), 100);

  return activate;
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
