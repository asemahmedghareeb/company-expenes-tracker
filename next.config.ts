import type { NextConfig } from "next";

// No external scripts, iframes, or trackers are used (see CookieConsent /
// /cookies) — the headers below lock down the default posture anyway.
//
// Content-Security-Policy notes:
// - `script-src 'self' 'unsafe-inline'`: required by the Next.js App Router
//   (flight-data inline scripts on streaming navigations) and by the tiny
//   theme-init inline script in layout.tsx. External scripts remain blocked,
//   which still kills injected-<script-src=> XSS. Do NOT add more sources
//   without a nonce/hash review.
// - `style-src 'self' 'unsafe-inline'`: required by Tailwind's injected styles.
// - `frame-ancestors 'none'` + X-Frame-Options DENY: clickjacking defense.
// - No `Access-Control-Allow-Origin` is emitted anywhere: the /api/* routes
//   are same-origin only (see proxy.ts same-origin enforcement), so there is
//   no credentialed-wildcard CORS risk by construction.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Don't leak the framework fingerprint in responses.
  poweredByHeader: false,
  // Never ship webpack source maps to browsers (no .map files in public/).
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // HTTPS-only (Vercel serves HTTPS). 2 years + subdomains.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // App uses no camera/mic/location/payment hardware.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
