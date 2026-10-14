// ============================================================================
// Brew POS — WiFi print bridge
// ============================================================================
// Why this exists: web browsers have no API to open a raw TCP socket, and
// almost every WiFi/LAN thermal printer expects raw ESC/POS bytes on port
// 9100. This tiny local server receives the receipt bytes from Brew POS
// (running in the browser) over plain HTTP and forwards them straight to the
// printer's IP over TCP.
//
// Run it on the same computer/network as the register:
//   node server.js
//
// It listens on http://localhost:9123 and does nothing else — no data is
// stored, nothing leaves your network.
// ============================================================================

const http = require("http");
const net = require("net");

const PORT = 9123;

const server = http.createServer((req, res) => {
  // Basic CORS so the browser (served from file:// or http://localhost:xxxx)
  // is allowed to call this bridge.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Printer-Ip, X-Printer-Port");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/print") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const printerIp = req.headers["x-printer-ip"];
  const printerPort = Number(req.headers["x-printer-port"] || 9100);

  if (!printerIp) {
    res.writeHead(400);
    res.end("Missing X-Printer-Ip header");
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const payload = Buffer.concat(chunks);
    const socket = net.createConnection({ host: printerIp, port: printerPort }, () => {
      socket.write(payload, () => socket.end());
    });
    socket.on("close", () => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    });
    socket.on("error", (err) => {
      console.error("Printer connection error:", err.message);
      res.writeHead(502);
      res.end(`Couldn't reach printer at ${printerIp}:${printerPort} — ${err.message}`);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Brew POS print bridge listening on http://localhost:${PORT}`);
  console.log("Leave this window open while using WiFi printing.");
});
