// ============================================================================
// Admin Portal — Realtime dashboard
// ============================================================================
// Live sales tracker: KPI cards for "today", a running feed of the most
// recent orders, and a low-stock alert banner. Updates automatically via the
// backend's onOrdersChange/onProductsChange listeners — no manual refresh
// needed (works over Firebase Realtime Database, or across tabs in local
// mode).
// ============================================================================

import { formatMoney, formatTime, formatDate, dateKey, el, qs, customConfirm, customAlert } from "./utils.js";

export async function initAdminDashboardView(root, ctx) {
  console.log("initAdminDashboardView called with ctx:", ctx);
  const { db, settings } = ctx;
  let orders = [];
  let products = [];
  let ingredients = [];
  let customerOrders = [];

  if (!root) {
    console.error("initAdminDashboardView: root element is null");
    throw new Error("Root element not found");
  }

  root.innerHTML = `
    <div class="p-2 sm:p-3 md:p-6 w-full flex flex-col gap-3 sm:gap-4">
      <div id="low-stock-banner" class="hidden bg-gradient-to-r from-rust-50 to-rust-100 border border-rust-200 text-rust-700 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium shadow-md"></div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div class="stat-card bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Today's Revenue</p>
          <p id="kpi-revenue" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
        </div>
        <div class="stat-card bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Today's Orders</p>
          <p id="kpi-orders" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
        </div>
        <div class="stat-card bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Items Sold Today</p>
          <p id="kpi-items" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
        </div>
        <div class="stat-card bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Avg. Order Value</p>
          <p id="kpi-avg" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-3 sm:gap-4">
        <div class="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl border border-espresso-100 shadow-lg p-3 sm:p-5">
          <div class="flex items-center justify-between mb-2 sm:mb-3">
            <h2 class="font-display font-semibold text-base sm:text-lg">Live Sales Feed</h2>
            <span class="flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <span class="w-2 h-2 rounded-full bg-emerald-500 bp-pulse"></span> Updating live
            </span>
          </div>
          <div id="live-feed" class="flex flex-col divide-y divide-espresso-100 max-h-[20rem] sm:max-h-[28rem] overflow-y-auto bp-scroll"></div>
        </div>

        <div class="bg-white rounded-xl sm:rounded-2xl border border-espresso-100 shadow-lg p-3 sm:p-5">
          <h2 class="font-display font-semibold text-base sm:text-lg mb-2 sm:mb-3">Top Sellers Today</h2>
          <div id="top-sellers" class="flex flex-col gap-2"></div>
        </div>
      </div>

      <div class="bg-white rounded-xl sm:rounded-2xl border border-espresso-100 shadow-lg p-3 sm:p-5">
        <div class="flex items-center justify-between mb-2 sm:mb-3">
          <h2 class="font-display font-semibold text-base sm:text-lg">Recent Customer Orders</h2>
          <span class="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
            <span class="w-2 h-2 rounded-full bg-amber-500 bp-pulse"></span> Last 50 Orders
          </span>
        </div>
        <div id="customer-orders" class="flex flex-col divide-y divide-espresso-100 max-h-[20rem] sm:max-h-[24rem] overflow-y-auto bp-scroll"></div>
      </div>
    </div>
  `;

  function isToday(ts) {
    return dateKey(ts) === dateKey();
  }

  async function loadData() {
    const [ordersData, productsData] = await Promise.all([
      db.listOrders(),
      db.listProducts(),
    ]);
    orders = ordersData;
    products = productsData;
    try {
      ingredients = await db.listIngredients();
    } catch (err) {
      console.warn("Ingredients not available in dashboard:", err);
      ingredients = [];
    }
    render();
  }

  function render() {
    const todays = orders.filter((o) => isToday(o.createdAt) && o.status !== "cancelled");
    const revenue = todays.reduce((s, o) => s + (o.total || 0), 0);
    const itemCount = (o) => Object.values(o.items || {}).reduce((s, i) => s + (i.qty || 0), 0);
    const items = todays.reduce((s, o) => s + itemCount(o), 0);

    qs("#kpi-revenue", root).textContent = formatMoney(revenue, settings.currency);
    qs("#kpi-orders", root).textContent = todays.length;
    qs("#kpi-items", root).textContent = items;
    qs("#kpi-avg", root).textContent = formatMoney(todays.length ? revenue / todays.length : 0, settings.currency);

    // Live feed — most recent 25 orders overall (not just today) so the
    // screen still shows activity right after midnight.
    const feed = qs("#live-feed", root);
    feed.innerHTML = "";
    const recent = orders.slice(0, 25);
    if (!recent.length) {
      feed.innerHTML = `<p class="text-center text-espresso-400 py-6">No sales yet.</p>`;
    }
    recent.forEach((o) => {
      const row = el("div", "flex items-center justify-between py-2.5 gap-3");
      const cancelled = o.status === "cancelled";
      row.innerHTML = `
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">Order #${o.orderNumber} ${cancelled ? '<span class="text-xs text-rust-500">(cancelled)</span>' : ""}</p>
          <p class="text-xs text-espresso-500">${formatTime(o.createdAt)} · ${o.cashierName || "—"} · ${itemCount(o)} items · ${o.paymentMethod || ""}</p>
        </div>
        <p class="text-sm font-semibold ${cancelled ? "text-espresso-300 line-through" : "text-espresso-900"}">${formatMoney(o.total, settings.currency)}</p>
      `;
      feed.appendChild(row);
    });

    // Top sellers today
    const sales = {};
    todays.forEach((o) => {
      Object.values(o.items || {}).forEach((i) => {
        sales[i.productId] = (sales[i.productId] || 0) + i.qty;
        sales[`${i.productId}__name`] = i.name;
      });
    });
    const top = Object.entries(sales)
      .filter(([k]) => !k.endsWith("__name"))
      .map(([id, qty]) => ({ name: sales[`${id}__name`], qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    const topEl = qs("#top-sellers", root);
    topEl.innerHTML = "";
    if (!top.length) {
      topEl.innerHTML = `<p class="text-sm text-espresso-400">No sales yet today.</p>`;
    }
    const maxQty = Math.max(...top.map((t) => t.qty), 1);
    top.forEach((t) => {
      const row = el("div", "flex flex-col gap-1");
      row.innerHTML = `
        <div class="flex justify-between text-xs">
          <span class="font-medium truncate pr-2">${t.name}</span>
          <span class="text-espresso-500 shrink-0">${t.qty} sold</span>
        </div>
        <div class="h-1.5 rounded-full bg-cream-100 overflow-hidden">
          <div class="h-full bg-amber-500 rounded-full" style="width:${(t.qty / maxQty) * 100}%"></div>
        </div>
      `;
      topEl.appendChild(row);
    });

    // Customer orders - last 50 orders with details
    const customerOrdersEl = qs("#customer-orders", root);
    customerOrdersEl.innerHTML = "";
    const recentCustomerOrders = orders.slice(0, 50);
    if (!recentCustomerOrders.length) {
      customerOrdersEl.innerHTML = `<p class="text-center text-espresso-400 py-6">No orders yet.</p>`;
    }
    recentCustomerOrders.forEach((o) => {
      const orderItems = Object.values(o.items || {});
      const orderItemsStr = orderItems.map((i) => `${i.qty}x ${i.name}`).join(", ");
      const row = el("div", "flex flex-col gap-1 py-3 px-3 sm:px-4 hover:bg-cream-50 rounded-lg transition-colors cursor-pointer");
      const cancelled = o.status === "cancelled";
      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-semibold text-espresso-900">Order #${o.orderNumber} ${cancelled ? '<span class="text-xs text-rust-500 ml-2">(cancelled)</span>' : ""}</p>
            <p class="text-[10px] sm:text-xs text-espresso-500">${formatDate(o.createdAt)} at ${formatTime(o.createdAt)} · ${o.cashierName || "—"}</p>
          </div>
          <p class="text-xs sm:text-sm font-bold ${cancelled ? "text-espresso-300 line-through" : "text-espresso-900"} ml-2">${formatMoney(o.total, settings.currency)}</p>
        </div>
        <div class="flex flex-wrap gap-2 mt-1">
          <span class="text-[10px] sm:text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">${itemCount(o)} items</span>
          <span class="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">${o.paymentMethod || "Cash"}</span>
        </div>
        <p class="text-[10px] sm:text-xs text-espresso-600 truncate">${orderItemsStr}</p>
      `;
      row.addEventListener("click", async () => {
        const confirmed = await customConfirm(`View details for Order #${o.orderNumber}?`, "View Order Details");
        if (confirmed) {
          const details = `Order #${o.orderNumber}\n\nItems: ${orderItemsStr}\nTotal: ${formatMoney(o.total, settings.currency)}\nPayment: ${o.paymentMethod}\nStatus: ${o.status}`;
          await customAlert(details, `Order #${o.orderNumber}`);
        }
      });
      customerOrdersEl.appendChild(row);
    });

    // Low/out ingredients banner
    const lowOrOut = ingredients.filter((i) => {
      const stock = i.stock ?? 0;
      const threshold = i.lowStockThreshold ?? 0;
      return stock <= threshold;
    });
    const banner = qs("#low-stock-banner", root);
    if (lowOrOut.length) {
      banner.classList.remove("hidden");
      banner.textContent = `⚠️ ${lowOrOut.length} ingredient${lowOrOut.length > 1 ? "s are" : " is"} low or out of stock: ${lowOrOut.slice(0, 5).map((i) => `${i.name} (${i.stock} ${i.unit})`).join(", ")}${lowOrOut.length > 5 ? "…" : ""} — see Inventory.`;
    } else {
      banner.classList.add("hidden");
    }
  }

  db.onOrdersChange((list) => {
    orders = list;
    customerOrders = list;
    render();
  });
  db.onProductsChange((list) => {
    products = list;
    render();
  });
  db.onIngredientsChange((list) => {
    ingredients = list;
    render();
  });

  await loadData();
}
