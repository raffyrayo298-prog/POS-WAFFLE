// ============================================================================
// Brew POS — Order History view
// ============================================================================

import { formatMoney, formatTime, formatDate, dateKey, el, qs, qsa, openModal, toast, customConfirm } from "./utils.js";
import { printReceipt } from "./printer.js";

export async function initHistoryView(root, ctx) {
  console.log("initHistoryView called with ctx:", ctx);
  const { db } = ctx;
  let currentDate = dateKey();
  let currentStatus = "all";
  let searchTerm = "";
  let orders = [];

  if (!root) {
    console.error("initHistoryView: root element is null");
    throw new Error("Root element not found");
  }

  root.innerHTML = `
    <div class="h-full flex flex-col min-h-0">
      <div class="shrink-0 bg-cream-50 border-b border-espresso-100 px-3 sm:px-4 py-3 flex flex-wrap gap-2 items-center">
        <input id="date-filter" type="date" value="${currentDate}"
          class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm" />
        <select id="status-filter" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input id="order-search" type="search" placeholder="Search order # or cashier…"
          class="flex-1 min-w-[160px] rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm" />
        <button id="today-btn" class="rounded-xl bg-cream-200 px-3 py-2 text-sm font-medium">Today</button>
      </div>

      <div class="shrink-0 grid grid-cols-3 gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        <div class="bg-white rounded-xl border border-espresso-100 p-3">
          <p class="text-xs text-espresso-400">Orders</p>
          <p id="stat-count" class="text-xl font-bold">0</p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-3">
          <p class="text-xs text-espresso-400">Sales</p>
          <p id="stat-sales" class="text-xl font-bold">₱0.00</p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-3">
          <p class="text-xs text-espresso-400">Items sold</p>
          <p id="stat-items" class="text-xl font-bold">0</p>
        </div>
      </div>

      <div id="order-list" class="flex-1 overflow-y-auto bp-scroll px-3 sm:px-4 pb-4 flex flex-col gap-2"></div>
    </div>
  `;

  const listEl = qs("#order-list", root);

  async function load() {
    orders = await db.listOrders({ date: currentDate, status: currentStatus });
    render();
  }

  function render() {
    const term = (searchTerm || "").trim().toLowerCase();
    const filtered = orders.filter((o) => {
      if (!term) return true;
      return (
        (o.orderNumber || "").toLowerCase().includes(term) ||
        (o.cashierName || "").toLowerCase().includes(term)
      );
    });

    let itemCount = 0;
    let sales = 0;
    filtered.forEach((o) => {
      if (o.status !== "cancelled") {
        sales += o.total || 0;
        itemCount += Object.values(o.items || {}).reduce((s, i) => s + i.qty, 0);
      }
    });
    qs("#stat-count", root).textContent = filtered.length;
    qs("#stat-sales", root).textContent = formatMoney(sales, ctx.settings.currency);
    qs("#stat-items", root).textContent = itemCount;

    listEl.innerHTML = "";
    if (!filtered.length) {
      listEl.innerHTML = `<div class="text-center text-espresso-400 py-16">
        <p class="text-3xl mb-2">🗂️</p><p class="text-sm">No orders for this filter yet.</p></div>`;
      return;
    }
    filtered.forEach((o) => {
      const itemCountRow = Object.values(o.items || {}).reduce((s, i) => s + i.qty, 0);
      const row = el(
        "button",
        "bp-tap text-left bg-white rounded-xl border border-espresso-100 shadow-card px-4 py-3 flex items-center justify-between gap-3"
      );
      const statusColor =
        o.status === "cancelled" ? "bg-rust-50 text-rust-600" : "bg-sage-50 text-sage-600";
      row.innerHTML = `
        <div class="min-w-0">
          <p class="font-semibold text-sm">Order #${o.orderNumber} <span class="text-espresso-400 font-normal">· ${itemCountRow} item${itemCountRow === 1 ? "" : "s"}</span></p>
          <p class="text-xs text-espresso-500">${formatDate(o.createdAt)}, ${formatTime(o.createdAt)} · ${o.cashierName}</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="text-xs font-medium px-2 py-1 rounded-full ${statusColor} capitalize">${o.status}</span>
          <span class="font-semibold text-sm">${formatMoney(o.total, ctx.settings.currency)}</span>
        </div>
      `;
      row.addEventListener("click", () => openDetail(o));
      listEl.appendChild(row);
    });
  }

  function openDetail(order) {
    const items = Object.values(order.items || {});
    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6">
        <div class="flex justify-between items-start mb-1">
          <h3 class="font-display font-semibold text-xl">Order #${order.orderNumber}</h3>
          <button id="modal-close" class="text-espresso-400 text-2xl leading-none">✕</button>
        </div>
        <p class="text-sm text-espresso-500 mb-4">${formatDate(order.createdAt)}, ${formatTime(order.createdAt)} · ${order.cashierName}</p>

        <div class="divide-y divide-espresso-100 border border-espresso-100 rounded-xl mb-4">
          ${items
            .map(
              (i) => `<div class="px-3 py-2 flex justify-between text-sm">
                <div>
                  <p>${i.qty}x ${i.name}${i.modifiers?.length ? ` (${i.modifiers.join(", ")})` : ""}</p>
                  ${i.note ? `<p class="text-xs text-espresso-400">Note: ${i.note}</p>` : ""}
                </div>
                <span class="font-medium">${formatMoney(i.itemTotal, ctx.settings.currency)}</span>
              </div>`
            )
            .join("")}
        </div>

        <div class="flex justify-between text-sm text-espresso-600 mb-1"><span>Subtotal</span><span>${formatMoney(order.subtotal, ctx.settings.currency)}</span></div>
        ${
          order.discount && order.discount > 0
            ? `<div class="flex justify-between text-sm text-amber-600 mb-1"><span>Discount (${order.discountType || "PWD"})</span><span>-${formatMoney(order.discount, ctx.settings.currency)}</span></div>`
            : ""
        }
        <div class="flex justify-between text-sm text-espresso-600 mb-1"><span>Tax</span><span>${formatMoney(order.tax, ctx.settings.currency)}</span></div>
        <div class="flex justify-between text-lg font-bold mb-3"><span>Total</span><span>${formatMoney(order.total, ctx.settings.currency)}</span></div>
        <p class="text-sm text-espresso-500 mb-4">Paid via ${order.paymentMethod}${order.paymentMethod === "Cash" ? ` · Tendered ${formatMoney(order.amountTendered, ctx.settings.currency)} · Change ${formatMoney(order.change, ctx.settings.currency)}` : ""}</p>

        <div class="flex gap-2">
          <button id="reprint-btn" class="flex-1 bg-espresso-800 text-cream-50 font-semibold rounded-xl py-3 text-sm bp-tap">Reprint receipt</button>
          ${
            ctx.user.role === "admin" && order.status !== "cancelled"
              ? `<button id="cancel-btn" class="flex-1 bg-rust-50 text-rust-600 font-semibold rounded-xl py-3 text-sm bp-tap">Cancel order</button>`
              : ""
          }
        </div>
      </div>
    `);

    qs("#modal-close", panel).addEventListener("click", close);
    qs("#reprint-btn", panel).addEventListener("click", async () => {
      await printReceipt({ settings: ctx.settings, order });
    });
    qs("#cancel-btn", panel)?.addEventListener("click", async () => {
      const confirmed = await customConfirm(`Cancel order #${order.orderNumber}? This can't be undone.`, "Cancel Order");
      if (!confirmed) return;
      await db.cancelOrder(order.id);
      toast(`Order #${order.orderNumber} cancelled.`, "info");
      close();
      load();
    });
  }

  qs("#date-filter", root).addEventListener("change", (e) => {
    currentDate = e.target.value;
    load();
  });
  qs("#status-filter", root).addEventListener("change", (e) => {
    currentStatus = e.target.value;
    load();
  });
  qs("#order-search", root).addEventListener("input", (e) => {
    searchTerm = e.target.value;
    render();
  });
  qs("#today-btn", root).addEventListener("click", () => {
    currentDate = dateKey();
    qs("#date-filter", root).value = currentDate;
    load();
  });

  document.addEventListener("bp:order-created", load);
  document.addEventListener("bp:history-shown", load);

  await load();
}
