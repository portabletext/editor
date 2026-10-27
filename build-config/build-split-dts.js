/**
 * Builds a package with `preserveModules()` as one file per source module,
 * with its declarations bundled per entry as in a flat build.
 *
 * The full build writes `package.json` and the JavaScript. Its per-module
 * declarations are deleted, and a declaration-only pass, in which
 * `preserveModules()` does nothing, writes the bundled ones.
 *
 * Usage: `node ../../build-config/build-split-dts.js <outDir>`
 */
import {execFileSync} from 'node:child_process'
import {readdirSync, realpathSync, rmSync} from 'node:fs'
import path from 'node:path'

const outDir = process.argv[2]
if (!outDir) {
  throw new Error('Usage: build-split-dts.js <outDir>')
}

const pkgUtils = (args) => execFileSync('pkg-utils', args, {stdio: 'inherit'})

pkgUtils(['build', '--strict'])
const root = realpathSync(outDir)
removeDeclarations(root, root)
pkgUtils(['build', '--strict', '--emitDeclarationOnly', '--no-clean'])
pkgUtils(['check', '--strict'])

/**
 * Walks without following symlinks: `readdirSync` with `recursive: true`
 * follows directory symlinks, which could reach `node_modules` or the pnpm
 * store.
 */
function removeDeclarations(dir, root) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink()) {
      continue
    }
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      removeDeclarations(file, root)
    } else if (/\.d\.ts(\.map)?$/.test(entry.name)) {
      const real = realpathSync(file)
      if (!real.startsWith(root + path.sep)) {
        throw new Error(`Refusing to delete ${real} outside ${root}`)
      }
      rmSync(real)
    }
  }
}
