const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, "..");
const PINE_FILE = path.join(ROOT, "indicators", "SOT_SMC_Pro_Indicator.pine");
const STRAT_FILE = path.join(ROOT, "indicators", "SOT_SMC_Pro_Strategy.pine");
const ELEPHANT_FILE = path.join(ROOT, "indicators", "Elephant_Indicator.pine");
const ELEPHANT_OVERLAY_FILE = path.join(ROOT, "indicators", "Elephant_Signals_Overlay.pine");
const HTML_FILE = path.join(__dirname, "index.html");
const ELEPHANT_HTML_FILE = path.join(__dirname, "elephant.html");

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = (req.url || "/").split("?")[0];

  const sendPine = (file, label) => {
    fs.readFile(file, "utf8", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Error reading ${label} file`);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(data);
    });
  };

  const sendHtml = (file) => {
    fs.readFile(file, "utf8", (err, html) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Error loading preview UI");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
  };

  if (urlPath === "/api/pine") return sendPine(PINE_FILE, "Pine Indicator");
  if (urlPath === "/api/strategy") return sendPine(STRAT_FILE, "Pine Strategy");
  if (urlPath === "/api/pine-elephant") return sendPine(ELEPHANT_FILE, "Elephant Indicator");
  if (urlPath === "/api/pine-overlay") return sendPine(ELEPHANT_OVERLAY_FILE, "Elephant Overlay");
  if (urlPath === "/elephant" || urlPath === "/elephant.html") return sendHtml(ELEPHANT_HTML_FILE);

  return sendHtml(HTML_FILE);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`S.O.T Academy SMC Pro v9.3 + Elephant terminal listening on http://0.0.0.0:${PORT}`);
  console.log(`  Elephant terminal: http://0.0.0.0:${PORT}/elephant`);
});
