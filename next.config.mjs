import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// K:\ is a subst drive → Dropbox. Turbopack must use the canonical path so
// PostCSS/Tailwind dependencies resolve inside the project root.
const projectRoot =
  typeof fs.realpathSync.native === "function"
    ? fs.realpathSync.native(__dirname)
    : fs.realpathSync(__dirname)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
