import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Content-Security-Policy itself is set per-request in proxy.ts
  // (strict nonce-based CSP, required by Google for the AdSense ad code).
  // These are the static companion security headers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
