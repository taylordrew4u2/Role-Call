import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Strict, nonce-based CSP — the form Google supports for the AdSense ad code
// (allowlist CSPs break as ad domains rotate). Modern browsers enforce the
// nonce + 'strict-dynamic'; 'unsafe-inline' and https:/http: are fallbacks
// that older browsers use and newer ones ignore.
// Next.js reads the nonce from this header and stamps it onto all framework
// scripts automatically; our own <Script> tags get it via the x-nonce header.
function buildCsp(nonce: string): string {
  return [
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:`,
    "base-uri 'none'",
    "frame-ancestors 'self'",
    // Service worker (sw.js) — worker-src would otherwise fall back to
    // script-src, where a nonce can't be applied to a worker URL.
    "worker-src 'self' blob:",
  ].join("; ");
}

export default clerkMiddleware(async (_auth, request) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
