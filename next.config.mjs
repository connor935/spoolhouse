/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lean, self-contained server bundle for the Docker image
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // better-sqlite3 is a native addon — keep it external so it's required at
  // runtime from node_modules rather than bundled.
  serverExternalPackages: ["better-sqlite3"],
}

export default nextConfig
