// ============================================================================
// Brew POS — Settings view
// ============================================================================

import { formatMoney, el, qs, qsa, openModal, toast, customConfirm } from "./utils.js";
import { printerManager, printReceipt } from "./printer.js";

export async function initSettingsView(root, ctx) {
  console.log("initSettingsView called with ctx:", ctx);
  const { db, user } = ctx;
  const isAdmin = user.role === "admin";

  if (!root) {
    console.error("initSettingsView: root element is null");
    throw new Error("Root element not found");
  }

  console.log("User role:", user.role, "Is admin:", isAdmin);

  root.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-5">

      <section class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <h2 class="font-display font-semibold text-lg mb-1">Printer</h2>
        <p class="text-sm text-espresso-500 mb-4">Connect the thermal receipt printer via Bluetooth, or via WiFi through the local print bridge.</p>

        <div class="flex items-center gap-3 bg-cream-100 rounded-xl px-4 py-3 mb-4">
          <span id="printer-status-dot" class="w-2.5 h-2.5 rounded-full bg-rust-500 shrink-0"></span>
          <span id="printer-status-label" class="text-sm font-medium flex-1">Not connected</span>
          <button id="test-print-btn" class="text-xs font-semibold text-espresso-700 underline">Test print</button>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div class="border border-espresso-100 rounded-xl p-4">
            <p class="font-medium text-sm mb-1">Bluetooth</p>
            <p class="text-xs text-espresso-500 mb-3">Pair directly from this browser (Chrome/Edge on desktop or Android).</p>
            <button id="connect-bt-btn" class="bp-tap w-full bg-espresso-800 text-cream-50 rounded-xl py-2.5 text-sm font-semibold">Connect via Bluetooth</button>
          </div>
          <div class="border border-espresso-100 rounded-xl p-4">
            <p class="font-medium text-sm mb-1">WiFi / LAN</p>
            <p class="text-xs text-espresso-500 mb-3">Needs the local print-bridge (see README) running on this computer.</p>
            <div class="flex gap-2 mb-2">
              <input id="wifi-ip" type="text" placeholder="192.168.1.50" class="flex-1 rounded-lg border border-espresso-100 px-2.5 py-2 text-sm" />
              <input id="wifi-port" type="number" placeholder="9100" value="9100" class="w-20 rounded-lg border border-espresso-100 px-2.5 py-2 text-sm" />
            </div>
            <button id="connect-wifi-btn" class="bp-tap w-full bg-espresso-800 text-cream-50 rounded-xl py-2.5 text-sm font-semibold">Use this printer</button>
          </div>
        </div>
        <button id="disconnect-printer-btn" class="hidden mt-3 text-xs text-rust-600 font-semibold underline">Disconnect printer</button>
      </section>

      ${
        isAdmin
          ? `
      <section class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <h2 class="font-display font-semibold text-lg mb-1">Shop details</h2>
        <p class="text-sm text-espresso-500 mb-4">Shown on receipts and around the app. Update once you've picked a name and brand.</p>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Shop name</span>
            <input id="setting-shopname" type="text" value="${ctx.settings.shopName || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Currency symbol</span>
            <input id="setting-currency" type="text" value="${ctx.settings.currency || "P"}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Tax rate (%)</span>
            <input id="setting-tax" type="number" step="0.01" value="${((ctx.settings.taxRate || 0) * 100).toFixed(2)}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Receipt footer</span>
            <input id="setting-footer" type="text" value="${ctx.settings.receiptFooter || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
        </div>
        <button id="save-settings-btn" class="bp-tap mt-4 bg-sage-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Save shop details</button>
      </section>

      <section class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <div class="flex justify-between items-center mb-1">
          <h2 class="font-display font-semibold text-lg">Categories</h2>
          <button id="add-category-btn" class="text-sm font-semibold text-espresso-700 underline">+ Add category</button>
        </div>
        <p class="text-sm text-espresso-500 mb-4">Menu categories (Drinks, Pastries, etc.) — add as many as you need.</p>
        <div id="category-list" class="flex flex-col divide-y divide-espresso-100"></div>
      </section>

      <section class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <div class="flex justify-between items-center mb-1">
          <h2 class="font-display font-semibold text-lg">Products</h2>
          <button id="add-product-btn" class="text-sm font-semibold text-espresso-700 underline">+ Add product</button>
        </div>
        <p class="text-sm text-espresso-500 mb-4">Everything sellable at the register.</p>
        <div id="product-list" class="flex flex-col divide-y divide-espresso-100"></div>
      </section>
      `
          : `
      <section class="bg-white rounded-2xl border border-espresso-100 shadow-card p-5">
        <p class="text-sm text-espresso-500">Shop details and menu management are only available to admin accounts.</p>
      </section>
      `
      }
    </div>
  `;

  // -- Printer -------------------------------------------------------------
  printerManager.onChange((status) => {
    const dot = qs("#printer-status-dot", root);
    const label = qs("#printer-status-label", root);
    const disconnectBtn = qs("#disconnect-printer-btn", root);
    dot.classList.toggle("bg-rust-500", !status.connected);
    dot.classList.toggle("bg-sage-500", status.connected);
    label.textContent = status.connected ? `Connected — ${status.label}` : "Not connected";
    disconnectBtn.classList.toggle("hidden", !status.connected);
  });

  qs("#connect-bt-btn", root).addEventListener("click", async () => {
    try {
      const name = await printerManager.connectBluetooth();
      toast(`Connected to ${name || "printer"}.`, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  qs("#connect-wifi-btn", root).addEventListener("click", () => {
    const ip = qs("#wifi-ip", root).value.trim();
    const port = Number(qs("#wifi-port", root).value) || 9100;
    if (!ip) {
      toast("Enter the printer's IP address first.", "error");
      return;
    }
    printerManager.setWifi(ip, port);
    toast(`Printer set to ${ip}:${port}. Make sure the print bridge is running.`, "info");
  });

  qs("#disconnect-printer-btn", root).addEventListener("click", async () => {
    await printerManager.disconnectBluetooth();
    printerManager.clearWifi();
    toast("Printer disconnected.", "info");
  });

  qs("#test-print-btn", root).addEventListener("click", async () => {
    const testOrder = {
      orderNumber: "TEST",
      cashierName: user.name,
      createdAt: Date.now(),
      items: { item_0: { name: "Sample Latte", qty: 1, unitPrice: 130, modifiers: [], itemTotal: 130 } },
      subtotal: 130,
      tax: 130 * (ctx.settings.taxRate || 0),
      total: 130 * (1 + (ctx.settings.taxRate || 0)),
      paymentMethod: "Cash",
      amountTendered: 150,
      change: 150 - 130 * (1 + (ctx.settings.taxRate || 0)),
    };
    await printReceipt({ settings: ctx.settings, order: testOrder });
  });

  if (!isAdmin) return;

  // -- Shop settings ---------------------------------------------------
  qs("#save-settings-btn", root).addEventListener("click", async () => {
    const patch = {
      shopName: qs("#setting-shopname", root).value.trim() || "Brew POS",
      currency: qs("#setting-currency", root).value.trim() || "P",
      taxRate: Number(qs("#setting-tax", root).value || 0) / 100,
      receiptFooter: qs("#setting-footer", root).value.trim(),
    };
    const saved = await db.saveSettings(patch);
    Object.assign(ctx.settings, saved);
    ctx.onSettingsSaved?.(saved);
    toast("Shop details saved.", "success");
  });

  // -- Categories --------------------------------------------------------
  async function renderCategories() {
    const categories = await db.listCategories();
    const listEl = qs("#category-list", root);
    listEl.innerHTML = "";
    if (!categories.length) {
      listEl.innerHTML = `<p class="text-sm text-espresso-400 py-4">No categories yet.</p>`;
    }
    categories.forEach((c) => {
      const row = el("div", "flex items-center justify-between py-3");
      row.innerHTML = `
        <span class="text-sm font-medium">${c.name}</span>
        <div class="flex gap-3">
          <button class="text-xs text-espresso-500 underline" data-edit>Edit</button>
          <button class="text-xs text-rust-600 underline" data-delete>Delete</button>
        </div>
      `;
      row.querySelector("[data-edit]").addEventListener("click", () => categoryModal(c));
      row.querySelector("[data-delete]").addEventListener("click", async () => {
        const confirmed = await customConfirm(`Delete category "${c.name}"? Products in it will stay but be uncategorized.`, "Delete Category");
        if (!confirmed) return;
        await db.deleteCategory(c.id);
        await refreshAll();
      });
      listEl.appendChild(row);
    });
  }

  function categoryModal(existing) {
    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6">
        <h3 class="font-display font-semibold text-lg mb-4">${existing ? "Edit" : "Add"} category</h3>
        <label class="flex flex-col gap-1.5 mb-4">
          <span class="text-xs font-medium text-espresso-600">Name</span>
          <input id="cat-name" type="text" value="${existing?.name || ""}" placeholder="e.g. Drinks"
            class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
        </label>
        <button id="cat-save" class="bp-tap w-full bg-espresso-800 text-cream-50 rounded-xl py-3 text-sm font-semibold">Save category</button>
      </div>
    `);
    qs("#cat-save", panel).addEventListener("click", async () => {
      const name = qs("#cat-name", panel).value.trim();
      if (!name) return toast("Category name is required.", "error");
      await db.saveCategory(existing?.id, { name, sortOrder: existing?.sortOrder ?? Date.now() });
      close();
      await refreshAll();
      toast("Category saved.", "success");
    });
  }

  qs("#add-category-btn", root).addEventListener("click", () => categoryModal(null));

  // -- Products ------------------------------------------------------------
  async function renderProducts() {
    const [products, categories] = await Promise.all([db.listProducts(), db.listCategories()]);
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const listEl = qs("#product-list", root);
    listEl.innerHTML = "";
    if (!products.length) {
      listEl.innerHTML = `<p class="text-sm text-espresso-400 py-4">No products yet.</p>`;
    }
    products.forEach((p) => {
      const row = el("div", "flex items-center justify-between py-3 gap-3");
      row.innerHTML = `
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">${p.name} ${p.isAvailable === false ? '<span class="text-xs text-rust-500">(hidden)</span>' : ""}</p>
          <p class="text-xs text-espresso-500">${catMap[p.categoryId] || "Uncategorized"} · ${formatMoney(p.price, ctx.settings.currency)} · Stock: ${p.stock ?? 0}${(p.stock ?? 0) <= (p.lowStockThreshold ?? 0) ? ' <span class="text-rust-500 font-medium">low</span>' : ""}</p>
        </div>
        <div class="flex gap-3 shrink-0">
          <button class="text-xs text-espresso-500 underline" data-edit>Edit</button>
          <button class="text-xs text-rust-600 underline" data-delete>Delete</button>
        </div>
      `;
      row.querySelector("[data-edit]").addEventListener("click", () => productModal(p, categories));
      row.querySelector("[data-delete]").addEventListener("click", async () => {
        const confirmed = await customConfirm(`Delete "${p.name}"?`, "Delete Product");
        if (!confirmed) return;
        await db.deleteProduct(p.id);
        await refreshAll();
      });
      listEl.appendChild(row);
    });
  }

  function productModal(existing, categories) {
    const modText = (existing?.modifiers || [])
      .map((m) => `${m.name}:${m.priceDelta || 0}`)
      .join(", ");
    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6">
        <h3 class="font-display font-semibold text-lg mb-4">${existing ? "Edit" : "Add"} product</h3>
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Name</span>
            <input id="p-name" type="text" value="${existing?.name || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Category</span>
            <select id="p-category" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm">
              ${categories.map((c) => `<option value="${c.id}" ${existing?.categoryId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Base price</span>
            <input id="p-price" type="number" step="0.01" value="${existing?.price ?? ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <div class="grid grid-cols-3 gap-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">${existing ? "Stock" : "Starting stock"}</span>
              <input id="p-stock" type="number" step="1" value="${existing?.stock ?? 0}" ${existing ? "disabled" : ""} class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm ${existing ? "bg-cream-100 text-espresso-400" : ""}" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Unit cost</span>
              <input id="p-cost" type="number" step="0.01" value="${existing?.costPrice ?? ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Low-stock at</span>
              <input id="p-threshold" type="number" step="1" value="${existing?.lowStockThreshold ?? 10}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
          </div>
          ${existing ? `<p class="text-xs text-espresso-400 -mt-1">To change stock afterwards, use Restock in the Admin Portal's Inventory tab so it's logged.</p>` : ""}
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Image URL (optional)</span>
            <input id="p-image" type="text" value="${existing?.imageUrl || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Variants (optional) — "Small:0, Medium:15, Large:25"</span>
            <input id="p-modifiers" type="text" value="${modText}" placeholder="Small:0, Medium:15, Large:25"
              class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex items-center gap-2 mt-1">
            <input id="p-available" type="checkbox" ${existing?.isAvailable === false ? "" : "checked"} class="accent-espresso-700" />
            <span class="text-sm">Available on the register</span>
          </label>
        </div>
        <button id="p-save" class="bp-tap w-full mt-5 bg-espresso-800 text-cream-50 rounded-xl py-3 text-sm font-semibold">Save product</button>
      </div>
    `);
    qs("#p-save", panel).addEventListener("click", async () => {
      const name = qs("#p-name", panel).value.trim();
      const price = Number(qs("#p-price", panel).value);
      const categoryId = qs("#p-category", panel).value;
      if (!name || !categoryId || Number.isNaN(price)) {
        toast("Name, category, and price are required.", "error");
        return;
      }
      const modifiers = qs("#p-modifiers", panel)
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [n, d] = s.split(":");
          return { name: (n || "").trim(), priceDelta: Number(d) || 0 };
        });
      const payload = {
        name,
        categoryId,
        price,
        costPrice: Number(qs("#p-cost", panel).value) || 0,
        lowStockThreshold: Number(qs("#p-threshold", panel).value) || 0,
        imageUrl: qs("#p-image", panel).value.trim(),
        modifiers,
        isAvailable: qs("#p-available", panel).checked,
      };
      if (!existing) payload.stock = Number(qs("#p-stock", panel).value) || 0;
      await db.saveProduct(existing?.id, payload);
      close();
      await refreshAll();
      toast("Product saved.", "success");
    });
  }

  qs("#add-product-btn", root).addEventListener("click", async () => {
    const categories = await db.listCategories();
    if (!categories.length) {
      toast("Add a category first.", "error");
      return;
    }
    productModal(null, categories);
  });

  async function refreshAll() {
    await Promise.all([renderCategories(), renderProducts()]);
    document.dispatchEvent(new CustomEvent("bp:catalog-updated"));
  }

  await refreshAll();
}
