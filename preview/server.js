const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, "..");
const PINE_FILE = path.join(ROOT, "indicators", "SOT_SMC_Pro_Indicator.pine");
const STRAT_FILE = path.join(ROOT, "indicators", "SOT_SMC_Pro_Strategy.pine");
const HTML_FILE = path.join(__dirname, "index.html");

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

  if (urlPath === "/api/pine") {
    fs.readFile(PINE_FILE, "utf8", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Error reading Pine Indicator file");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  if (urlPath === "/api/strategy") {
    fs.readFile(STRAT_FILE, "utf8", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Error reading Pine Strategy file");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  fs.readFile(HTML_FILE, "utf8", (err, html) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end("Error loading preview UI");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`S.O.T Academy SMC Pro v8 [Apex Institutional Quantum Engine Terminal] listening on http://0.0.0.0:${PORT}`);
});
