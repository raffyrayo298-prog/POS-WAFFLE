// ============================================================================
// Admin Portal — Inventory (Ingredient-based)
// ============================================================================
// Two sub-tabs:
// 1. Ingredients - Manage ingredient stock, cost, restock
// 2. Product Recipes - View/edit recipes, compute cost per serving
// ============================================================================

import { formatMoney, formatDate, formatTime, el, qs, qsa, openModal, toast, debounce, escapeHtml, customConfirm } from "./utils.js";

export async function initAdminInventoryView(root, ctx) {
  console.log("initAdminInventoryView called with ctx:", ctx);
  const { db, user, settings } = ctx;
  let ingredients = [];
  let products = [];
  let categories = [];
  let stockLog = [];
  let activeSubTab = "ingredients"; // "ingredients" | "recipes"
  let search = "";
  let filter = "all"; // all | low | out

  if (!root) {
    console.error("initAdminInventoryView: root element is null");
    throw new Error("Root element not found");
  }

  root.innerHTML = `
    <div class="p-3 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4">
      <!-- Sub-tab Navigation -->
      <div class="flex gap-2 border-b border-espresso-200 pb-2">
        <button data-subtab="ingredients" class="bp-subtab-btn px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-espresso-800 text-cream-50">Ingredients</button>
        <button data-subtab="recipes" class="bp-subtab-btn px-4 py-2 text-sm font-semibold rounded-lg transition-colors text-espresso-600 hover:bg-cream-100">Product Recipes</button>
      </div>

      <!-- Ingredients Tab -->
      <div id="tab-ingredients" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <input id="ing-search" type="text" placeholder="Search ingredients…" class="flex-1 min-w-[10rem] rounded-xl border border-espresso-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm" />
            <select id="ing-filter" class="rounded-xl border border-espresso-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm">
              <option value="all">All ingredients</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
          <button id="add-ingredient-btn" class="bp-tap btn-gradient-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all">+ Add ingredient</button>
        </div>

        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gradient-to-r from-cream-50 to-amber-50">
                <tr>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Name</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Unit</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Stock</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Low-stock at</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Cost/unit</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Status</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody id="ing-body" class="divide-y divide-espresso-100"></tbody>
            </table>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg p-5">
          <h2 class="font-display font-semibold text-lg mb-4">Recent Stock Movements</h2>
          <div id="stock-log" class="flex flex-col divide-y divide-espresso-100 max-h-72 overflow-y-auto bp-scroll"></div>
        </div>
      </div>

      <!-- Product Recipes Tab -->
      <div id="tab-recipes" class="hidden flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <input id="recipe-search" type="text" placeholder="Search products…" class="flex-1 min-w-[10rem] rounded-xl border border-espresso-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm" />
          </div>
          <button id="add-product-btn" class="bp-tap btn-gradient-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all">+ Add product</button>
        </div>

        <div class="bg-white rounded-2xl border border-espresso-100 shadow-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gradient-to-r from-cream-50 to-amber-50">
                <tr>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Product</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Category</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Price</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Cost/serving</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Margin</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Can make</th>
                  <th class="px-3 py-2.5 text-left text-xs font-semibold text-espresso-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody id="recipe-body" class="divide-y divide-espresso-100"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  async function loadAll() {
    const [productsData, categoriesData, stockLogData] = await Promise.all([
      db.listProducts(),
      db.listCategories(),
      db.listStockLog({ limit: 100 }),
    ]);
    products = productsData;
    categories = categoriesData;
    stockLog = stockLogData;
    try {
      ingredients = await db.listIngredients();
    } catch (err) {
      console.warn("Ingredients not available in inventory:", err);
      ingredients = [];
    }
    render();
  }

  function render() {
    if (activeSubTab === "ingredients") {
      renderIngredients();
      renderStockLog();
    } else {
      renderRecipes();
    }
  }

  function renderIngredients() {
    const body = qs("#ing-body", root);
    if (!body) return;
    body.innerHTML = "";

    const rows = ingredients
      .filter((i) => (i.name || "").toLowerCase().includes((search || "").toLowerCase()))
      .filter((i) => {
        const stock = i.stock ?? 0;
        const threshold = i.lowStockThreshold ?? 0;
        if (filter === "low") return stock > 0 && stock <= threshold;
        if (filter === "out") return stock <= 0;
        return true;
      })
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="px-3 py-6 text-center text-espresso-400">No ingredients match.</td></tr>`;
      return;
    }

    rows.forEach((i) => {
      const stock = i.stock ?? 0;
      const threshold = i.lowStockThreshold ?? 0;
      let statusHtml = `<span class="text-xs font-semibold text-sage-600">✓ In stock</span>`;
      if (stock <= 0) statusHtml = `<span class="text-xs font-semibold text-rust-600">Out of stock</span>`;
      else if (stock <= threshold) statusHtml = `<span class="text-xs font-semibold text-amber-500">Low stock</span>`;

      const row = el("tr", stock <= 0 ? "bg-rust-50/40" : stock <= threshold ? "bg-amber-50/40" : "");
      row.innerHTML = `
        <td class="px-3 py-2.5 font-medium">${escapeHtml(i.name)}</td>
        <td class="px-3 py-2.5 text-espresso-500">${escapeHtml(i.unit || "pcs")}</td>
        <td class="px-3 py-2.5 font-semibold">${stock}</td>
        <td class="px-3 py-2.5">${threshold}</td>
        <td class="px-3 py-2.5">${formatMoney(i.costPerUnit || 0, settings.currency)}</td>
        <td class="px-3 py-2.5">${statusHtml}</td>
        <td class="px-3 py-2.5">
          <div class="flex gap-2">
            <button data-edit class="text-xs font-semibold text-espresso-700 underline">Edit</button>
            <button data-restock class="text-xs font-semibold text-sage-700 underline">Restock</button>
            <button data-delete class="text-xs font-semibold text-rust-600 underline">Delete</button>
          </div>
        </td>
      `;
      row.querySelector("[data-edit]").addEventListener("click", () => openIngredientModal(i));
      row.querySelector("[data-restock]").addEventListener("click", () => restockIngredientModal(i));
      row.querySelector("[data-delete]").addEventListener("click", async () => {
        // Check if ingredient is used in any recipe
        const usedIn = products.filter(p => p.recipe?.some(r => r.ingredientId === i.id));
        if (usedIn.length > 0) {
          const productNames = usedIn.map(p => p.name).join(", ");
          const shouldDelete = await customConfirm(`"${escapeHtml(i.name)}" is used in these products:\n${productNames}\n\nDelete it anyway? This will remove it from all recipes.`, "Delete Ingredient");
          if (!shouldDelete) return;
          
          // Remove from all recipes
          for (const p of usedIn) {
            const newRecipe = p.recipe.filter(r => r.ingredientId !== i.id);
            await db.saveProduct(p.id, { recipe: newRecipe });
          }
        }
        await db.deleteIngredient(i.id);
        await loadAll();
        toast("Ingredient deleted.", "success");
      });
      body.appendChild(row);
    });
  }

  function renderStockLog() {
    const logEl = qs("#stock-log", root);
    if (!logEl) return;
    logEl.innerHTML = "";
    if (!stockLog.length) {
      logEl.innerHTML = `<p class="text-sm text-espresso-400 py-4 text-center">No stock movements yet.</p>`;
      return;
    }

    stockLog.slice(0, 40).forEach((l) => {
      const badge = {
        sale: '<span class="text-xs text-espresso-500">Sale</span>',
        restock: '<span class="text-xs text-sage-600 font-medium">Restock</span>',
        adjustment: '<span class="text-xs text-rust-600 font-medium">Adjustment</span>',
        return: '<span class="text-xs text-amber-500 font-medium">Return</span>',
        waste: '<span class="text-xs text-rust-600 font-medium">Waste</span>',
      }[l.type] || `<span class="text-xs text-espresso-500">${l.type}</span>`;
      
      const itemLabel = l.ingredientName || l.productName || "—";
      const row = el("div", "flex items-center justify-between py-2 text-sm");
      row.innerHTML = `
        <div class="min-w-0">
          <p class="font-medium truncate">${escapeHtml(itemLabel)} ${badge}</p>
          <p class="text-xs text-espresso-400">${formatDate(l.createdAt)} ${formatTime(l.createdAt)}${l.byName ? " · " + escapeHtml(l.byName) : ""}${l.note ? " · " + escapeHtml(l.note) : ""}</p>
        </div>
        <p class="font-semibold shrink-0 ${l.qty > 0 ? "text-sage-600" : "text-espresso-700"}">${l.qty > 0 ? "+" : ""}${l.qty}</p>
      `;
      logEl.appendChild(row);
    });
  }

  function renderRecipes() {
    const body = qs("#recipe-body", root);
    if (!body) return;
    body.innerHTML = "";

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const ingMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));

    const rows = products
      .filter((p) => (p.name || "").toLowerCase().includes((search || "").toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="px-3 py-6 text-center text-espresso-400">No products match.</td></tr>`;
      return;
    }

    rows.forEach((p) => {
      const recipe = p.recipe || [];
      let costPerServing = 0;
      let limitingIng = null;
      let canMake = Infinity;

      for (const r of recipe) {
        const ing = ingMap[r.ingredientId];
        if (!ing) continue;
        costPerServing += r.qty * (ing.costPerUnit || 0);
        const possible = Math.floor((ing.stock || 0) / r.qty);
        if (possible < canMake) {
          canMake = possible;
          limitingIng = ing.name;
        }
      }

      if (recipe.length === 0) {
        canMake = "—";
        limitingIng = "No recipe";
      }

      const margin = p.price ? (((p.price - costPerServing) / p.price) * 100).toFixed(0) : "—";

      const row = el("tr", "");
      row.innerHTML = `
        <td class="px-3 py-2.5 font-medium">${escapeHtml(p.name)}</td>
        <td class="px-3 py-2.5 text-espresso-500">${catMap[p.categoryId] || "—"}</td>
        <td class="px-3 py-2.5">${formatMoney(p.price, settings.currency)}</td>
        <td class="px-3 py-2.5">${formatMoney(costPerServing, settings.currency)}</td>
        <td class="px-3 py-2.5">${margin === "—" ? "—" : margin + "%"}</td>
        <td class="px-3 py-2.5 font-semibold ${typeof canMake === "number" && canMake <= 5 ? "text-rust-600" : ""}">${typeof canMake === "number" ? canMake : canMake}${limitingIng ? ` (${escapeHtml(limitingIng)})` : ""}</td>
        <td class="px-3 py-2.5">
          <div class="flex gap-2">
            <button data-recipe class="text-xs font-semibold text-espresso-700 underline">Recipe</button>
            <button data-edit class="text-xs font-semibold text-espresso-700 underline">Edit</button>
            <button data-delete class="text-xs font-semibold text-rust-600 underline">Delete</button>
          </div>
        </td>
      `;
      row.querySelector("[data-recipe]").addEventListener("click", () => openRecipeModal(p, ingMap));
      row.querySelector("[data-edit]").addEventListener("click", () => openProductModal(p, catMap));
      row.querySelector("[data-delete]").addEventListener("click", async () => {
        const confirmed = await customConfirm(`Delete "${escapeHtml(p.name)}"?`, "Delete Product");
        if (!confirmed) return;
        await db.deleteProduct(p.id);
        await loadAll();
        toast("Product deleted.", "success");
        document.dispatchEvent(new CustomEvent("bp:catalog-updated"));
      });
      body.appendChild(row);
    });
  }

  function openIngredientModal(existing) {
    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6">
        <h3 class="font-display font-semibold text-lg mb-4">${existing ? "Edit" : "Add"} ingredient</h3>
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Name</span>
            <input id="ing-name" type="text" value="${existing?.name || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Unit</span>
            <select id="ing-unit" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm">
              <option value="g" ${existing?.unit === "g" ? "selected" : ""}>grams (g)</option>
              <option value="kg" ${existing?.unit === "kg" ? "selected" : ""}>kilograms (kg)</option>
              <option value="ml" ${existing?.unit === "ml" ? "selected" : ""}>milliliters (ml)</option>
              <option value="l" ${existing?.unit === "l" ? "selected" : ""}>liters (l)</option>
              <option value="pcs" ${existing?.unit === "pcs" ? "selected" : ""}>pieces (pcs)</option>
            </select>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Current stock</span>
              <input id="ing-stock" type="number" step="1" value="${existing?.stock ?? 0}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Low-stock at</span>
              <input id="ing-threshold" type="number" step="1" value="${existing?.lowStockThreshold ?? 0}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Cost per unit</span>
            <input id="ing-cost" type="number" step="0.01" value="${existing?.costPerUnit ?? ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Supplier (optional)</span>
            <input id="ing-supplier" type="text" value="${existing?.supplier || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex items-center gap-2 mt-1">
            <input id="ing-active" type="checkbox" ${existing?.isActive === false ? "" : "checked"} class="accent-espresso-700" />
            <span class="text-sm">Active</span>
          </label>
        </div>
        <button id="ing-save" class="bp-tap w-full mt-5 bg-espresso-800 text-cream-50 rounded-xl py-3 text-sm font-semibold">Save ingredient</button>
      </div>
    `);

    qs("#ing-save", panel).addEventListener("click", async () => {
      const name = qs("#ing-name", panel).value.trim();
      const unit = qs("#ing-unit", panel).value;
      if (!name) {
        toast("Name is required.", "error");
        return;
      }

      const payload = {
        name,
        unit,
        stock: Number(qs("#ing-stock", panel).value) || 0,
        lowStockThreshold: Number(qs("#ing-threshold", panel).value) || 0,
        costPerUnit: Number(qs("#ing-cost", panel).value) || 0,
        supplier: qs("#ing-supplier", panel).value.trim(),
        isActive: qs("#ing-active", panel).checked,
      };
      await db.saveIngredient(existing?.id, payload);
      close();
      await loadAll();
      toast("Ingredient saved.", "success");
    });
  }

  function restockIngredientModal(ingredient) {
    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6">
        <h3 class="font-display font-semibold text-lg mb-1">Restock ${escapeHtml(ingredient.name)}</h3>
        <p class="text-sm text-espresso-500 mb-4">Current stock: <strong>${ingredient.stock ?? 0} ${escapeHtml(ingredient.unit || "pcs")}</strong></p>
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Quantity change</span>
            <input id="rs-qty" type="number" step="1" placeholder="e.g. 20 or -3" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Type</span>
            <select id="rs-type" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm">
              <option value="restock">Restock (add)</option>
              <option value="adjustment">Adjustment (remove)</option>
              <option value="waste">Waste (remove)</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Note (optional)</span>
            <input id="rs-note" type="text" placeholder="e.g. Delivery from supplier" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
        </div>
        <button id="rs-save" class="bp-tap w-full mt-5 bg-espresso-800 text-cream-50 rounded-xl py-3 text-sm font-semibold">Save</button>
      </div>
    `);
    qs("#rs-save", panel).addEventListener("click", async () => {
      const qty = Number(qs("#rs-qty", panel).value);
      if (!qty) return toast("Enter a non-zero quantity.", "error");
      const type = qs("#rs-type", panel).value;
      const delta = type === "restock" ? Math.abs(qty) : -Math.abs(qty);
      await db.adjustIngredientStock(ingredient.id, delta, {
        type,
        note: qs("#rs-note", panel).value.trim(),
        byUid: user.uid,
        byName: user.name,
        ingredientName: ingredient.name,
      });
      close();
      await loadAll();
      toast("Stock updated.", "success");
    });
  }

  function openRecipeModal(product, ingMap) {
    const recipe = product.recipe || [];
    const recipeHtml = recipe.map((r, idx) => {
      const ing = ingMap[r.ingredientId];
      return `
        <div class="recipe-row flex gap-2 items-center" data-idx="${idx}">
          <select class="recipe-ing flex-1 rounded-lg border border-espresso-100 px-2 py-1.5 text-xs">
            ${ingredients.map(i => `<option value="${i.id}" ${i.id === r.ingredientId ? "selected" : ""}>${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`).join("")}
          </select>
          <input type="number" step="0.1" class="recipe-qty w-20 rounded-lg border border-espresso-100 px-2 py-1.5 text-xs" value="${r.qty}" />
          <span class="text-xs text-espresso-400">${ing ? escapeHtml(ing.unit) : ""}</span>
          <button class="recipe-remove text-rust-600 text-xs font-semibold">✕</button>
        </div>
      `;
    }).join("");

    const { panel, close } = openModal(`
      <div class="p-5 sm:p-6 max-w-lg">
        <h3 class="font-display font-semibold text-lg mb-4">Recipe: ${escapeHtml(product.name)}</h3>
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs font-medium text-espresso-600 mb-2">Ingredients (per serving)</p>
            <div id="recipe-rows" class="flex flex-col gap-2">${recipeHtml || '<p class="text-xs text-espresso-400">No ingredients yet</p>'}</div>
          </div>
          <button id="add-recipe-row" class="text-xs font-semibold text-espresso-700 underline">+ Add ingredient</button>
          <div class="bg-cream-50 rounded-lg p-3">
            <p class="text-xs text-espresso-500">Total cost per serving: <strong id="recipe-cost">Calculating...</strong></p>
          </div>
        </div>
        <button id="recipe-save" class="bp-tap w-full mt-5 bg-espresso-800 text-cream-50 rounded-xl py-3 text-sm font-semibold">Save recipe</button>
      </div>
    `);

    function updateCost() {
      const rows = qsa(".recipe-row", panel);
      let totalCost = 0;
      rows.forEach(row => {
        const ingId = qs(".recipe-ing", row).value;
        const qty = Number(qs(".recipe-qty", row).value) || 0;
        const ing = ingMap[ingId];
        if (ing) {
          totalCost += qty * (ing.costPerUnit || 0);
        }
      });
      qs("#recipe-cost", panel).textContent = formatMoney(totalCost, settings.currency);
    }

    panel.addEventListener("input", updateCost);
    updateCost();

    qs("#add-recipe-row", panel).addEventListener("click", () => {
      const rowsEl = qs("#recipe-rows", panel);
      if (rowsEl.textContent.includes("No ingredients")) {
        rowsEl.innerHTML = "";
      }
      const newRow = el("div", "recipe-row flex gap-2 items-center");
      newRow.innerHTML = `
        <select class="recipe-ing flex-1 rounded-lg border border-espresso-100 px-2 py-1.5 text-xs">
          ${ingredients.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit)})</option>`).join("")}
        </select>
        <input type="number" step="0.1" class="recipe-qty w-20 rounded-lg border border-espresso-100 px-2 py-1.5 text-xs" value="1" />
        <span class="text-xs text-espresso-400">${ingredients[0]?.unit || ""}</span>
        <button class="recipe-remove text-rust-600 text-xs font-semibold">✕</button>
      `;
      newRow.querySelector(".recipe-remove").addEventListener("click", () => {
        newRow.remove();
        if (!qsa(".recipe-row", panel).length) {
          rowsEl.innerHTML = '<p class="text-xs text-espresso-400">No ingredients yet</p>';
        }
        updateCost();
      });
      rowsEl.appendChild(newRow);
      updateCost();
    });

    qsa(".recipe-remove", panel).forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".recipe-row").remove();
        if (!qsa(".recipe-row", panel).length) {
          qs("#recipe-rows", panel).innerHTML = '<p class="text-xs text-espresso-400">No ingredients yet</p>';
        }
        updateCost();
      });
    });

    qs("#recipe-save", panel).addEventListener("click", async () => {
      const rows = qsa(".recipe-row", panel);
      const newRecipe = rows.map(row => ({
        ingredientId: qs(".recipe-ing", row).value,
        qty: Number(qs(".recipe-qty", row).value) || 0,
      }));
      await db.saveProduct(product.id, { recipe: newRecipe });
      close();
      await loadAll();
      toast("Recipe saved.", "success");
    });
  }

  function openProductModal(existing, catMap) {
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
              ${categories.map((c) => `<option value="${c.id}" ${existing?.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Base price</span>
            <input id="p-price" type="number" step="0.01" value="${existing?.price ?? ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Unit cost (legacy)</span>
              <input id="p-cost" type="number" step="0.01" value="${existing?.costPrice ?? ""} class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-espresso-600">Low stock at (legacy)</span>
              <input id="p-threshold" type="number" step="1" value="${existing?.lowStockThreshold ?? 10}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <p class="text-xs text-espresso-400 italic">Note: Stock is now tracked via ingredients. Use the Recipe tab to set up ingredient-based tracking.</p>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Image URL (optional)</span>
            <input id="p-image" type="text" value="${existing?.imageUrl || ""}" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-espresso-600">Variants (optional) — "Small:0, Medium:15, Large:25"</span>
            <input id="p-modifiers" type="text" value="${modText}" placeholder="Small:0, Medium:15, Large:25" class="rounded-xl border border-espresso-100 px-3 py-2.5 text-sm" />
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

      const modifiers = qs("#p-modifiers", panel).value
        .split(",")
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
      // Keep existing recipe and stock if editing
      if (existing) {
        payload.recipe = existing.recipe || [];
        payload.stock = existing.stock || 0;
      } else {
        payload.recipe = [];
        payload.stock = 0;
      }
      await db.saveProduct(existing?.id, payload);
      close();
      await loadAll();
      toast("Product saved.", "success");
      document.dispatchEvent(new CustomEvent("bp:catalog-updated"));
    });
  }

  // Sub-tab navigation
  qsa(".bp-subtab-btn", root).forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.subtab;
      activeSubTab = tab;
      qsa(".bp-subtab-btn", root).forEach(b => {
        b.classList.toggle("bg-espresso-800", b.dataset.subtab === tab);
        b.classList.toggle("text-cream-50", b.dataset.subtab === tab);
        b.classList.toggle("text-espresso-600", b.dataset.subtab !== tab);
        b.classList.toggle("hover:bg-cream-100", b.dataset.subtab !== tab);
      });
      qs("#tab-ingredients", root).classList.toggle("hidden", tab !== "ingredients");
      qs("#tab-recipes", root).classList.toggle("hidden", tab !== "recipes");
      render();
    });
  });

  // Search and filter for ingredients
  qs("#ing-search", root).addEventListener("input", debounce((e) => {
    search = e.target.value || "";
    render();
  }, 150));

  qs("#ing-filter", root).addEventListener("change", (e) => {
    filter = e.target.value;
    render();
  });

  // Search for recipes
  qs("#recipe-search", root).addEventListener("input", debounce((e) => {
    search = e.target.value || "";
    render();
  }, 150));

  // Add buttons
  qs("#add-ingredient-btn", root).addEventListener("click", () => openIngredientModal(null));
  qs("#add-product-btn", root).addEventListener("click", () => {
    if (!categories.length) {
      toast("Add a category first.", "error");
      return;
    }
    openProductModal(null, Object.fromEntries(categories.map((c) => [c.id, c])));
  });

  // Realtime listeners
  db.onIngredientsChange((list) => {
    ingredients = list;
    render();
  });

  db.onProductsChange((list) => {
    products = list;
    render();
  });

  db.onStockLogChange((list) => {
    stockLog = list;
    render();
  });

  await loadAll();
}
