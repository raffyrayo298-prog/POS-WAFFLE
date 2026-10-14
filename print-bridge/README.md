# Brew POS — WiFi Print Bridge (optional)

Browsers can't open a raw TCP connection to a printer, which is what almost
every WiFi/LAN thermal printer expects on port 9100. This tiny script bridges
that gap: Brew POS sends the receipt to this local server over HTTP, and this
server forwards it to the printer over TCP.

You only need this if you're printing over **WiFi/LAN**. Bluetooth printing
works without it.

## Requirements

- [Node.js](https://nodejs.org) installed on the computer running the register

## Run it

```bash
cd print-bridge
node server.js
```

Leave that terminal window open while the register is in use. It listens on
`http://localhost:9123` and only talks to the printer IP you enter in Brew
POS's Settings screen — nothing is sent anywhere else.

## Auto-start (optional)

- **Windows**: create a shortcut to `node server.js` (with the working
  directory set to this folder) in your Startup folder.
- **macOS**: wrap it in a simple `launchd` plist, or use `pm2`
  (`npm install -g pm2 && pm2 start server.js`).
- **Linux**: use a `systemd` service or `pm2`.
