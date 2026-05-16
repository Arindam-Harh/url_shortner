import { readFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { writeFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const DATA_FILE = path.join(__dirname, "data", "links.json");

const serveFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": contentType });
    return res.end(data);
  } catch (error) {
    res.writeHead(404, { "content-type": contentType });
    return res.end("404 page not found");
  }
};
const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code == "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const startServer = async () => {
  const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
  };
  await loadLinks();

  const server = createServer(async (req, res) => {
    if (req.method === "GET") {
      if (req.url === "/") {
        return serveFile(
          res,
          path.join(__dirname, "public", "index.html"),
          "text/html",
        );
      } else if (req.url === "/style.css") {
        return serveFile(
          res,
          path.join(__dirname, "public", "style.css"),
          "text/css",
        );
      } else if (req.url === "/links") {
        const links = await loadLinks();
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(links));
      } else {
        const links = await loadLinks();
        const shortCode = req.url.slice(1);
        console.log("links red", req.url);
        if (links[shortCode]) {
          res.writeHead(302, { location: links[shortCode] });
          return res.end();
        }
      }
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Shortened URL is not found");
    }
    if (req.method === "POST" && req.url === "/shorten") {
      const links = await loadLinks();
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const { url, shortCode } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { "content-type": "text/plain" });
          return res.end("URL is Required");
        }
        const finalShortCode =
          shortCode || crypto.randomBytes(4).toString("hex");
        if (links[finalShortCode]) {
          res.writeHead(400, { "content-type": "text/plain" });
          return res.end("Short Code already exists. Please choose another.");
        }
        links[finalShortCode] = url;
        await saveLinks(links);
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(
          JSON.stringify({ success: true, shortCode: finalShortCode }),
        );
      });
      return;
    }

    res.writeHead(404, { "content-type": "text/html" });
    res.end("404 page not found");
  });

  server.listen(PORT, () => {
    console.log(`Server runnig at http://localhost:${PORT}`);
  });
};
startServer();
