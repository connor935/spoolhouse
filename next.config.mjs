/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained .next/standalone/server.js with only the traced
  // node_modules, so the Docker runtime image can drop dev deps and source.
  output: "standalone",
  // pg resolves its bindings at runtime, so keep it out of the bundle and let
  // Next's file tracing copy it into the standalone output.
  serverExternalPackages: ["pg"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
