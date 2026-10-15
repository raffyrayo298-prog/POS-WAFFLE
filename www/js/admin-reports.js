// ============================================================================
// Admin Portal — Sales Reports (print + CSV export)
// ============================================================================

import { formatMoney, formatDate, formatTime, dateKey, el, qs, toast } from "./utils.js";

export async function initAdminReportsView(root, ctx) {
  const { db, settings } = ctx;
  let allOrders = [];
  let products = [];

  root.innerHTML = `
    <div class="p-3 sm:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <h2 class="font-display font-semibold text-lg mb-4">Generate Sales Report</h2>
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Range</span>
            <select id="rep-range" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
              <option value="today">Today</option>
              <option value="week" selected>Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
              <option value="all">All time</option>
            </select>
          </label>
          <label id="rep-from-wrap" class="hidden flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">From</span>
            <input id="rep-from" type="date" class="rounded-xl border border-espresso-100 px-3 py-2 text-sm" />
          </label>
          <label id="rep-to-wrap" class="hidden flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">To</span>
            <input id="rep-to" type="date" class="rounded-xl border border-espresso-100 px-3 py-2 text-sm" />
          </label>
          <button id="rep-generate" class="bp-tap bg-espresso-800 text-cream-50 rounded-xl px-4 py-2.5 text-sm font-semibold">Generate</button>
          <button id="rep-print" disabled class="bp-tap bg-sage-600 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">🖨️ Print</button>
          <button id="rep-csv" disabled class="bp-tap bg-espresso-100 disabled:opacity-40 text-espresso-800 rounded-xl px-4 py-2.5 text-sm font-semibold">⬇ Export CSV</button>
        </div>
      </div>

      <div id="report-output"></div>
    </div>
  `;

  let currentReport = null;

  qs("#rep-range", root).addEventListener("change", (e) => {
    const custom = e.target.value === "custom";
    qs("#rep-from-wrap", root).classList.toggle("hidden", !custom);
    qs("#rep-from-wrap", root).classList.toggle("flex", custom);
    qs("#rep-to-wrap", root).classList.toggle("hidden", !custom);
    qs("#rep-to-wrap", root).classList.toggle("flex", custom);
  });

  qs("#rep-generate", root).addEventListener("click", async () => {
    if (!allOrders.length && !products.length) {
      [allOrders, products] = await Promise.all([db.listOrders(), db.listProducts()]);
    }
    currentReport = buildReport();
    renderReport(currentReport);
    qs("#rep-print", root).disabled = false;
    qs("#rep-csv", root).disabled = false;
  });

  qs("#rep-print", root).addEventListener("click", () => {
    if (currentReport) printReport(currentReport, settings);
  });

  qs("#rep-csv", root).addEventListener("click", () => {
    if (currentReport) exportCsv(currentReport, settings);
  });

  function rangeBounds() {
    const range = qs("#rep-range", root).value;
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from, to;
    if (range === "today") { from = today0; to = new Date(today0.getTime() + 86400000 - 1); }
    else if (range === "week") { from = new Date(today0); from.setDate(from.getDate() - 6); to = new Date(today0.getTime() + 86400000 - 1); }
    else if (range === "month") { from = new Date(today0); from.setDate(from.getDate() - 29); to = new Date(today0.getTime() + 86400000 - 1); }
    else if (range === "custom") {
      const f = qs("#rep-from", root).value;
      const t = qs("#rep-to", root).value;
      from = f ? new Date(f + "T00:00:00") : new Date(0);
      to = t ? new Date(t + "T23:59:59") : now;
    } else { from = new Date(0); to = now; }
    return { from, to, label: range };
  }

  function buildReport() {
    const { from, to, label } = rangeBounds();
    const orders = allOrders.filter((o) => {
      const ts = o.createdAt;
      return ts >= from.getTime() && ts <= to.getTime();
    });
    const completed = orders.filter((o) => o.status !== "cancelled");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let revenue = 0, cost = 0, itemsSold = 0;
    const byProduct = {};
    const byPayment = {};

    completed.forEach((o) => {
      revenue += o.total || 0;
      byPayment[o.paymentMethod || "Other"] = (byPayment[o.paymentMethod || "Other"] || 0) + (o.total || 0);
      Object.values(o.items || {}).forEach((item) => {
        itemsSold += item.qty || 0;
        const prod = productMap[item.productId];
        const unitCost = prod?.costPrice ?? (item.unitPrice || 0) * 0.6;
        cost += unitCost * (item.qty || 0);
        if (!byProduct[item.productId]) byProduct[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        byProduct[item.productId].qty += item.qty || 0;
        byProduct[item.productId].revenue += item.itemTotal || 0;
      });
    });

    const topProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
    const profit = revenue - cost;

    return {
      from, to, label,
      generatedAt: Date.now(),
      orders: completed,
      cancelledCount: cancelled.length,
      revenue, cost, profit, itemsSold,
      orderCount: completed.length,
      avgOrder: completed.length ? revenue / completed.length : 0,
      topProducts,
      byPayment,
    };
  }

  function renderReport(r) {
    const out = qs("#report-output", root);
    out.innerHTML = `
      <div id="report-printable" class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <h2 class="font-display font-semibold text-xl">${settings.shopName || "Brew POS"} — Sales Report</h2>
          <p class="text-sm text-espresso-500">${formatDate(r.from.getTime())} – ${formatDate(r.to.getTime())} · Generated ${formatDate(r.generatedAt)} ${formatTime(r.generatedAt)}</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${kpi("Revenue", formatMoney(r.revenue, settings.currency))}
          ${kpi("Est. Profit", formatMoney(r.profit, settings.currency))}
          ${kpi("Orders", r.orderCount + (r.cancelledCount ? ` (${r.cancelledCount} cancelled)` : ""))}
          ${kpi("Items Sold", r.itemsSold)}
        </div>

        <div>
          <h3 class="font-semibold text-sm mb-2">Sales by Product</h3>
          <table class="w-full text-sm">
            <thead><tr class="bg-cream-50">
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Product</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Units</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Revenue</th>
            </tr></thead>
            <tbody class="divide-y divide-espresso-100">
              ${r.topProducts.map((p) => `<tr><td class="px-2 py-1.5 font-medium">${p.name}</td><td class="px-2 py-1.5">${p.qty}</td><td class="px-2 py-1.5">${formatMoney(p.revenue, settings.currency)}</td></tr>`).join("") || `<tr><td colspan="3" class="px-2 py-3 text-center text-espresso-400">No sales in this range.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div>
          <h3 class="font-semibold text-sm mb-2">Payment Method Breakdown</h3>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-espresso-100">
              ${Object.entries(r.byPayment).map(([m, amt]) => `<tr><td class="px-2 py-1.5 font-medium">${m}</td><td class="px-2 py-1.5">${formatMoney(amt, settings.currency)}</td></tr>`).join("") || `<tr><td class="px-2 py-3 text-center text-espresso-400">No sales in this range.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div>
          <h3 class="font-semibold text-sm mb-2">Order Log (${r.orders.length})</h3>
          <table class="w-full text-sm">
            <thead><tr class="bg-cream-50">
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">#</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Date</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Cashier</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Payment</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-espresso-600">Total</th>
            </tr></thead>
            <tbody class="divide-y divide-espresso-100">
              ${r.orders.slice(0, 200).map((o) => `<tr><td class="px-2 py-1.5">${o.orderNumber}</td><td class="px-2 py-1.5">${formatDate(o.createdAt)} ${formatTime(o.createdAt)}</td><td class="px-2 py-1.5">${o.cashierName || "—"}</td><td class="px-2 py-1.5">${o.paymentMethod || "—"}</td><td class="px-2 py-1.5">${formatMoney(o.total, settings.currency)}</td></tr>`).join("") || `<tr><td colspan="5" class="px-2 py-3 text-center text-espresso-400">No orders in this range.</td></tr>`}
            </tbody>
          </table>
          ${r.orders.length > 200 ? `<p class="text-xs text-espresso-400 mt-2">Showing first 200 of ${r.orders.length} orders. Export CSV for the full list.</p>` : ""}
        </div>
      </div>
    `;
  }

  function kpi(label, value) {
    return `<div class="bg-cream-50 rounded-xl p-3"><p class="text-xs text-espresso-400">${label}</p><p class="text-lg font-bold text-espresso-900">${value}</p></div>`;
  }

  await Promise.resolve(); // shell ready
}

function printReport(r, settings) {
  const win = window.open("", "PRINT", "width=900,height=1000");
  if (!win) {
    console.error("Popup blocked — please allow popups for this site to print reports.");
    return;
  }
  const content = document.getElementById("report-printable").innerHTML;
  win.document.write(`
    <!doctype html><html><head><title>Sales Report</title>
    <style>
      body { font-family: -apple-system, Inter, system-ui, sans-serif; color: #2A1B10; padding: 24px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      th, td { padding: 4px 8px; font-size: 12px; text-align: left; }
      thead tr { background: #F4EEE3; }
      tbody tr { border-bottom: 1px solid #eee; }
      h2 { margin-bottom: 2px; } h3 { margin: 14px 0 6px; }
      .grid-kpi { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
      .grid-kpi > div { background: #FBF8F3; border-radius: 10px; padding: 8px 14px; }
    </style></head>
    <body>${content.replace('class="grid grid-cols-2 sm:grid-cols-4 gap-3"', 'class="grid-kpi"')}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function exportCsv(r, settings) {
  const rows = [
    ["Sales Report", settings.shopName || ""],
    ["Range", `${formatDate(r.from.getTime())} to ${formatDate(r.to.getTime())}`],
    ["Generated", `${formatDate(r.generatedAt)} ${formatTime(r.generatedAt)}`],
    [],
    ["Summary"],
    ["Revenue", r.revenue.toFixed(2)],
    ["Estimated Profit", r.profit.toFixed(2)],
    ["Orders", r.orderCount],
    ["Cancelled Orders", r.cancelledCount],
    ["Items Sold", r.itemsSold],
    ["Average Order Value", r.avgOrder.toFixed(2)],
    [],
    ["Sales by Product"],
    ["Product", "Units", "Revenue"],
    ...r.topProducts.map((p) => [p.name, p.qty, p.revenue.toFixed(2)]),
    [],
    ["Payment Method Breakdown"],
    ["Method", "Amount"],
    ...Object.entries(r.byPayment).map(([m, amt]) => [m, amt.toFixed(2)]),
    [],
    ["Order Log"],
    ["Order #", "Date", "Time", "Cashier", "Payment", "Total"],
    ...r.orders.map((o) => [
      o.orderNumber,
      formatDate(o.createdAt),
      formatTime(o.createdAt),
      o.cashierName || "",
      o.paymentMethod || "",
      (o.total || 0).toFixed(2),
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-report_${dateKey(r.from.getTime())}_to_${dateKey(r.to.getTime())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("CSV report downloaded.", "success");
}
