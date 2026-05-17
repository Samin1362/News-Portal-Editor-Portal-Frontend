import type { NextConfig } from "next";

/**
 * Editor portal — deploy config.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is read at build time so the CSP `connect-src`
 * directive includes the deployed backend. Falls back to the shared staging
 * URL if the env var is missing so local builds don't fail outright.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://news-portal-backend-kxsj.onrender.com";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js App Router emits inline RSC payload scripts that need
  // 'unsafe-inline'. Nonce-based CSP would require custom middleware on
  // every request — out of scope for this deploy.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.gstatic.com https://*.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
  `connect-src 'self' ${API_BASE} https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.cloudinary.com https://res.cloudinary.com`,
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "media-src 'self' https://res.cloudinary.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Belt-and-braces — root layout sets a meta robots tag too, but the
  // header wins for crawlers that respect it.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
