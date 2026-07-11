/** @type {import('next').NextConfig} */
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
}

export default nextConfig
