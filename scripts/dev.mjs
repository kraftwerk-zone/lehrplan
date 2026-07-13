import { realpathSync } from "node:fs"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot =
  typeof realpathSync.native === "function"
    ? realpathSync.native(path.join(__dirname, ".."))
    : realpathSync(path.join(__dirname, ".."))

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next")
const args = [nextBin, "dev", "--webpack", ...process.argv.slice(2)]

const child = spawn(process.execPath, args, {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code) => process.exit(code ?? 0))
