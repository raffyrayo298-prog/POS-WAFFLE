// ============================================================================
// Brew POS — Thermal printer integration
// ============================================================================
// Three ways a receipt can go out, in order of preference:
//   1. Bluetooth (Web Bluetooth API)      — works straight from the browser
//   2. WiFi/LAN (via the local print-bridge in /print-bridge)
//   3. Browser print fallback (window.print) — always available, so the
//      "Print receipt" button always does *something* even with no hardware
//      connected yet.
//
// Browsers cannot open a raw TCP socket to a WiFi printer's port 9100
// directly (no such API exists in web JS), so WiFi printing goes through the
// tiny optional bridge server included in /print-bridge. See its README.
// ============================================================================
import { toast } from "./utils.js";

const BLE_STORAGE_KEY = "brewpos_ble_device_name";

// Common write characteristic UUIDs used by many cheap ESC/POS BLE printers.
// We don't hard-require these: on connect we inspect all services/
// characteristics and pick the first one that supports write.
const KNOWN_PRINTER_SERVICE_HINTS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

class PrinterManager {
  constructor() {
    this.bleDevice = null;
    this.bleCharacteristic = null;
    this.mode = "none"; // "none" | "bluetooth" | "wifi"
    this.wifi = { ip: "", port: 9100 };
    this.listeners = new Set();
  }

  onChange(cb) {
    this.listeners.add(cb);
    cb(this.status());
    return () => this.listeners.delete(cb);
  }

  notify() {
    const s = this.status();
    this.listeners.forEach((cb) => cb(s));
  }

  status() {
    if (this.mode === "bluetooth") {
      return {
        mode: "bluetooth",
        connected: Boolean(this.bleCharacteristic),
        label: this.bleDevice?.name || "Bluetooth printer",
      };
    }
    if (this.mode === "wifi") {
      return {
        mode: "wifi",
        connected: Boolean(this.wifi.ip),
        label: `${this.wifi.ip}:${this.wifi.port} (via bridge)`,
      };
    }
    return { mode: "none", connected: false, label: "Not connected" };
  }

  // -- Bluetooth --------------------------------------------------------
  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error(
        "This browser doesn't support Web Bluetooth. Use Chrome/Edge on desktop or Android."
      );
    }
    let device;
    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          ...KNOWN_PRINTER_SERVICE_HINTS,
          "generic_access",
          "battery_service",
        ],
      });
    } catch (err) {
      // User cancelled the device chooser - this is not an error, just return null
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
        return null;
      }
      throw err;
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writeChar = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      writeChar =
        chars.find((c) => c.properties.writeWithoutResponse) ||
        chars.find((c) => c.properties.write);
      if (writeChar) break;
    }
    if (!writeChar) {
      throw new Error(
        "Connected, but no writable characteristic was found on this device."
      );
    }
    this.bleDevice = device;
    this.bleCharacteristic = writeChar;
    this.mode = "bluetooth";
    localStorage.setItem(BLE_STORAGE_KEY, device.name || "");
    device.addEventListener("gattserverdisconnected", () => {
      this.bleCharacteristic = null;
      this.notify();
      toast("Printer disconnected.", "error");
    });
    this.notify();
    return device.name;
  }

  async disconnectBluetooth() {
    if (this.bleDevice?.gatt?.connected) this.bleDevice.gatt.disconnect();
    this.bleDevice = null;
    this.bleCharacteristic = null;
    if (this.mode === "bluetooth") this.mode = "none";
    this.notify();
  }

  async writeBluetooth(bytes) {
    if (!this.bleCharacteristic) throw new Error("No Bluetooth printer connected.");
    // BLE has an MTU limit — chunk large payloads.
    const CHUNK = 180;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      if (this.bleCharacteristic.properties.writeWithoutResponse) {
        await this.bleCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.bleCharacteristic.writeValue(chunk);
      }
    }
  }

  // -- WiFi (via local bridge) -------------------------------------------
  setWifi(ip, port = 9100) {
    this.wifi = { ip, port };
    this.mode = "wifi";
    this.notify();
  }

  clearWifi() {
    this.wifi = { ip: "", port: 9100 };
    if (this.mode === "wifi") this.mode = "none";
    this.notify();
  }

  async send(bytes) {
    if (this.mode === "bluetooth" && this.bleCharacteristic) {
      return this.writeBluetooth(bytes);
    }
    if (this.mode === "wifi" && this.wifi.ip) {
      return this.writeWifiViaBridge(bytes);
    }
    throw new Error("NO_PRINTER");
  }

  async writeWifiViaBridge(bytes) {
    let res;
    try {
      res = await fetch("http://localhost:9123/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Printer-Ip": this.wifi.ip,
          "X-Printer-Port": String(this.wifi.port),
        },
        body: bytes,
      });
    } catch {
      throw new Error("Print bridge not running on this computer");
    }
    if (!res.ok) throw new Error("Print bridge reported an error");
  }
}

export const printerManager = new PrinterManager();

// ---------------------------------------------------------------------------
// ESC/POS byte builder
// ---------------------------------------------------------------------------
const ESC = 0x1b;
const GS = 0x1d;

export class ReceiptBuilder {
  constructor() {
    this.bytes = [];
    this.bytes.push(ESC, 0x40); // initialize printer
  }

  align(pos) {
    // 0 left, 1 center, 2 right
    this.bytes.push(ESC, 0x61, pos);
    return this;
  }

  bold(on) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  doubleSize(on) {
    this.bytes.push(GS, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  text(str) {
    // Convert string to bytes, handling special characters properly
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        this.bytes.push(code);
      } else {
        // For special characters like ₱, use a simpler approach
        this.bytes.push(...new TextEncoder().encode(str[i]));
      }
    }
    return this;
  }

  line(str = "") {
    this.text(str + "\n");
    return this;
  }

  divider(char = "-", len = 32) {
    this.line(char.repeat(len));
    return this;
  }

  feed(n = 1) {
    for (let i = 0; i < n; i++) this.bytes.push(0x0a);
    return this;
  }

  cut() {
    this.bytes.push(GS, 0x56, 0x00);
    return this;
  }

  cashDrawer() {
    // ESC p m t1 t2 - Open cash drawer
    // m = 0 (drawer 1), t1 = 50 (pulse on time), t2 = 50 (pulse off time)
    this.bytes.push(ESC, 0x70, 0x00, 0x50, 0x50);
    return this;
  }

  build() {
    return new Uint8Array(this.bytes);
  }
}

export function buildReceiptBytes({ settings, order }) {
  const shopName = (settings.shopName || "Brew POS").toUpperCase();
  const currency = "P"; // Use simple "P" instead of "₱" to avoid encoding issues
  const r = new ReceiptBuilder();

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  r.align(1).bold(true).doubleSize(true).line(shopName);
  r.doubleSize(false).bold(false).feed(1);
  r.align(1).line(settings.tagline || "Freshly Made Daily");
  r.feed(1).divider("=");
  r.feed(1).align(1).bold(true).line("SALES RECEIPT");
  r.bold(false).feed(1).align(0);
  r.line(`Receipt No. : ${String(order.orderNumber).padStart(6, '0')}`);
  r.line(`Order No.   : ${String(order.orderNumber).padStart(5, '0')}`);
  r.line(`Date        : ${dateStr}`);
  r.line(`Time        : ${timeStr}`);
  r.line(`Cashier     : ${order.cashierName || "—"}`);
  r.feed(1).divider("-");
  r.align(0).line("ITEM".padEnd(25, " ") + "QTY  PRICE");
  r.divider("-");

  Object.values(order.items).forEach((item) => {
    const qty = Number(item.qty || 0);
    const name = item.name || "Item";
    const modText = item.modifiers?.length ? ` (${item.modifiers.join(", ")})` : "";
    const itemLabel = `${name}${modText}`;
    const qtyText = String(qty);
    const priceText = `${currency}${Number(item.itemTotal || 0).toFixed(2)}`;
    const width = 42;
    const qtyWidth = 4;
    const priceWidth = 8;
    const maxItemWidth = width - qtyWidth - priceWidth - 2;
    let displayLabel = itemLabel;
    if (itemLabel.length > maxItemWidth) {
      displayLabel = itemLabel.substring(0, maxItemWidth - 3) + "...";
    }
    const padding = maxItemWidth - displayLabel.length;
    r.line(displayLabel + "".padEnd(padding, " ") + qtyText.padStart(qtyWidth, " ") + "  " + priceText.padStart(priceWidth, " "));
    if (item.note) r.line(`   Note: ${item.note}`);
  });

  r.divider("-");
  r.line(`Subtotal: ${currency}${(Number(order.subtotal || 0)).toFixed(2)}`);
  if (order.discount && order.discount > 0) {
    r.line(`Discount (${order.discountType || "PWD"}): -${currency}${(Number(order.discount || 0)).toFixed(2)}`);
  }
  r.line(`Tax: ${currency}${(Number(order.tax || 0)).toFixed(2)}`);
  r.line(`------------------`);
  r.bold(true).line(`TOTAL: ${currency}${(Number(order.total || 0)).toFixed(2)}`).bold(false);
  r.divider("-");
  r.line(`Payment Method: ${order.paymentMethod || "CASH"}`);
  if (order.paymentMethod === "Cash") {
    r.line(`Amount Paid: ${currency}${(Number(order.amountTendered || 0)).toFixed(2)}`);
    r.line(`Change: ${currency}${(Number(order.change || 0)).toFixed(2)}`);
  }

  r.feed(1).divider("-");
  r.align(1).line("Thank you for visiting");
  r.align(1).line("Waffle King");
  r.divider("-");
  r.feed(1).align(1).bold(true).line("WAFFLE KING");
  r.bold(false).feed(3);
  r.cashDrawer(); // Open cash drawer after printing
  r.cut();
  return r.build();
}

export function receiptHtml({ settings, order }) {
  const currency = "P"; // Use simple "P" instead of "₱" to avoid encoding issues
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const items = Object.values(order.items)
    .map((item) => {
      const qty = Number(item.qty || 0);
      const modText = item.modifiers?.length ? ` (${item.modifiers.join(", ")})` : "";
      const noteHtml = item.note ? `<div style="font-size:11px;color:#555;margin-left:8px;">Note: ${item.note}</div>` : "";
      return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:12px;margin-bottom:4px;gap:8px;">
        <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}${modText}</span>
        <span style="text-align:right;width:50px;flex-shrink:0;">${qty}</span>
        <span style="text-align:right;width:80px;flex-shrink:0;">${currency}${Number(item.itemTotal || 0).toFixed(2)}</span>
      </div>
      ${noteHtml}
    `;
    })
    .join("");

  return `
  <div style="width:320px;font-family:'Courier New',monospace;color:#111;line-height:1.4;">
    <div style="text-align:center;font-weight:700;font-size:22px;">${(settings.shopName || "Brew POS").toUpperCase()}</div>
    <div style="text-align:center;font-size:13px;margin-bottom:8px;">${settings.tagline || "Freshly Made Daily"}</div>
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="text-align:center;font-weight:700;font-size:14px;margin:8px 0;">SALES RECEIPT</div>
    <div style="font-size:12px;">Receipt No. : ${String(order.orderNumber).padStart(6, '0')}</div>
    <div style="font-size:12px;">Order No.   : ${String(order.orderNumber).padStart(5, '0')}</div>
    <div style="font-size:12px;">Date        : ${dateStr}</div>
    <div style="font-size:12px;">Time        : ${timeStr}</div>
    <div style="font-size:12px;">Cashier     : ${order.cashierName || "—"}</div>
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px;">
      <span style="flex:1;">ITEM</span>
      <span style="text-align:right;width:50px;">QTY</span>
      <span style="text-align:right;width:80px;">PRICE</span>
    </div>
    <div style="border-top:1px solid #000;margin:4px 0;"></div>
    ${items}
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="display:flex;justify-content:flex-end;font-size:12px;"><span>Subtotal  ${currency}${Number(order.subtotal || 0).toFixed(2)}</span></div>
    ${
      order.discount && order.discount > 0
        ? `<div style="display:flex;justify-content:flex-end;font-size:12px;"><span>Discount (${order.discountType || "PWD"})    -${currency}${Number(order.discount || 0).toFixed(2)}</span></div>`
        : ""
    }
    <div style="display:flex;justify-content:flex-end;font-size:12px;"><span>Tax    ${currency}${Number(order.tax || 0).toFixed(2)}</span></div>
    <div style="border-top:1px solid #000;margin:4px 0;"></div>
    <div style="display:flex;justify-content:flex-end;font-size:14px;font-weight:700;margin-top:4px;"><span>TOTAL  ${currency}${Number(order.total || 0).toFixed(2)}</span></div>
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="font-size:12px;">Payment Method : ${order.paymentMethod || "CASH"}</div>
    ${
      order.paymentMethod === "Cash"
        ? `<div style="font-size:12px;">Amount Paid    : ${currency}${Number(order.amountTendered || 0).toFixed(2)}</div>
           <div style="font-size:12px;">Change         : ${currency}${Number(order.change || 0).toFixed(2)}</div>`
        : ""
    }
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="text-align:center;margin-top:8px;font-size:12px;">Thank you for your order!</div>
    <div style="text-align:center;font-size:12px;">Come back again!</div>
    <div style="border-top:1px solid #000;margin:8px 0;"></div>
    <div style="text-align:center;margin-top:8px;font-weight:700;font-size:16px;letter-spacing:2px;">W A F F L E K I N G</div>
  </div>
  `;
}

export function printViaBrowser({ settings, order }) {
  const win = window.open("", "PRINT", "height=600,width=400");
  if (!win) {
    toast("Popup blocked — please allow popups for this site to print receipts.", "error");
    return;
  }
  win.document.write(
    `<html><head><title>Receipt #${order.orderNumber}</title></head><body>${receiptHtml(
      { settings, order }
    )}</body></html>`
  );
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}

// High-level helper used by the ordering screen: try the connected printer,
// fall back to the browser print dialog so the action always succeeds.
export async function printReceipt({ settings, order }) {
  const status = printerManager.status();
  if (status.mode === "none") {
    printViaBrowser({ settings, order });
    toast("No thermal printer connected — opened browser print instead.", "info");
    return { via: "browser" };
  }
  try {
    const bytes = buildReceiptBytes({ settings, order });
    await printerManager.send(bytes);
    toast("Receipt sent to printer.", "success");
    return { via: status.mode };
  } catch (err) {
    console.error(err);
    printViaBrowser({ settings, order });
    toast(`Printer error (${err.message}) — used browser print instead.`, "error");
    return { via: "browser", error: err.message };
  }
}
