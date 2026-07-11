/** @type {import('next').NextConfig} */

// API docs (Swagger UI) are enabled unless explicitly turned off with
// ENABLE_API_DOCS=false. When off, swagger-ui-dist is aliased to a tiny stub so
// the heavy library is excluded from the build (smaller output, lower build
// memory — the Docker build sets this off). The /api-docs page 404s to match.
const apiDocsEnabled = process.env.ENABLE_API_DOCS !== "false";

const nextConfig = {
  // Emit a self-contained .next/standalone/server.js with only the traced
  // node_modules, so the Docker runtime image can drop dev deps and source.
  output: "standalone",
  // Keep the native better-sqlite3 module external so its .node binary is
  // traced/copied into the standalone output rather than bundled.
  serverExternalPackages: ["better-sqlite3"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(apiDocsEnabled
    ? {}
    : {
        turbopack: {
          resolveAlias: {
            "swagger-ui-dist": "./lib/stubs/empty-module.js",
            "swagger-ui-dist/swagger-ui.css": "./lib/stubs/empty.css",
          },
        },
      }),
};

export default nextConfig;
