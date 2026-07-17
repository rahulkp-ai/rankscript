/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },
  async rewrites() {
    // Hard-coded to the Docker service name. This file runs on the Next.js SERVER,
    // never in the browser, so "backend" resolves via Docker's internal DNS.
    // The browser only ever calls /api/... on port 3000 — no CORS, no localhost:8000.
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
