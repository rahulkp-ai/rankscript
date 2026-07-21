/** @type {import('next').NextConfig} */
//
// The original file hard-codes the rewrite destination to
// "http://backend:8000", which only resolves inside the Docker Compose
// network. On Vercel there is no "backend" host, so this version reads
// the target from an environment variable instead, falling back to the
// Docker service name for local `docker-compose up` (unchanged behavior
// for local dev — only production deploys need the env var set).
//
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async rewrites() {
    // Browser calls /api/... on the Next.js server, which proxies to the
    // real backend. This still means no CORS setup needed in the browser,
    // whether that backend is the Docker "backend" service or your live
    // Render URL (set BACKEND_INTERNAL_URL to the latter on Vercel).
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
