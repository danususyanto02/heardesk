import { NextResponse, NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64"), isWidget = request.nextUrl.pathname.startsWith("/widget/");
  let ancestors = "'none'";
  if (isWidget) {
    const key = request.nextUrl.pathname.split("/")[2];
    try { const site = await db.site.findFirst({ where: { publicKey: key, company: { profile: { status: "ACTIVE" } } } }); if (site) ancestors = `'self' ${site.origin}`; } catch { ancestors = "'none'"; }
  }
  const dev = process.env.NODE_ENV !== "production";
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'${dev ? " ws: " : ""}; frame-src 'self'; frame-ancestors ${ancestors}; base-uri 'none'; object-src 'none'; form-action 'self'`;
  const requestHeaders = new Headers(request.headers); requestHeaders.set("x-nonce", nonce); requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp); response.headers.set("X-Content-Type-Options", "nosniff"); response.headers.set("Referrer-Policy", "no-referrer"); response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cache-Control", "private, no-store");
  if (!isWidget) response.headers.set("X-Frame-Options", "DENY");
  return response;
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|widget.js|favicon.ico).*)"] };
