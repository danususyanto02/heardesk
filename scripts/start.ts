import { config } from "dotenv";
import { cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
config({ quiet: true });
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true });
const child = spawn(process.execPath, [".next/standalone/server.js"], { stdio: "inherit", env: { ...process.env, HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1", PORT: process.env.PORT ?? "3000" } });
process.on("SIGTERM", () => child.kill()); process.on("SIGINT", () => child.kill()); child.on("exit", code => process.exit(code ?? 0));
