import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const file = resolve("integration-test.html");
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost:8080").pathname;
  if (pathname === "/favicon.ico") { response.writeHead(204); response.end(); return; }
  if (pathname !== "/" && pathname !== "/integration-test.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found"); return;
  }
  try {
    const html = await readFile(file);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(html);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Buat integration-test.html di folder proyek terlebih dahulu.");
  }
});
server.on("error", () => { console.error("Preview gagal dimulai. Pastikan port 8080 tersedia."); process.exitCode = 1; });
server.listen(8080, "localhost", () => console.log("Buka http://localhost:8080/integration-test.html dan atur alamat Website uReport menjadi http://localhost:8080 untuk tes lokal."));
