// ============================================================================
// Brew POS — Order (POS) view
// ============================================================================

import { cart } from "./cart.js";
import { formatMoney, el, qs, qsa, openModal, toast, dateKey } from "./utils.js";
import { printReceipt } from "./printer.js";

export async function initOrderView(root, ctx) {
  const { db } = ctx;
  let categories = await db.listCategories();
  let products = await db.listProducts();
  let ingredients = [];
  try {
    ingredients = await db.listIngredients();
  } catch (err) {
    console.warn("Ingredients not available, using empty array:", err);
    ingredients = [];
  }
  let activeCategory = "all";
  let searchTerm = "";
  let cartDiscountType = "none"; // "none" or "pwd"
  let cartDiscountAmount = 0;

  if (!root) {
    throw new Error("Root element not found");
  }

  root.innerHTML = `
    <div class="h-full min-h-0 flex flex-col sm:flex-row overflow-hidden">
      <div class="flex-1 min-h-0 flex flex-col relative order-1">
        <div class="shrink-0 bg-gradient-to-r from-cream-50 to-amber-50 border-b border-espresso-100 px-3 sm:px-4 pt-3 pb-2">
          <div class="flex gap-3 mb-3">
            <select id="category-dropdown" class="flex-1 rounded-xl border border-espresso-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-sm">
              <option value="all">All Categories</option>
            </select>
          </div>
          <div class="relative">
            <input id="product-search" type="search" placeholder="Search menu…"
              class="w-full rounded-xl border border-espresso-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-sm" />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400 text-sm">🔍</span>
          </div>
        </div>
        <div id="product-grid" class="flex-1 overflow-y-auto bp-scroll p-3 sm:p-4 grid gap-3 content-start pb-24 sm:pb-4" style="grid-template-columns: repeat(2, 1fr);"></div>
      </div>

      <div id="cart-backdrop" class="sm:hidden fixed inset-0 bg-black/50 z-20 opacity-0 pointer-events-none transition-opacity duration-200"></div>

      <aside id="cart-panel"
        class="w-full sm:w-80 md:w-96 shrink-0 bg-gradient-to-b from-white to-cream-50 border-t sm:border-t-0 sm:border-l border-espresso-100 flex flex-col order-2
        fixed sm:static bottom-0 left-0 right-0 sm:h-full max-h-[80vh] sm:max-h-none translate-y-full sm:translate-y-0
        transition-transform duration-200 z-30 rounded-t-2xl sm:rounded-none shadow-2xl sm:shadow-lg overflow-hidden">
        <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-espresso-100 bg-gradient-to-r from-cream-50 to-white">
          <h2 class="font-display font-semibold text-lg">Current Order</h2>
          <div class="flex items-center gap-2">
            <button id="clear-cart-btn" class="text-xs text-rust-600 font-medium hover:underline transition-colors">Clear</button>
            <button id="close-cart-btn" class="sm:hidden text-espresso-400 text-xl leading-none px-1">⌄</button>
          </div>
        </div>
        <div id="cart-items" class="flex-1 overflow-y-auto bp-scroll px-4 py-2 divide-y divide-espresso-100"></div>
        <div class="shrink-0 border-t border-espresso-100 px-4 py-3 bg-gradient-to-r from-cream-50 to-amber-50 rounded-t-2xl sm:rounded-none">
          <div class="flex justify-between text-sm text-espresso-600 mb-1">
            <span>Subtotal</span><span id="sum-subtotal">₱0.00</span>
          </div>
          <div class="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p class="text-xs font-medium text-espresso-700 mb-2">Discount</p>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="cart-discount" value="none" checked class="accent-amber-600" />
                <span class="text-xs text-espresso-700">None</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="cart-discount" value="pwd" class="accent-amber-600" />
                <span class="text-xs text-espresso-700">PWD (20% off)</span>
              </label>
            </div>
          </div>
          <div class="flex justify-between text-sm text-espresso-600 mb-2">
            <span>Tax</span><span id="sum-tax">₱0.00</span>
          </div>
          <div class="flex justify-between text-lg font-bold text-espresso-900 mb-3">
            <span>Total</span><span id="sum-total">₱0.00</span>
          </div>
          <button id="charge-btn" disabled
            class="bp-tap w-full btn-gradient-primary disabled:from-espresso-300 disabled:to-espresso-400 disabled:text-espresso-500 text-white font-semibold rounded-xl py-3.5 text-base shadow-lg transition-all">
            Charge <span id="charge-total">₱0.00</span>
          </button>
        </div>
      </aside>

      <button id="cart-fab" class="sm:hidden hidden fixed bottom-[calc(0.75rem+3.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl py-3.5 px-4 flex items-center justify-between shadow-2xl bp-tap">
        <span>View cart (<span id="fab-count">0</span>)</span><span id="fab-total">₱0.00</span>
      </button>
    </div>
  `;

  const grid = qs("#product-grid", root);
  const categoryDropdown = qs("#category-dropdown", root);
  const cartItemsEl = qs("#cart-items", root);
  const cartPanel = qs("#cart-panel", root);
  const cartFab = qs("#cart-fab", root);
  const cartBackdrop = qs("#cart-backdrop", root);

  if (!grid || !categoryDropdown || !cartItemsEl || !cartPanel || !cartFab || !cartBackdrop) {
    throw new Error("Required DOM elements not found");
  }

  // Helper: Check if product can be made based on ingredients
  function canMakeProduct(product, currentIngredients) {
    const recipe = product.recipe || [];
    if (recipe.length === 0) return { canMake: true, limiting: null }; // No recipe = always available

    const ingMap = Object.fromEntries(currentIngredients.map((i) => [i.id, i]));
    let limiting = null;
    let minCanMake = Infinity;

    for (const r of recipe) {
      const ing = ingMap[r.ingredientId];
      if (!ing) continue;
      const possible = Math.floor((ing.stock || 0) / r.qty);
      if (possible < minCanMake) {
        minCanMake = possible;
        limiting = ing.name;
      }
    }

    return { canMake: minCanMake > 0, limiting, canMakeCount: minCanMake };
  }

  // Helper: Check if cart can be fulfilled
  function canFulfillCart(cartItems, currentIngredients) {
    const ingMap = Object.fromEntries(currentIngredients.map((i) => [i.id, i]));
    const required = {};

    // Aggregate required ingredients from all cart items
    for (const item of cartItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const recipe = product.recipe || [];
      for (const r of recipe) {
        required[r.ingredientId] = (required[r.ingredientId] || 0) + (r.qty * item.qty);
      }
    }

    // Check if we have enough of each ingredient
    const shortages = [];
    for (const [ingId, qtyNeeded] of Object.entries(required)) {
      const ing = ingMap[ingId];
      if (!ing) continue;
      if ((ing.stock || 0) < qtyNeeded) {
        shortages.push(`${ing.name} (need ${qtyNeeded}, have ${ing.stock})`);
      }
    }

    return { canFulfill: shortages.length === 0, shortages };
  }

  function renderTabs() {
    const all = [{ id: "all", name: "All Categories" }, ...categories];
    if (!categoryDropdown) return;
    categoryDropdown.innerHTML = "";
    all.forEach((c) => {
      const option = el("option", "", c.name);
      option.value = c.id;
      if (activeCategory === c.id) option.selected = true;
      categoryDropdown.appendChild(option);
    });
  }

  if (categoryDropdown) {
    categoryDropdown.addEventListener("change", () => {
      activeCategory = categoryDropdown.value;
      renderGrid();
    });
  }

  function renderGrid() {
    if (!grid) return;

    // Force 2 columns on very small screens (≤480px), 3 columns on all other screens
    if (window.innerWidth <= 480) {
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }

    const term = searchTerm.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCat = activeCategory === "all" || p.categoryId === activeCategory;
      const matchesSearch = !term || (p.name || "").toLowerCase().includes(term);
      return matchesCat && matchesSearch && p.isAvailable !== false;
    });
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = `<div class="col-span-full text-center text-espresso-400 py-16">
        <p class="text-3xl mb-2">🫘</p><p class="text-sm">No items here yet.</p></div>`;
      return;
    }
    list.forEach((p) => {
      const { canMake, limiting } = canMakeProduct(p, ingredients);
      const isOutOfStock = !canMake;

      // Get category icon based on category name
      const category = categories.find(c => c.id === p.categoryId);
      const categoryName = category ? category.name.toLowerCase() : "";
      let categoryIcon = "☕"; // default
      if (categoryName.includes("waffle")) {
        categoryIcon = "🧇";
      } else if (categoryName.includes("milktea") || categoryName.includes("milk tea") || categoryName.includes("bubble")) {
        categoryIcon = "🧋";
      } else if (categoryName.includes("coffee")) {
        categoryIcon = "☕";
      } else if (categoryName.includes("donut")) {
        categoryIcon = "🍩";
      } else if (categoryName.includes("fruit")) {
        categoryIcon = "🍹";
      }

      const card = el(
        "button",
        isOutOfStock
          ? "bp-tap text-left bg-white rounded-2xl border border-espresso-100 shadow-lg p-2.5 sm:p-3 flex flex-col gap-2 active:shadow-none transition-all hover:shadow-xl hover:-translate-y-1 opacity-60 cursor-not-allowed"
          : "bp-tap text-left bg-white rounded-2xl border border-espresso-100 shadow-lg p-2.5 sm:p-3 flex flex-col gap-2 active:shadow-none transition-all hover:shadow-xl hover:-translate-y-1"
      );
      card.type = "button";
      card.disabled = isOutOfStock;
      card.innerHTML = `
        <div class="w-full aspect-square rounded-xl bg-gradient-to-br from-cream-200 to-amber-100 flex items-center justify-center text-5xl sm:text-6xl overflow-hidden relative group">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-full h-full object-cover transition-transform group-hover:scale-105" alt="${p.name}">` : categoryIcon}
          <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          ${isOutOfStock ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="text-white text-xs font-bold px-2 py-1 rounded bg-rust-600">Out of stock</span></div>' : ''}
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <p class="font-semibold text-xs sm:text-sm text-espresso-900 bp-clamp-2 leading-tight">${p.name}</p>
          <p class="text-espresso-500 text-xs sm:text-sm mt-1 font-bold">${formatMoney(p.price, ctx.settings.currency)}</p>
          ${isOutOfStock ? `<p class="text-xs text-rust-600 mt-1">Needs: ${limiting}</p>` : ''}
        </div>
      `;
      card.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Product clicked:", p.name);
        openProductModal(p);
      });
      grid.appendChild(card);
    });
  }

  function openProductModal(product) {
    const hasModifiers = product.modifiers && product.modifiers.length > 0;
    let qty = 1;
    let selectedModIndex = 0;

    const modifiersHtml = hasModifiers
      ? `<div class="flex flex-col gap-2 mb-5">
          ${product.modifiers
            .map(
              (m, i) => `
            <label class="flex items-center justify-between border border-espresso-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-cream-50 transition-colors" data-mod-option="${i}">
              <span class="flex items-center gap-3 text-sm font-medium text-espresso-800">
                <input type="radio" name="mod" value="${i}" ${i === 0 ? "checked" : ""} class="accent-amber-500 w-4 h-4" />
                ${m.name}
              </span>
              <span class="text-sm font-medium text-amber-600">${m.priceDelta ? "+" + formatMoney(m.priceDelta, ctx.settings.currency) : "—"}</span>
            </label>`
            )
            .join("")}
        </div>`
      : "";

    const { panel, close } = openModal(`
      <div class="p-6 sm:p-8 max-w-md mx-auto">
        <div class="flex justify-between items-start mb-6">
          <div class="flex-1 min-w-0">
            <h3 class="font-display font-semibold text-2xl text-espresso-900">${product.name}</h3>
            <p class="text-amber-600 font-medium text-base mt-1">${formatMoney(product.price, ctx.settings.currency)}</p>
          </div>
          <button id="modal-close" class="text-espresso-300 hover:text-espresso-500 text-2xl leading-none ml-3 flex-shrink-0 transition-colors">✕</button>
        </div>
        ${modifiersHtml}
        <div class="flex items-center justify-between mb-6">
          <span class="text-sm font-medium text-espresso-700">Quantity</span>
          <div class="flex items-center gap-4 bg-cream-50 rounded-2xl px-4 py-2">
            <button id="qty-minus" class="w-8 h-8 rounded-xl bg-white text-espresso-800 text-lg font-bold bp-tap shadow-sm hover:shadow-md transition-shadow">−</button>
            <span id="qty-val" class="w-8 text-center font-semibold text-lg text-espresso-900">1</span>
            <button id="qty-plus" class="w-8 h-8 rounded-xl bg-white text-espresso-800 text-lg font-bold bp-tap shadow-sm hover:shadow-md transition-shadow">+</button>
          </div>
        </div>
        <button id="modal-add" class="bp-tap w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-2xl py-4 text-base shadow-lg shadow-amber-500/30 transition-all">
          Add to order · <span id="modal-add-total">${formatMoney(product.price, ctx.settings.currency)}</span>
        </button>
      </div>
    `);

    function updateTotal() {
      const mod = hasModifiers ? product.modifiers[selectedModIndex] : null;
      const unit = product.price + (mod?.priceDelta || 0);
      qs("#modal-add-total", panel).textContent = formatMoney(unit * qty, ctx.settings.currency);
    }

    qs("#modal-close", panel).addEventListener("click", close);
    qs("#qty-minus", panel).addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qs("#qty-val", panel).textContent = qty;
      updateTotal();
    });
    qs("#qty-plus", panel).addEventListener("click", () => {
      qty += 1;
      qs("#qty-val", panel).textContent = qty;
      updateTotal();
    });
    qsa("[data-mod-option]", panel).forEach((label) => {
      label.addEventListener("click", () => {
        selectedModIndex = Number(label.dataset.modOption);
        qsa("[data-mod-option] input", panel).forEach((r) => (r.checked = false));
        qs("input", label).checked = true;
        updateTotal();
      });
    });
    qs("#modal-add", panel).addEventListener("click", () => {
      // Check ingredient availability
      const { canMake, limiting } = canMakeProduct(product, ingredients);
      if (!canMake) {
        toast(`Cannot add: ${limiting} is out of stock`, "error");
        return;
      }

      const selectedModifiers = hasModifiers ? [product.modifiers[selectedModIndex]] : [];
      for (let i = 0; i < qty; i++) {
        cart.add({
          productId: product.id,
          name: product.name,
          basePrice: product.price,
          selectedModifiers,
        });
      }
      toast(`Added ${product.name} to order.`, "success");
      close();
      // Show cart on mobile after adding
      openCartMobile();
    });
  }

  function renderCart() {
    const items = cart.items;
    if (!cartItemsEl) return;
    cartItemsEl.innerHTML = "";
    if (!items.length) {
      cartItemsEl.innerHTML = `<div class="text-center text-espresso-400 py-16">
        <p class="text-3xl mb-2">🛒</p><p class="text-sm">Cart is empty. Tap a product to add it.</p></div>`;
    }
    items.forEach((item) => {
      const row = el("div", "py-3 flex gap-3");
      row.innerHTML = `
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-espresso-900 truncate">${item.name}</p>
          ${item.modifiers.length ? `<p class="text-xs text-espresso-500">${item.modifiers.join(", ")}</p>` : ""}
          <p class="text-xs text-espresso-500">${formatMoney(item.unitPrice, ctx.settings.currency)} each</p>
          <button class="text-xs text-espresso-400 underline mt-1" data-note-toggle>${item.note ? "Edit note" : "+ Add note"}</button>
          <div class="hidden mt-1" data-note-box>
            <input type="text" value="${item.note || ""}" placeholder="e.g. less ice"
              class="w-full text-xs rounded-lg border border-espresso-100 px-2 py-1.5" data-note-input />
          </div>
        </div>
        <div class="flex flex-col items-end justify-between shrink-0">
          <button class="text-espresso-300 hover:text-rust-600 text-sm" data-remove>✕</button>
          <div class="flex items-center gap-2">
            <button class="w-7 h-7 rounded-full bg-cream-200 text-espresso-800 font-bold bp-tap" data-minus>−</button>
            <span class="text-sm font-semibold w-4 text-center">${item.qty}</span>
            <button class="w-7 h-7 rounded-full bg-cream-200 text-espresso-800 font-bold bp-tap" data-plus>+</button>
          </div>
          <p class="text-sm font-semibold">${formatMoney(item.itemTotal, ctx.settings.currency)}</p>
        </div>
      `;
      row.querySelector("[data-remove]").addEventListener("click", () => cart.remove(item.lineId));
      row.querySelector("[data-minus]").addEventListener("click", () => cart.updateQty(item.lineId, item.qty - 1));
      row.querySelector("[data-plus]").addEventListener("click", () => cart.updateQty(item.lineId, item.qty + 1));
      const noteToggle = row.querySelector("[data-note-toggle]");
      const noteBox = row.querySelector("[data-note-box]");
      noteToggle.addEventListener("click", () => noteBox.classList.toggle("hidden"));
      row.querySelector("[data-note-input]").addEventListener("change", (e) => cart.setNote(item.lineId, e.target.value));
      cartItemsEl.appendChild(row);
    });

    const subtotal = cart.subtotal();
    if (cartDiscountType === "pwd") {
      cartDiscountAmount = subtotal * 0.20;
    } else {
      cartDiscountAmount = 0;
    }
    const discountedSubtotal = subtotal - cartDiscountAmount;
    const tax = discountedSubtotal * (ctx.settings.taxRate || 0);
    const total = discountedSubtotal + tax;

    const sumSubtotal = qs("#sum-subtotal", root);
    const sumTax = qs("#sum-tax", root);
    const sumTotal = qs("#sum-total", root);
    const chargeTotal = qs("#charge-total", root);
    const chargeBtn = qs("#charge-btn", root);
    const fabCount = qs("#fab-count", root);
    const fabTotal = qs("#fab-total", root);

    if (sumSubtotal) sumSubtotal.textContent = formatMoney(subtotal, ctx.settings.currency);
    if (sumTax) sumTax.textContent = formatMoney(tax, ctx.settings.currency);
    if (sumTotal) sumTotal.textContent = formatMoney(total, ctx.settings.currency);
    if (chargeTotal) chargeTotal.textContent = formatMoney(total, ctx.settings.currency);
    if (chargeBtn) chargeBtn.disabled = items.length === 0;

    if (fabCount) fabCount.textContent = cart.count();
    if (fabTotal) fabTotal.textContent = formatMoney(total, ctx.settings.currency);
    if (cartFab) cartFab.classList.toggle("hidden", items.length === 0);
    if (!items.length && cartPanel) cartPanel.classList.add("translate-y-full");
  }

  // Mobile cart functions
  function openCartMobile() {
    cartPanel.classList.remove("translate-y-full");
    cartBackdrop.classList.remove("opacity-0", "pointer-events-none");
    document.body.style.overflow = "hidden";
  }

  function closeCartMobile() {
    cartPanel.classList.add("translate-y-full");
    cartBackdrop.classList.add("opacity-0", "pointer-events-none");
    document.body.style.overflow = "";
  }

  // Mobile cart drawer open/close
  cartFab.addEventListener("click", () => openCartMobile());
  qs("#close-cart-btn", root).addEventListener("click", () => closeCartMobile());
  cartBackdrop.addEventListener("click", () => closeCartMobile());

  qs("#clear-cart-btn", root).addEventListener("click", () => {
    if (!cart.items.length) return;
    cart.clear();
    // Reset discount when clearing cart
    cartDiscountType = "none";
    cartDiscountAmount = 0;
    const noneRadio = qs("input[name='cart-discount'][value='none']", root);
    if (noneRadio) noneRadio.checked = true;
    toast("Order cleared.", "info");
  });

  // Handle cart discount radio buttons
  qsa("input[name='cart-discount']", root).forEach((radio) => {
    radio.addEventListener("change", () => {
      cartDiscountType = radio.value;
      renderCart();
    });
  });

  qs("#product-search", root).addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderGrid();
  });

  qs("#charge-btn", root).addEventListener("click", () => openCheckout(ctx));

  cart.onChange(renderCart);
  renderTabs();
  renderGrid();

  // Let settings-view tell us to refresh the catalog after edits.
  document.addEventListener("bp:catalog-updated", async () => {
    categories = await db.listCategories();
    products = await db.listProducts();
    try {
      ingredients = await db.listIngredients();
    } catch (err) {
      console.warn("Ingredients not available during refresh:", err);
      ingredients = [];
    }
    renderTabs();
    renderGrid();
  });

  // Listen for ingredient changes to update availability
  if (db.onIngredientsChange) {
    db.onIngredientsChange((list) => {
      ingredients = list;
      renderGrid();
    });
  }

  async function openCheckout(ctx) {
    // Validate cart ingredients before checkout
    const { canFulfill, shortages } = canFulfillCart(cart.items, ingredients);
    if (!canFulfill) {
      toast(`Cannot checkout: ${shortages.join(", ")}`, "error");
      return;
    }

    const subtotal = cart.subtotal();
    const tax = subtotal * (ctx.settings.taxRate || 0);
    const total = subtotal + tax;
    let paymentMethod = "Cash";
    let tendered = total;
    let discountType = cartDiscountType; // Use cart discount type
    let discountAmount = cartDiscountAmount; // Use cart discount amount
    let finalTotal = total - discountAmount;

    const { panel, close } = openModal(`
      <div class="p-4 sm:p-5 md:p-6 max-w-lg mx-auto">
        <div class="flex justify-between items-start mb-3 sm:mb-4">
          <h3 class="font-display font-semibold text-lg sm:text-xl">Confirm Order</h3>
          <button id="modal-close" class="text-espresso-400 text-xl sm:text-2xl leading-none ml-2 flex-shrink-0">✕</button>
        </div>

        <div class="max-h-32 sm:max-h-40 overflow-y-auto bp-scroll divide-y divide-espresso-100 mb-3 sm:mb-4 border border-espresso-100 rounded-xl">
          ${cart.items
            .map(
              (i) => `<div class="flex justify-between px-3 py-2 text-xs sm:text-sm">
              <span class="truncate">${i.qty}x ${i.name}${i.modifiers.length ? ` (${i.modifiers.join(", ")})` : ""}</span>
              <span class="font-medium ml-2 flex-shrink-0">${formatMoney(i.itemTotal, ctx.settings.currency)}</span>
            </div>`
            )
            .join("")}
        </div>

        <div class="flex justify-between text-xs sm:text-sm text-espresso-600 mb-1"><span>Subtotal</span><span>${formatMoney(subtotal, ctx.settings.currency)}</span></div>
        <div class="flex justify-between text-xs sm:text-sm text-espresso-600 mb-2 sm:mb-3"><span>Tax</span><span>${formatMoney(tax, ctx.settings.currency)}</span></div>

        <div class="mb-3 sm:mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p class="text-xs sm:text-sm font-medium text-espresso-700 mb-2">Discount</p>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="discount" value="none" ${discountType === "none" ? "checked" : ""} class="accent-amber-600" />
              <span class="text-xs sm:text-sm text-espresso-700">None</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="discount" value="pwd" ${discountType === "pwd" ? "checked" : ""} class="accent-amber-600" />
              <span class="text-xs sm:text-sm text-espresso-700">PWD (20% off)</span>
            </label>
          </div>
        </div>

        <div class="flex justify-between text-base sm:text-lg font-bold mb-3 sm:mb-4"><span>Total Due</span><span id="final-total">${formatMoney(total, ctx.settings.currency)}</span></div>

        <p class="text-xs sm:text-sm font-medium text-espresso-700 mb-2">Payment method</p>
        <div class="grid grid-cols-3 gap-2 mb-3 sm:mb-4" id="pay-methods">
          ${["Cash", "Card", "E-wallet"]
            .map(
              (m) => `<button data-method="${m}" class="pay-btn border rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium bp-tap ${
                m === "Cash" ? "bg-espresso-800 text-cream-50 border-espresso-800" : "bg-white text-espresso-700 border-espresso-100"
              }">${m}</button>`
            )
            .join("")}
        </div>

        <div id="cash-fields">
          <label class="flex flex-col gap-1.5 mb-2">
            <span class="text-xs sm:text-sm font-medium text-espresso-700">Amount tendered</span>
            <input id="tendered-input" type="number" min="0" step="0.01" value="${finalTotal.toFixed(2)}"
              class="rounded-xl border border-espresso-100 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-espresso-400" />
          </label>
          <div class="flex gap-2 mb-3">
            ${[total, total + 50, total + 100, total + 500]
              .map((v) => `<button class="quick-cash-btn flex-1 bg-cream-200 rounded-lg py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium" data-base="${v.toFixed(2)}" data-val="${v.toFixed(2)}">${formatMoney(v, ctx.settings.currency)}</button>`)
              .join("")}
          </div>
          <div class="flex justify-between text-xs sm:text-sm font-semibold text-sage-700 mb-3 sm:mb-4">
            <span>Change</span><span id="change-amount">${formatMoney(0, ctx.settings.currency)}</span>
          </div>
        </div>

        <button id="confirm-order-btn" class="bp-tap w-full btn-gradient-success text-white font-semibold rounded-xl py-3 sm:py-3.5 text-sm sm:text-base shadow-lg transition-all">
          Confirm & Print Receipt
        </button>
      </div>
    `);

    function updateChange() {
      const tenderedInput = qs("#tendered-input", panel);
      if (!tenderedInput) return;
      const val = Number(tenderedInput.value || 0);
      tendered = val;
      const change = Math.max(0, val - finalTotal);
      const changeEl = qs("#change-amount", panel);
      if (changeEl) changeEl.textContent = formatMoney(change, ctx.settings.currency);
    }

    qs("#modal-close", panel).addEventListener("click", close);
    qsa(".pay-btn", panel).forEach((btn) => {
      btn.addEventListener("click", () => {
        paymentMethod = btn.dataset.method;
        qsa(".pay-btn", panel).forEach((b) => {
          const active = b === btn;
          b.classList.toggle("bg-espresso-800", active);
          b.classList.toggle("text-cream-50", active);
          b.classList.toggle("border-espresso-800", active);
          b.classList.toggle("bg-white", !active);
          b.classList.toggle("text-espresso-700", !active);
          b.classList.toggle("border-espresso-100", !active);
        });
        qs("#cash-fields", panel).classList.toggle("hidden", paymentMethod !== "Cash");
      });
    });
    qs("#tendered-input", panel)?.addEventListener("input", updateChange);
    qsa(".quick-cash-btn", panel).forEach((b) =>
      b.addEventListener("click", () => {
        const val = Number(b.dataset.val) || 0;
        qs("#tendered-input", panel).value = val.toFixed(2);
        tendered = val;
        updateChange();
      })
    );

    // Handle discount radio buttons
    qsa("input[name='discount']", panel).forEach((radio) => {
      radio.addEventListener("change", () => {
        discountType = radio.value;
        if (discountType === "pwd") {
          discountAmount = subtotal * 0.20; // 20% discount on subtotal
        } else {
          discountAmount = 0;
        }
        const discountedSubtotal = subtotal - discountAmount;
        const newTax = discountedSubtotal * (ctx.settings.taxRate || 0);
        finalTotal = discountedSubtotal + newTax;
        const finalTotalEl = qs("#final-total", panel);
        if (finalTotalEl) finalTotalEl.textContent = formatMoney(finalTotal, ctx.settings.currency);
        // Update tendered input and quick cash buttons
        const tenderedInput = qs("#tendered-input", panel);
        if (tenderedInput) tenderedInput.value = finalTotal.toFixed(2);
        tendered = finalTotal;
        updateChange();
        // Update quick cash buttons based on base values
        qsa(".quick-cash-btn", panel).forEach((btn) => {
          const baseVal = Number(btn.dataset.base) || 0;
          const diff = baseVal - total;
          const newVal = finalTotal + diff;
          btn.dataset.val = newVal.toFixed(2);
          btn.textContent = formatMoney(newVal, ctx.settings.currency);
        });
      });
    });

    updateChange();

    qs("#confirm-order-btn", panel).addEventListener("click", async () => {
      if (paymentMethod === "Cash" && tendered < finalTotal) {
        toast("Amount tendered is less than the total due.", "error");
        return;
      }
      const confirmBtn = qs("#confirm-order-btn", panel);
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Processing…";
      try {
        const orderNumber = await db.nextOrderNumber();
        const items = {};
        cart.items.forEach((i, idx) => {
          items[`item_${idx}`] = {
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            modifiers: i.modifiers,
            note: i.note,
            itemTotal: i.itemTotal,
          };
        });
        const now = Date.now();
        const order = {
          orderNumber,
          cashierId: ctx.user.uid,
          cashierName: ctx.user.name,
          status: "completed",
          items,
          subtotal,
          tax,
          discount: discountAmount,
          discountType: discountType === "pwd" ? "PWD" : "None",
          total: finalTotal,
          paymentMethod,
          amountTendered: paymentMethod === "Cash" ? tendered : finalTotal,
          change: paymentMethod === "Cash" ? tendered - finalTotal : 0,
          createdAt: now,
          dateKey: dateKey(now),
        };
        const orderId = await db.createOrder(order);
        await printReceipt({ settings: ctx.settings, order });
        close();
        showSuccess(orderNumber);
        cart.clear();
        cartPanel.classList.add("translate-y-full");
        document.dispatchEvent(new CustomEvent("bp:order-created", { detail: { orderId } }));
      } catch (err) {
        console.error(err);
        toast(err.message || "Couldn't complete the order.", "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm & Print Receipt";
      }
    });
  }

  function showSuccess(orderNumber) {
    const { close } = openModal(`
      <div class="p-8 text-center">
        <div class="w-16 h-16 rounded-full bg-sage-100 text-sage-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
        <h3 class="font-display font-semibold text-xl mb-1">Order #${orderNumber} complete</h3>
        <p class="text-espresso-500 text-sm mb-6">Receipt sent to the printer.</p>
        <button id="done-btn" class="bp-tap w-full bg-espresso-800 text-cream-50 font-semibold rounded-xl py-3 shadow-card">Start next order</button>
      </div>
    `);
    qs("#done-btn").addEventListener("click", close);
    setTimeout(close, 4000);
  }
}
