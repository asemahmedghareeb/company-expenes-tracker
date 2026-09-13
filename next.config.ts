import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No external scripts, iframes, or trackers are used (see CookieConsent /
  // /cookies). These headers lock down the default posture anyway.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
