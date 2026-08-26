/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native addon: it must stay external to the server bundle
  // rather than being traced/bundled by Turbopack.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // The inventory repository opens the SQLite file lazily on first query, so
    // route handlers that never touch it stay cheap.
    optimizePackageImports: ["@anthropic-ai/sdk"],
  },
};

export default nextConfig;
