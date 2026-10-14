// ============================================================================
// Admin Portal — Sales Tracker
// ============================================================================
// Daily/Weekly/Monthly line charts, KPI cards with period comparison,
// and detailed analytics panels.
// ============================================================================

import { formatMoney, formatDate, formatTime, dateKey, el, qs, toast } from "./utils.js";

// Use Chart from global scope (loaded in HTML)
const Chart = window.Chart;

// Check if Chart is loaded
if (!Chart) {
  console.error("Chart.js is not loaded. Please check the CDN link in admin.html");
}

export async function initAdminSalesTrackerView(root, ctx) {
  console.log("initAdminSalesTrackerView called with ctx:", ctx);
  const { db, settings } = ctx;
  let orders = [];
  let products = [];
  let granularity = "daily"; // "daily" | "weekly" | "monthly"
  let rangePreset = "7"; // "7" | "14" | "30" for daily, "8" | "12" for weekly, "6" | "12" for monthly
  let customStartDate = null;
  let customEndDate = null;
  let metric = "revenue"; // "revenue" | "orders" | "items" | "profit"
  let chart = null;
  let peakHoursChart = null;

  if (!root) {
    console.error("initAdminSalesTrackerView: root element is null");
    throw new Error("Root element not found");
  }

  root.innerHTML = `
    <div class="p-3 sm:p-6 w-full flex flex-col gap-4">
      <!-- Controls -->
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex flex-wrap gap-2 items-center">
          <select id="granularity" class="rounded-xl border border-espresso-200 bg-white px-3 py-2 text-sm font-medium">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select id="range-preset" class="rounded-xl border border-espresso-200 bg-white px-3 py-2 text-sm font-medium">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <div id="custom-range" class="hidden flex gap-2 items-center">
            <input type="date" id="start-date" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
            <span class="text-espresso-400">to</span>
            <input type="date" id="end-date" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
            <button id="apply-custom" class="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 text-sm font-medium">Apply</button>
          </div>
        </div>
        <div class="flex gap-2">
          <select id="metric" class="rounded-xl border border-espresso-200 bg-white px-3 py-2 text-sm font-medium">
            <option value="revenue">Revenue</option>
            <option value="orders">Orders</option>
            <option value="items">Items sold</option>
            <option value="profit">Profit</option>
          </select>
          <button id="export-csv" class="rounded-xl border border-espresso-200 bg-white px-4 py-2 text-sm font-medium hover:bg-cream-50 transition-colors">📄 Export PDF</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Revenue</p>
          <p id="kpi-revenue" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
          <p id="kpi-revenue-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Orders</p>
          <p id="kpi-orders" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
          <p id="kpi-orders-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Items sold</p>
          <p id="kpi-items" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
          <p id="kpi-items-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Avg order value</p>
          <p id="kpi-avg" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
          <p id="kpi-avg-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Profit</p>
          <p id="kpi-profit" class="text-xl sm:text-2xl font-bold text-sage-600 mt-1">₱0.00</p>
          <p id="kpi-profit-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
      </div>

      <!-- Main Chart -->
      <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-display font-semibold text-lg">Sales Trend</h2>
          <span id="chart-period-label" class="text-xs text-espresso-500 font-medium bg-cream-50 px-2 py-1 rounded-full"></span>
        </div>
        <div class="h-64">
          <canvas id="sales-chart"></canvas>
        </div>
      </div>

      <!-- Extra Panels -->
      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Top Products -->
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Top 10 Products</h2>
          <div id="top-products" class="flex flex-col gap-2"></div>
        </div>

        <!-- Sales by Category -->
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Sales by Category</h2>
          <div id="sales-by-category" class="flex flex-col gap-2"></div>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Payment Methods -->
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Payment Methods</h2>
          <div id="payment-methods" class="grid grid-cols-2 gap-3"></div>
        </div>

        <!-- Peak Hours -->
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Peak Hours (Orders per hour)</h2>
          <div class="h-48">
            <canvas id="peak-hours-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Product ROI Table -->
      <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
        <h2 class="font-display font-semibold text-lg mb-3">Product ROI Analysis</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gradient-to-r from-cream-50 to-amber-50">
              <tr>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Product</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Units</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Revenue</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Cost</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Profit</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Margin</th>
              </tr>
            </thead>
            <tbody id="roi-body" class="divide-y divide-espresso-100"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  async function loadData() {
    [orders, products] = await Promise.all([db.listOrders(), db.listProducts()]);
    render();
  }

  function getDateRange() {
    const now = new Date();
    let start, end;

    if (granularity === "daily") {
      const days = rangePreset === "custom" ? null : Number(rangePreset);
      if (days) {
        start = new Date(now);
        start.setDate(start.getDate() - days + 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
      } else if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
    } else if (granularity === "weekly") {
      const weeks = rangePreset === "custom" ? null : Number(rangePreset);
      if (weeks) {
        start = new Date(now);
        start.setDate(start.getDate() - (weeks * 7) + 1);
        start = getMonday(start);
        end = new Date(now);
      } else if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        start = getMonday(start);
        end = new Date(customEndDate);
      }
    } else if (granularity === "monthly") {
      const months = rangePreset === "custom" ? null : Number(rangePreset);
      if (months) {
        start = new Date(now);
        start.setMonth(start.getMonth() - months + 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
      } else if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEndDate);
      }
    }

    return { start, end };
  }

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getFilteredOrders() {
    const { start, end } = getDateRange();
    if (!start || !end) return orders;

    return orders.filter((o) => {
      if (o.status === "cancelled") return false;
      const ts = o.createdAt;
      return ts >= start.getTime() && ts <= end.getTime();
    });
  }

  function getPreviousPeriodOrders() {
    const { start, end } = getDateRange();
    if (!start || !end) return [];

    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration + 1);

    return orders.filter((o) => {
      if (o.status === "cancelled") return false;
      const ts = o.createdAt;
      return ts >= prevStart.getTime() && ts <= prevEnd.getTime();
    });
  }

  function bucketOrders(ordersList, gran) {
    const buckets = {};

    ordersList.forEach((o) => {
      const d = new Date(o.createdAt);
      let key;

      if (gran === "daily") {
        key = dateKey(o.createdAt);
      } else if (gran === "weekly") {
        const monday = getMonday(d);
        key = `${monday.getFullYear()}-W${getWeekNumber(monday)}`;
      } else if (gran === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!buckets[key]) buckets[key] = { revenue: 0, orders: 0, items: 0, profit: 0 };
      buckets[key].revenue += o.total || 0;
      buckets[key].orders += 1;
      buckets[key].items += Object.values(o.items || {}).reduce((s, i) => s + (i.qty || 0), 0);
      buckets[key].profit += o.cogs || 0;
    });

    return buckets;
  }

  function getWeekNumber(date) {
    const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return weekNum;
  }

  function render() {
    const filtered = getFilteredOrders();
    const previous = getPreviousPeriodOrders();
    const buckets = bucketOrders(filtered, granularity);
    const prevBuckets = bucketOrders(previous, granularity);

    // Calculate current totals
    let totalRevenue = 0, totalOrders = 0, totalItems = 0, totalProfit = 0;
    Object.values(buckets).forEach((b) => {
      totalRevenue += b.revenue;
      totalOrders += b.orders;
      totalItems += b.items;
      totalProfit += b.profit;
    });

    // Calculate previous totals
    let prevRevenue = 0, prevOrders = 0, prevItems = 0, prevProfit = 0;
    Object.values(prevBuckets).forEach((b) => {
      prevRevenue += b.revenue;
      prevOrders += b.orders;
      prevItems += b.items;
      prevProfit += b.profit;
    });

    // Calculate changes
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;
    const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders * 100).toFixed(1) : 0;
    const itemsChange = prevItems > 0 ? ((totalItems - prevItems) / prevItems * 100).toFixed(1) : 0;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgOrder = prevOrders > 0 ? prevRevenue / prevOrders : 0;
    const avgChange = prevAvgOrder > 0 ? ((avgOrder - prevAvgOrder) / prevAvgOrder * 100).toFixed(1) : 0;
    const profitChange = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit * 100).toFixed(1) : 0;

    // Update KPI cards (with null checks)
    const kpiRevenue = qs("#kpi-revenue", root);
    const kpiOrders = qs("#kpi-orders", root);
    const kpiItems = qs("#kpi-items", root);
    const kpiAvg = qs("#kpi-avg", root);
    const kpiProfit = qs("#kpi-profit", root);

    if (kpiRevenue) kpiRevenue.textContent = formatMoney(totalRevenue, settings.currency);
    if (kpiOrders) kpiOrders.textContent = totalOrders;
    if (kpiItems) kpiItems.textContent = totalItems;
    if (kpiAvg) kpiAvg.textContent = formatMoney(avgOrder, settings.currency);
    if (kpiProfit) kpiProfit.textContent = formatMoney(totalProfit, settings.currency);

    const formatChange = (val) => {
      const num = parseFloat(val);
      if (num > 0) return `<span class="text-sage-600">↑ ${num}%</span>`;
      if (num < 0) return `<span class="text-rust-600">↓ ${Math.abs(num)}%</span>`;
      return `<span class="text-espresso-400">0%</span>`;
    };

    // Update change indicators (with null checks)
    const kpiRevenueChange = qs("#kpi-revenue-change", root);
    const kpiOrdersChange = qs("#kpi-orders-change", root);
    const kpiItemsChange = qs("#kpi-items-change", root);
    const kpiAvgChange = qs("#kpi-avg-change", root);
    const kpiProfitChange = qs("#kpi-profit-change", root);

    if (kpiRevenueChange) kpiRevenueChange.innerHTML = formatChange(revenueChange);
    if (kpiOrdersChange) kpiOrdersChange.innerHTML = formatChange(ordersChange);
    if (kpiItemsChange) kpiItemsChange.innerHTML = formatChange(itemsChange);
    if (kpiAvgChange) kpiAvgChange.innerHTML = formatChange(avgChange);
    if (kpiProfitChange) kpiProfitChange.innerHTML = formatChange(profitChange);

    // Update period label (with null check)
    const { start, end } = getDateRange();
    const chartPeriodLabel = qs("#chart-period-label", root);
    if (start && end && chartPeriodLabel) {
      chartPeriodLabel.textContent = `${formatDate(start.getTime())} – ${formatDate(end.getTime())}`;
    }

    // Render chart
    renderChart(buckets);

    // Render extra panels
    renderTopProducts(filtered);
    renderSalesByCategory(filtered);
    renderPaymentMethods(filtered);
    renderPeakHours(filtered);
    renderROITable(filtered);
  }

  function renderChart(buckets) {
    const canvas = qs("#sales-chart", root);
    if (!canvas) return;

    // Check if Chart is available
    if (!Chart) {
      console.error("Chart.js is not available, skipping chart render");
      return;
    }

    const sortedKeys = Object.keys(buckets).sort();
    const labels = sortedKeys.map((k) => {
      if (granularity === "daily") {
        const d = new Date(k);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (granularity === "weekly") {
        return k;
      } else {
        const [y, m] = k.split("-");
        const date = new Date(y, m - 1);
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
    });

    let data = [];
    if (metric === "revenue") data = sortedKeys.map((k) => buckets[k].revenue);
    else if (metric === "orders") data = sortedKeys.map((k) => buckets[k].orders);
    else if (metric === "items") data = sortedKeys.map((k) => buckets[k].items);
    else if (metric === "profit") data = sortedKeys.map((k) => buckets[k].profit);

    // Destroy previous chart instance if it exists
    if (chart) {
      chart.destroy();
      chart = null;
    }

    // Don't render if no data
    if (sortedKeys.length === 0) {
      console.log("No data available for chart rendering");
      return;
    }

    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: metric.charAt(0).toUpperCase() + metric.slice(1),
          data,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#d97706",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => formatMoney(ctx.raw, settings.currency),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => formatMoney(val, settings.currency),
            },
          },
        },
      },
    });
  }

  function renderTopProducts(filteredOrders) {
    const sales = {};
    filteredOrders.forEach((o) => {
      Object.values(o.items || {}).forEach((i) => {
        sales[i.productId] = (sales[i.productId] || 0) + i.qty;
        sales[`${i.productId}__name`] = i.name;
        sales[`${i.productId}__revenue`] = (sales[`${i.productId}__revenue`] || 0) + i.itemTotal;
      });
    });

    const top = Object.entries(sales)
      .filter(([k]) => !k.endsWith("__name") && !k.endsWith("__revenue"))
      .map(([id, qty]) => ({
        name: sales[`${id}__name`],
        qty,
        revenue: sales[`${id}__revenue`],
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const elTop = qs("#top-products", root);
    elTop.innerHTML = "";
    if (!top.length) {
      elTop.innerHTML = `<p class="text-sm text-espresso-400">No sales in this period.</p>`;
      return;
    }

    top.forEach((t) => {
      const row = el("div", "flex justify-between items-center py-2 border-b border-espresso-100 last:border-0");
      row.innerHTML = `
        <span class="text-sm font-medium truncate pr-2">${t.name}</span>
        <div class="flex gap-4 text-sm">
          <span class="text-espresso-500">${t.qty} units</span>
          <span class="font-semibold text-espresso-900">${formatMoney(t.revenue, settings.currency)}</span>
        </div>
      `;
      elTop.appendChild(row);
    });
  }

  function renderSalesByCategory(filteredOrders) {
    const catSales = {};
    filteredOrders.forEach((o) => {
      Object.values(o.items || {}).forEach((i) => {
        const product = products.find((p) => p.id === i.productId);
        if (product) {
          const catId = product.categoryId;
          catSales[catId] = (catSales[catId] || 0) + i.itemTotal;
        }
      });
    });

    const elCat = qs("#sales-by-category", root);
    elCat.innerHTML = "";
    const entries = Object.entries(catSales).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      elCat.innerHTML = `<p class="text-sm text-espresso-400">No sales in this period.</p>`;
      return;
    }

    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
    entries.forEach(([catId, revenue]) => {
      const product = products.find((p) => p.id === catId);
      const catName = product ? product.categoryId : "Uncategorized";
      const percent = (revenue / maxVal) * 100;
      const row = el("div", "flex flex-col gap-1");
      row.innerHTML = `
        <div class="flex justify-between text-xs">
          <span class="font-medium">${catName}</span>
          <span class="text-espresso-500">${formatMoney(revenue, settings.currency)}</span>
        </div>
        <div class="h-2 rounded-full bg-cream-100 overflow-hidden">
          <div class="h-full bg-amber-500 rounded-full" style="width:${percent}%"></div>
        </div>
      `;
      elCat.appendChild(row);
    });
  }

  function renderPaymentMethods(filteredOrders) {
    const methods = {};
    filteredOrders.forEach((o) => {
      const method = o.paymentMethod || "Cash";
      methods[method] = (methods[method] || 0) + (o.total || 0);
    });

    const elPm = qs("#payment-methods", root);
    elPm.innerHTML = "";
    const total = Object.values(methods).reduce((a, b) => a + b, 0) || 1;

    Object.entries(methods).forEach(([method, amount]) => {
      const percent = ((amount / total) * 100).toFixed(1);
      const card = el("div", "bg-gradient-to-br from-cream-50 to-amber-50 rounded-xl p-4 border border-espresso-100 shadow-sm");
      card.innerHTML = `
        <p class="text-xs text-espresso-500 font-medium uppercase tracking-wide mb-1">${method}</p>
        <p class="text-lg font-bold text-espresso-900">${formatMoney(amount, settings.currency)}</p>
        <p class="text-xs text-espresso-600 mt-1">${percent}% of total</p>
      `;
      elPm.appendChild(card);
    });
  }

  function renderPeakHours(filteredOrders) {
    const hours = new Array(24).fill(0);
    filteredOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hours[hour] += 1;
    });

    const canvas = qs("#peak-hours-chart", root);
    if (!canvas) return;

    // Check if Chart is available
    if (!Chart) {
      console.error("Chart.js is not available, skipping peak hours chart render");
      return;
    }

    // Don't render if no data
    if (filteredOrders.length === 0) {
      console.log("No orders data for peak hours chart");
      return;
    }

    // Destroy previous chart instance if it exists
    if (peakHoursChart) {
      peakHoursChart.destroy();
      peakHoursChart = null;
    }

    peakHoursChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: hours.map((_, i) => `${i}:00`),
        datasets: [{
          label: "Orders",
          data: hours,
          backgroundColor: "rgba(245, 158, 11, 0.8)",
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  function renderROITable(filteredOrders) {
    const productSales = {};
    filteredOrders.forEach((o) => {
      Object.values(o.items || {}).forEach((i) => {
        if (!productSales[i.productId]) {
          productSales[i.productId] = { name: i.name, qty: 0, revenue: 0 };
        }
        productSales[i.productId].qty += i.qty || 0;
        productSales[i.productId].revenue += i.itemTotal || 0;
      });
    });

    const elRoi = qs("#roi-body", root);
    elRoi.innerHTML = "";
    const entries = Object.entries(productSales).map(([id, data]) => {
      const product = products.find((p) => p.id === id);
      const costPrice = product?.costPrice || (data.revenue / (data.qty || 1)) * 0.6;
      const totalCost = costPrice * data.qty;
      const profit = data.revenue - totalCost;
      const margin = data.revenue > 0 ? ((profit / data.revenue) * 100).toFixed(1) : "0";
      return { name: data.name, qty: data.qty, revenue: data.revenue, cost: totalCost, profit, margin };
    }).sort((a, b) => b.profit - a.profit);

    if (!entries.length) {
      elRoi.innerHTML = `<tr><td colspan="7" class="px-3 py-4 text-center text-espresso-400">No sales data for this period</td></tr>`;
      return;
    }

    entries.forEach((e) => {
      const row = el("tr", "hover:bg-cream-50 transition-colors");
      row.innerHTML = `
        <td class="px-3 py-3 font-medium">${e.name}</td>
        <td class="px-3 py-3">${e.qty}</td>
        <td class="px-3 py-3">${formatMoney(e.revenue, settings.currency)}</td>
        <td class="px-3 py-3">${formatMoney(e.cost, settings.currency)}</td>
        <td class="px-3 py-3 font-medium ${e.profit >= 0 ? "text-sage-600" : "text-rust-600"}">${formatMoney(e.profit, settings.currency)}</td>
        <td class="px-3 py-3 font-medium ${parseFloat(e.margin) >= 0 ? "text-sage-600" : "text-rust-600"}">${e.margin}%</td>
      `;
      elRoi.appendChild(row);
    });
  }

  // Event listeners
  qs("#granularity", root).addEventListener("change", (e) => {
    granularity = e.target.value;
    if (granularity === "daily") {
      qs("#range-preset", root).innerHTML = `
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
      `;
    } else if (granularity === "weekly") {
      qs("#range-preset", root).innerHTML = `
        <option value="8">Last 8 weeks</option>
        <option value="12">Last 12 weeks</option>
      `;
    } else if (granularity === "monthly") {
      qs("#range-preset", root).innerHTML = `
        <option value="6">Last 6 months</option>
        <option value="12">Last 12 months</option>
      `;
    }
    rangePreset = qs("#range-preset", root).value;
    render();
  });

  qs("#range-preset", root).addEventListener("change", (e) => {
    rangePreset = e.target.value;
    qs("#custom-range", root).classList.add("hidden");
    render();
  });

  qs("#custom-range", root).querySelector("button")?.addEventListener("click", () => {
    customStartDate = qs("#start-date", root).value;
    customEndDate = qs("#end-date", root).value;
    render();
  });

  qs("#metric", root).addEventListener("change", (e) => {
    metric = e.target.value;
    render();
  });

  qs("#export-csv", root).addEventListener("click", () => {
    const { start, end } = getDateRange();
    const filtered = getFilteredOrders();
    const buckets = bucketOrders(filtered, granularity);
    const dateStr = new Date().toLocaleDateString();

    // Create formatted HTML report
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Report - ${settings.shopName || 'Waffle King POS'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; }
    .header h1 { color: #1b110a; margin: 0; font-size: 28px; }
    .header p { color: #666; margin: 5px 0 0; }
    .meta { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    .meta-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .meta-label { font-weight: bold; color: #1b110a; }
    .section { margin: 30px 0; }
    .section h2 { color: #1b110a; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
    .kpi-card { padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
    .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #1b110a; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f9f9f9; font-weight: bold; color: #1b110a; }
    tr:hover { background: #f5f5f5; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Sales Report</h1>
    <p>${settings.shopName || 'Waffle King POS'}</p>
  </div>

  <div class="meta">
    <div class="meta-row">
      <span class="meta-label">Report Date:</span>
      <span>${dateStr}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Granularity:</span>
      <span>${granularity.charAt(0).toUpperCase() + granularity.slice(1)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Period:</span>
      <span>${formatDate(start?.getTime())} to ${formatDate(end?.getTime())}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Metric:</span>
      <span>${metric.charAt(0).toUpperCase() + metric.slice(1)}</span>
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Revenue</div>
        <div class="kpi-value">${formatMoney(totalRevenue, settings.currency)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Orders</div>
        <div class="kpi-value">${totalOrders}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Items Sold</div>
        <div class="kpi-value">${totalItems}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Profit</div>
        <div class="kpi-value">${formatMoney(totalProfit, settings.currency)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg Order</div>
        <div class="kpi-value">${formatMoney(totalOrders > 0 ? totalRevenue / totalOrders : 0, settings.currency)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Sales by ${granularity.charAt(0).toUpperCase() + granularity.slice(1)}</h2>
    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>Revenue</th>
          <th>Orders</th>
          <th>Items</th>
          <th>Profit</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(buckets).map(([key, b]) => `
          <tr>
            <td>${key}</td>
            <td>${formatMoney(b.revenue, settings.currency)}</td>
            <td>${b.orders}</td>
            <td>${b.items}</td>
            <td class="${b.profit >= 0 ? 'positive' : 'negative'}">${formatMoney(b.profit, settings.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by Waffle King POS • ${dateStr}</p>
    <p>© 2024 Waffle King POS. All rights reserved.</p>
  </div>
</body>
</html>`;

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();

    // Trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);

    toast("PDF report generated. Save from print dialog.", "success");
  });

  // Realtime updates
  db.onOrdersChange((list) => {
    orders = list;
    render();
  });

  await loadData();
}
