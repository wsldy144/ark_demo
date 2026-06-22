const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { buildPrtsResponse } = require("./prts-agent");
const { buildWikiInventory } = require("./wiki-validate");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 32 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const PUBLIC_FILES = new Set([
  "index.html",
  "integration-guide.html",
  "portfolio.html",
  "project-review.html",
  "data-admin.html",
  "style.css",
  "app.js",
  "chat-state.js",
  "data-admin.js",
]);

function extractDeepSeekApiKey(text) {
  const match = String(text || "").match(/sk-[A-Za-z0-9_-]+/);
  return match ? match[0] : String(text || "").trim();
}

function readDeepSeekApiKey() {
  if (process.env.DEEPSEEK_API_KEY?.trim()) {
    return extractDeepSeekApiKey(process.env.DEEPSEEK_API_KEY);
  }

  const keyFile = path.join(ROOT, "deepseekapi.txt");
  if (!fs.existsSync(keyFile)) return "";
  return extractDeepSeekApiKey(fs.readFileSync(keyFile, "utf8"));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^([/\\])+/, "");
  const filePath = path.resolve(ROOT, normalizedPath);
  const relativePath = path.relative(ROOT, filePath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return "";
  }

  const firstSegment = relativePath.split(path.sep)[0];
  if (!PUBLIC_FILES.has(relativePath) && firstSegment !== "图片") {
    return "";
  }

  return filePath;
}

async function handlePrtsChat(request, response) {
  try {
    const body = await readJsonBody(request);
    const message = String(body.message ?? "").trim();
    if (!message) {
      sendJson(response, 400, { reply: "无有效查询指令。查询结束。" });
      return;
    }

    const prtsResponse = await buildPrtsResponse({
      apiKey: readDeepSeekApiKey(),
      message,
    });
    sendJson(response, 200, prtsResponse);
  } catch (error) {
    sendJson(response, 502, {
      reply: "连接错误，无法提供。查询结束。",
      error: error.message,
    });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const filePath = resolveStaticPath(url.pathname);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(response);
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === "POST" && request.url === "/api/prts/chat") {
      handlePrtsChat(request, response);
      return;
    }

    if (request.method === "GET" && request.url === "/api/wiki/inventory") {
      sendJson(response, 200, buildWikiInventory());
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(request, response);
      return;
    }

    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`ARKtalk server running at http://localhost:${PORT}`);
  });
}

module.exports = {
  createServer,
  extractDeepSeekApiKey,
  readDeepSeekApiKey,
  resolveStaticPath,
};
