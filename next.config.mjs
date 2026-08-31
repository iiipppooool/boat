/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone — a self-contained server with only the modules it
  // actually traced. Makes the production image ~10x smaller than shipping
  // node_modules, and is what the Dockerfile copies.
  output: "standalone",
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
