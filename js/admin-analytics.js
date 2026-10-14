// ============================================================================
// Admin Portal — Enhanced Analytics with Daily/Weekly/Monthly Views
// ============================================================================
// Enhanced sales tracker with comprehensive analytics, printable reports,
// and detailed metrics for daily, weekly, and monthly periods.
// ============================================================================

import { formatMoney, dateKey, el, qs, formatDate, formatTime } from "./utils.js";

// Use Chart from global scope (loaded in HTML)
const Chart = window.Chart;

// Check if Chart is loaded
if (!Chart) {
  console.error("Chart.js is not loaded. Please check the CDN link in admin.html");
}

export async function initAdminAnalyticsView(root, ctx) {
  const { db, settings } = ctx;
  let dateRange = "week";
  let customStartDate = null;
  let customEndDate = null;
  let orders = [];
  let products = [];
  let revenueChart = null;
  let productsChart = null;
  let ordersChart = null;
  let hourlyChart = null;
  let roiData = [];

  root.innerHTML = `
    <div class="p-3 sm:p-6 w-full flex flex-col gap-4">
      <!-- Header with Date Range Controls -->
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex flex-wrap gap-2 items-center">
          <select id="date-range-filter" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm font-medium">
            <option value="today">Today</option>
            <option value="week" selected>This Week</option>
            <option value="month">This Month</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <div id="custom-date-range" class="hidden flex gap-2 items-center">
            <input type="date" id="start-date" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
            <span class="text-espresso-400">to</span>
            <input type="date" id="end-date" class="rounded-xl border border-espresso-100 bg-white px-3 py-2 text-sm">
            <button id="apply-custom-range" class="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 text-sm font-medium btn-gradient-primary">Apply</button>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="print-report" class="rounded-xl border border-espresso-200 bg-white px-4 py-2 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2">
            <span>🖨️</span> Print Report
          </button>
          <button id="export-csv" class="rounded-xl border border-espresso-200 bg-white px-4 py-2 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2">
            <span>�</span> Export PDF
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Total Revenue</p>
          <p id="stat-revenue" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
          <p id="stat-revenue-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Total Profit</p>
          <p id="stat-profit" class="text-xl sm:text-2xl font-bold text-sage-600 mt-1">₱0.00</p>
          <p id="stat-profit-margin" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Total Orders</p>
          <p id="stat-orders" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
          <p id="stat-orders-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Items Sold</p>
          <p id="stat-items" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0</p>
          <p id="stat-items-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Avg Order Value</p>
          <p id="stat-avg" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">₱0.00</p>
          <p id="stat-avg-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
        <div class="bg-white rounded-xl border border-espresso-100 p-4 stat-card">
          <p class="text-[10px] sm:text-xs text-espresso-400 font-medium uppercase tracking-wide">Profit Margin</p>
          <p id="stat-margin" class="text-xl sm:text-2xl font-bold text-espresso-900 mt-1">0%</p>
          <p id="stat-margin-change" class="text-xs text-espresso-500 mt-1"></p>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div class="grid lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-display font-semibold text-lg">Revenue Trend</h2>
            <span id="revenue-period-label" class="text-xs text-espresso-500 font-medium bg-cream-50 px-2 py-1 rounded-full"></span>
          </div>
          <canvas id="revenue-chart" height="200"></canvas>
        </div>
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-display font-semibold text-lg">Orders Trend</h2>
            <span id="orders-period-label" class="text-xs text-espresso-500 font-medium bg-cream-50 px-2 py-1 rounded-full"></span>
          </div>
          <canvas id="orders-chart" height="200"></canvas>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="grid lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Peak Sales Hours</h2>
          <canvas id="hourly-chart" height="200"></canvas>
        </div>
        <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
          <h2 class="font-display font-semibold text-lg mb-3">Top Products by Revenue</h2>
          <canvas id="products-chart" height="200"></canvas>
        </div>
      </div>

      <!-- Detailed Metrics Table -->
      <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-lg">Product ROI Analysis</h2>
          <button id="download-table" class="text-xs text-espresso-600 hover:text-amber-600 font-medium transition-colors">Download CSV</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gradient-to-r from-cream-50 to-amber-50">
              <tr>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Product</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Units Sold</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Revenue</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Cost</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Profit</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">Margin</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-espresso-600 uppercase tracking-wide">ROI</th>
              </tr>
            </thead>
            <tbody id="roi-body" class="divide-y divide-espresso-100"></tbody>
          </table>
        </div>
      </div>

      <!-- Payment Methods Breakdown -->
      <div class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <h2 class="font-display font-semibold text-lg mb-4">Payment Methods Breakdown</h2>
        <div id="payment-methods" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
      </div>
    </div>
  `;

  async function loadData() {
    [orders, products] = await Promise.all([db.listOrders(), db.listProducts()]);
    renderAnalytics();
  }

  function getFilteredOrders() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter((order) => {
      if (order.status === "cancelled") return false;
      const orderDate = new Date(order.createdAt);
      
      if (dateRange === "today") return orderDate >= today;
      if (dateRange === "week") { 
        const w = new Date(today); 
        w.setDate(w.getDate() - 7); 
        return orderDate >= w; 
      }
      if (dateRange === "month") { 
        const m = new Date(today); 
        m.setMonth(m.getMonth() - 1); 
        return orderDate >= m; 
      }
      if (dateRange === "last30") {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return orderDate >= d;
      }
      if (dateRange === "last90") {
        const d = new Date(today);
        d.setDate(d.getDate() - 90);
        return orderDate >= d;
      }
      if (dateRange === "year") {
        const y = new Date(today);
        y.setFullYear(y.getFullYear() - 1);
        return orderDate >= y;
      }
      if (dateRange === "custom" && customStartDate && customEndDate) {
        return orderDate >= customStartDate && orderDate <= customEndDate;
      }
      return true;
    });
  }

  function getPreviousPeriodOrders() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter((order) => {
      if (order.status === "cancelled") return false;
      const orderDate = new Date(order.createdAt);
      
      if (dateRange === "today") {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return orderDate >= y && orderDate < today;
      }
      if (dateRange === "week") {
        const w = new Date(today);
        w.setDate(w.getDate() - 14);
        const end = new Date(today);
        end.setDate(end.getDate() - 7);
        return orderDate >= w && orderDate < end;
      }
      if (dateRange === "month") {
        const m = new Date(today);
        m.setMonth(m.getMonth() - 2);
        const end = new Date(today);
        end.setMonth(end.getMonth() - 1);
        return orderDate >= m && orderDate < end;
      }
      if (dateRange === "last30") {
        const d = new Date(today);
        d.setDate(d.getDate() - 60);
        const end = new Date(today);
        end.setDate(end.getDate() - 30);
        return orderDate >= d && orderDate < end;
      }
      if (dateRange === "last90") {
        const d = new Date(today);
        d.setDate(d.getDate() - 180);
        const end = new Date(today);
        end.setDate(end.getDate() - 90);
        return orderDate >= d && orderDate < end;
      }
      if (dateRange === "year") {
        const y = new Date(today);
        y.setFullYear(y.getFullYear() - 2);
        const end = new Date(today);
        end.setFullYear(end.getFullYear() - 1);
        return orderDate >= y && orderDate < end;
      }
      return [];
    });
  }

  function unitCostFor(product, fallbackPrice) {
    if (product && typeof product.costPrice === "number") return product.costPrice;
    return (fallbackPrice || 0) * 0.6;
  }

  function renderAnalytics() {
    const filteredOrders = getFilteredOrders();
    const previousOrders = getPreviousPeriodOrders();
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let totalRevenue = 0, totalItemsSold = 0, totalCost = 0;
    let prevRevenue = 0, prevOrdersCount = 0, prevItemsSold = 0;
    const productSales = {};
    const paymentMethods = {};

    filteredOrders.forEach((order) => {
      totalRevenue += order.total || 0;
      Object.values(order.items || {}).forEach((item) => {
        totalItemsSold += item.qty;
        if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        productSales[item.productId].quantity += item.qty;
        productSales[item.productId].revenue += item.itemTotal;
        totalCost += unitCostFor(productMap[item.productId], item.unitPrice) * item.qty;
      });
      // Track payment methods
      const method = order.paymentMethod || "Cash";
      paymentMethods[method] = (paymentMethods[method] || 0) + (order.total || 0);
    });

    previousOrders.forEach((order) => {
      prevRevenue += order.total || 0;
      prevOrdersCount += 1;
      Object.values(order.items || {}).forEach((item) => {
        prevItemsSold += item.qty;
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const avgOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    
    const prevAvgOrderValue = previousOrders.length ? prevRevenue / previousOrders.length : 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;
    const ordersChange = prevOrdersCount > 0 ? ((filteredOrders.length - prevOrdersCount) / prevOrdersCount * 100).toFixed(1) : 0;
    const itemsChange = prevItemsSold > 0 ? ((totalItemsSold - prevItemsSold) / prevItemsSold * 100).toFixed(1) : 0;
    const avgChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue * 100).toFixed(1) : 0;

    // Update stat elements with null checks
    const statRevenue = qs("#stat-revenue", root);
    const statProfit = qs("#stat-profit", root);
    const statOrders = qs("#stat-orders", root);
    const statItems = qs("#stat-items", root);
    const statAvg = qs("#stat-avg", root);
    const statMargin = qs("#stat-margin", root);

    if (statRevenue) statRevenue.textContent = formatMoney(totalRevenue, settings.currency);
    if (statProfit) statProfit.textContent = formatMoney(totalProfit, settings.currency);
    if (statOrders) statOrders.textContent = filteredOrders.length;
    if (statItems) statItems.textContent = totalItemsSold;
    if (statAvg) statAvg.textContent = formatMoney(avgOrderValue, settings.currency);
    if (statMargin) statMargin.textContent = profitMargin + "%";

    // Change indicators
    const formatChange = (val) => {
      const num = parseFloat(val);
      if (num > 0) return `<span class="text-sage-600">↑ ${num}%</span>`;
      if (num < 0) return `<span class="text-rust-600">↓ ${Math.abs(num)}%</span>`;
      return `<span class="text-espresso-400">0%</span>`;
    };

    // Update change indicators with null checks
    const statRevenueChange = qs("#stat-revenue-change", root);
    const statProfitMargin = qs("#stat-profit-margin", root);
    const statOrdersChange = qs("#stat-orders-change", root);
    const statItemsChange = qs("#stat-items-change", root);
    const statAvgChange = qs("#stat-avg-change", root);
    const statMarginChange = qs("#stat-margin-change", root);

    if (statRevenueChange) statRevenueChange.innerHTML = formatChange(revenueChange);
    if (statProfitMargin) statProfitMargin.textContent = `${profitMargin}% margin`;
    if (statOrdersChange) statOrdersChange.innerHTML = formatChange(ordersChange);
    if (statItemsChange) statItemsChange.innerHTML = formatChange(itemsChange);
    if (statAvgChange) statAvgChange.innerHTML = formatChange(avgChange);
    const prevMargin = prevRevenue > 0 ? ((prevRevenue - (prevRevenue * 0.6)) / prevRevenue * 100).toFixed(1) : 0;
    if (statMarginChange) statMarginChange.innerHTML = formatChange(parseFloat(profitMargin) - parseFloat(prevMargin));

    // Update period labels with null checks
    const periodLabels = {
      today: "Today",
      week: "This Week",
      month: "This Month",
      last30: "Last 30 Days",
      last90: "Last 90 Days",
      year: "This Year",
      custom: "Custom Range"
    };
    const revenuePeriodLabel = qs("#revenue-period-label", root);
    const ordersPeriodLabel = qs("#orders-period-label", root);
    if (revenuePeriodLabel) revenuePeriodLabel.textContent = periodLabels[dateRange] || "Selected Period";
    if (ordersPeriodLabel) ordersPeriodLabel.textContent = periodLabels[dateRange] || "Selected Period";

    // ROI table
    const roiBody = qs("#roi-body", root);
    roiBody.innerHTML = "";
    const roiData = Object.entries(productSales).map(([productId, sales]) => {
      const product = productMap[productId];
      const unitCost = unitCostFor(product, sales.revenue / (sales.quantity || 1));
      const totalCostForProduct = unitCost * sales.quantity;
      const profit = sales.revenue - totalCostForProduct;
      const margin = sales.revenue > 0 ? ((profit / sales.revenue) * 100).toFixed(1) : "0";
      const roi = totalCostForProduct > 0 ? ((profit / totalCostForProduct) * 100).toFixed(1) : "0";
      return { name: sales.name, quantity: sales.quantity, revenue: sales.revenue, cost: totalCostForProduct, profit, margin, roi };
    }).sort((a, b) => b.profit - a.profit);

    // Store globally for export
    const currentRoiData = roiData.map(item => item);

    roiData.forEach((item) => {
      const row = el("tr", "hover:bg-cream-50 transition-colors");
      row.innerHTML = `
        <td class="px-3 py-3 font-medium">${item.name}</td>
        <td class="px-3 py-3">${item.quantity}</td>
        <td class="px-3 py-3">${formatMoney(item.revenue, settings.currency)}</td>
        <td class="px-3 py-3">${formatMoney(item.cost, settings.currency)}</td>
        <td class="px-3 py-3 font-medium ${item.profit >= 0 ? "text-sage-600" : "text-rust-600"}">${formatMoney(item.profit, settings.currency)}</td>
        <td class="px-3 py-3 font-medium ${parseFloat(item.margin) >= 0 ? "text-sage-600" : "text-rust-600"}">${item.margin}%</td>
        <td class="px-3 py-3 font-medium ${parseFloat(item.roi) >= 0 ? "text-sage-600" : "text-rust-600"}">${item.roi}%</td>
      `;
      roiBody.appendChild(row);
    });
    if (!roiData.length) roiBody.innerHTML = `<tr><td colspan="7" class="px-3 py-4 text-center text-espresso-400">No sales data available for this period</td></tr>`;

    // Payment methods breakdown
    const paymentEl = qs("#payment-methods", root);
    paymentEl.innerHTML = "";
    const totalPayment = Object.values(paymentMethods).reduce((a, b) => a + b, 0) || 1;
    Object.entries(paymentMethods).forEach(([method, amount]) => {
      const percentage = totalPayment > 0 ? ((amount / totalPayment) * 100).toFixed(1) : 0;
      const card = el("div", "bg-gradient-to-br from-cream-50 to-amber-50 rounded-xl p-4 border border-espresso-100 shadow-sm");
      card.innerHTML = `
        <p class="text-xs text-espresso-500 font-medium uppercase tracking-wide mb-1">${method}</p>
        <p class="text-xl font-bold text-espresso-900">${formatMoney(amount, settings.currency)}</p>
        <p class="text-xs text-espresso-600 mt-1">${percentage}% of total</p>
      `;
      paymentEl.appendChild(card);
    });

    renderCharts(filteredOrders, roiData, paymentMethods);
  }

  function renderCharts(filteredOrders, roiData, paymentMethods) {
    // Check if Chart is available
    if (!Chart) {
      console.error("Chart.js is not available, skipping chart renders");
      return;
    }

    // Don't render if no data
    if (filteredOrders.length === 0) {
      console.log("No orders data for chart rendering");
      return;
    }

    // Revenue trend — bucket by day
    const byDay = {};
    filteredOrders.forEach((o) => {
      const k = dateKey(o.createdAt);
      byDay[k] = (byDay[k] || 0) + (o.total || 0);
    });
    const days = Object.keys(byDay).sort();
    const revCtx = qs("#revenue-chart", root);
    if (!revCtx) return;
    const revCanvasCtx = revCtx.getContext("2d");
    if (revenueChart) revenueChart.destroy();
    revenueChart = null;
    if (days.length === 0) return;
    revenueChart = new Chart(revCanvasCtx, {
      type: "line",
      data: {
        labels: days.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: "Revenue",
          data: days.map((d) => byDay[d]),
          borderColor: "#FFC050",
          backgroundColor: "rgba(255, 192, 80, 0.15)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#FFC050",
          pointBorderColor: "#E0A94A",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: { 
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatMoney(context.parsed.y, settings.currency);
              }
            }
          }
        }, 
        scales: { 
          y: { 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatMoney(value, settings.currency);
              }
            }
          } 
        } 
      },
    });

    // Orders trend — bucket by day
    const ordersByDay = {};
    filteredOrders.forEach((o) => {
      const k = dateKey(o.createdAt);
      ordersByDay[k] = (ordersByDay[k] || 0) + 1;
    });
    const orderDays = Object.keys(ordersByDay).sort();
    const ordersCtx = qs("#orders-chart", root);
    if (!ordersCtx) return;
    const ordersCanvasCtx = ordersCtx.getContext("2d");
    if (ordersChart) ordersChart.destroy();
    ordersChart = null;
    if (orderDays.length === 0) return;
    ordersChart = new Chart(ordersCanvasCtx, {
      type: "bar",
      data: {
        labels: orderDays.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: "Orders",
          data: orderDays.map((d) => ordersByDay[d]),
          backgroundColor: "#88B088",
          borderRadius: 4,
        }],
      },
      options: { 
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      },
    });

    // Peak sales hours
    const hourlyData = {};
    filteredOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + (o.total || 0);
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourlyCtx = qs("#hourly-chart", root);
    if (!hourlyCtx) return;
    const hourlyCanvasCtx = hourlyCtx.getContext("2d");
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = null;
    hourlyChart = new Chart(hourlyCanvasCtx, {
      type: "bar",
      data: {
        labels: hours.map(h => `${h}:00`),
        datasets: [{
          label: "Revenue",
          data: hours.map(h => hourlyData[h] || 0),
          backgroundColor: hours.map(h => h >= 6 && h < 12 ? "#FFC050" : h >= 12 && h < 18 ? "#88B088" : "#5E8754"),
          borderRadius: 4,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    // Top products by revenue
    const top = roiData.slice(0, 8);
    const prodCtx = qs("#products-chart", root);
    if (!prodCtx) return;
    const prodCanvasCtx = prodCtx.getContext("2d");
    if (productsChart) productsChart.destroy();
    productsChart = null;
    if (top.length === 0) return;
    productsChart = new Chart(prodCanvasCtx, {
      type: "bar",
      data: {
        labels: top.map((p) => p.name),
        datasets: [{ 
          label: "Revenue", 
          data: top.map((p) => p.revenue), 
          backgroundColor: "#E0A94A",
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatMoney(value, settings.currency);
              }
            }
          }
        }
      }
    });
  }

  qs("#date-range-filter", root).addEventListener("change", (e) => {
    dateRange = e.target.value;
    const customRangeEl = qs("#custom-date-range", root);
    if (dateRange === "custom") {
      customRangeEl.classList.remove("hidden");
    } else {
      customRangeEl.classList.add("hidden");
      customStartDate = null;
      customEndDate = null;
      renderAnalytics();
    }
  });

  qs("#apply-custom-range", root).addEventListener("click", () => {
    customStartDate = new Date(qs("#start-date", root).value);
    customEndDate = new Date(qs("#end-date", root).value);
    customEndDate.setHours(23, 59, 59, 999);
    renderAnalytics();
  });

  // Print report
  qs("#print-report", root).addEventListener("click", () => {
    window.print();
  });

  // Export CSV
  qs("#export-csv", root).addEventListener("click", () => {
    const roiBody = qs("#roi-body", root);
    const rows = roiBody.querySelectorAll("tr");
    const data = Array.from(rows).map(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return null;
      return {
        name: cells[0].textContent,
        quantity: parseInt(cells[1].textContent),
        revenue: parseFloat(cells[2].textContent.replace(/[₱,]/g, "")),
        cost: parseFloat(cells[3].textContent.replace(/[₱,]/g, "")),
        profit: parseFloat(cells[4].textContent.replace(/[₱,]/g, "")),
        margin: cells[5].textContent,
        roi: cells[6].textContent
      };
    }).filter(row => row !== null);
    exportToCSV(data);
  });

  // Download table as CSV
  qs("#download-table", root).addEventListener("click", () => {
    const roiBody = qs("#roi-body", root);
    const rows = roiBody.querySelectorAll("tr");
    const data = Array.from(rows).map(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return null;
      return {
        name: cells[0].textContent,
        quantity: parseInt(cells[1].textContent),
        revenue: parseFloat(cells[2].textContent.replace(/[₱,]/g, "")),
        cost: parseFloat(cells[3].textContent.replace(/[₱,]/g, "")),
        profit: parseFloat(cells[4].textContent.replace(/[₱,]/g, "")),
        margin: cells[5].textContent,
        roi: cells[6].textContent
      };
    }).filter(row => row !== null);
    exportToCSV(data);
  });

  function exportToCSV(data) {
    const headers = ["Product", "Units Sold", "Revenue", "Cost", "Profit", "Margin", "ROI"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => [
        `"${row.name}"`,
        row.quantity,
        row.revenue.toFixed(2),
        row.cost.toFixed(2),
        row.profit.toFixed(2),
        row.margin,
        row.roi
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${dateRange}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  db.onOrdersChange((list) => {
    orders = list;
    renderAnalytics();
  });

  await loadData();
}
