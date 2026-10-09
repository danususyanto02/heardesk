import { createServer } from "node:http";
createServer((_, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(
    '<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Website test</title><body><h1>Website pemasang</h1><script>const key=new URL(location.href).searchParams.get("site");if(key){const s=document.createElement("script");s.src="http://localhost:3100/widget.js";s.dataset.site=key;document.body.append(s);}</script></body></html>',
  );
}).listen(3200, "localhost");
