import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A package-lock.json in a parent folder would otherwise be taken as the workspace root.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  // e2e tests build into their own folder so they never clash with a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
