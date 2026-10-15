// ============================================================================
// Brew POS — Shared utilities
// ============================================================================

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function formatMoney(amount, currency = "₱") {
  const n = Number(amount) || 0;
  return `${currency}${n.toFixed(2)}`;
}

export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Small toast/notification system. Call ensureToastRoot() once per page.
export function ensureToastRoot() {
  if (document.getElementById("bp-toast-root")) return;
  const root = document.createElement("div");
  root.id = "bp-toast-root";
  root.className =
    "fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm";
  document.body.appendChild(root);
}

export function toast(message, type = "info") {
  ensureToastRoot();
  const root = document.getElementById("bp-toast-root");
  const colors = {
    info: "bg-espresso-800 text-cream-50",
    success: "bg-sage-600 text-white",
    error: "bg-rust-600 text-white",
  };
  const el = document.createElement("div");
  el.className = `${colors[type] || colors.info} rounded-xl shadow-lg px-4 py-3 text-sm font-medium animate-[fadein_.15s_ease-out] flex items-start gap-2`;
  el.innerHTML = `<span class="flex-1">${message}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateX(8px)";
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

export function qs(sel, parent = document) {
  return parent.querySelector(sel);
}
export function qsa(sel, parent = document) {
  return Array.from(parent.querySelectorAll(sel));
}

export function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// Simple modal helper — pass inner HTML, get back the overlay + close fn.
export function openModal(innerHtml, { onClose } = {}) {
  const overlay = el(
    "div",
    "fixed inset-0 z-[90] bg-espresso-950/50 backdrop-blur-sm flex items-center justify-center p-4"
  );
  const panel = el(
    "div",
    "bg-cream-50 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto"
  );
  panel.innerHTML = innerHtml;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  function close() {
    overlay.remove();
    if (onClose) onClose();
  }
  return { overlay, panel, close };
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const str = String(text);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Custom confirm dialog using the modal
export function customConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-modal");
    if (!modal) {
      // Fallback to native confirm if modal doesn't exist
      resolve(confirm(message));
      return;
    }

    const titleEl = document.getElementById("modal-title");
    const messageEl = document.getElementById("modal-message");
    const confirmBtn = document.getElementById("modal-confirm");
    const cancelBtn = document.getElementById("modal-cancel");

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.remove("hidden");

    const handleConfirm = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(true);
    };

    const handleCancel = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(false);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    });
  });
}

// Custom alert dialog using the modal
export function customAlert(message, title = "Alert") {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-modal");
    if (!modal) {
      // Fallback to native alert if modal doesn't exist
      alert(message);
      resolve();
      return;
    }

    const titleEl = document.getElementById("modal-title");
    const messageEl = document.getElementById("modal-message");
    const confirmBtn = document.getElementById("modal-confirm");
    const cancelBtn = document.getElementById("modal-cancel");

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Hide cancel button for alert
    cancelBtn.classList.add("hidden");

    modal.classList.remove("hidden");

    const handleConfirm = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.classList.remove("hidden");
      resolve();
    };

    confirmBtn.addEventListener("click", handleConfirm);

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        handleConfirm();
      }
    });
  });
}
