/**
 * Emits one file per source module instead of one flat file per entry, so a
 * bundler can drop every module a consumer's imports don't reach under the
 * package's `"sideEffects": false`. `@sanity/pkg-utils` has no option for
 * this, so it sets Rolldown's `preserveModules` through the `plugins`
 * passthrough, the same switch tsdown's `unbundle` flips.
 *
 * Modules from outside `src`, such as the declarations of an inlined
 * devDependency, would otherwise keep their `node_modules/.pnpm/...` path
 * in the output. They are written to `_vendor/<package>/...` instead.
 *
 * An entry is named after its output path, so `./lib/utils/index.js` built
 * from `src/utils/_exports/index.ts` shares its name with the module
 * `src/utils/index.ts`. Rolldown would rename one of them `index2`, and
 * tsdown would write the renamed entry into `package.json` as a new export.
 * The module is written to `utils/_index.js` instead.
 *
 * Declarations stay bundled per entry. Split into modules, they export
 * types the entries don't, and a consumer emitting declarations for an
 * inferred type that reaches one fails with TS2742, since it can't name
 * the type through `exports`. `build-split-dts.js` therefore runs the
 * declaration pass on its own, and the plugin does nothing in that pass.
 */
export function preserveModules() {
  if (isDeclarationPass()) {
    return {name: 'preserve-modules'}
  }
  let entryNames = new Set()
  return {
    name: 'preserve-modules',
    buildStart({input}) {
      entryNames = new Set(Array.isArray(input) ? [] : Object.keys(input))
    },
    outputOptions(options) {
      const {entryFileNames = '[name].js'} = options
      return {
        ...options,
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: (chunk) =>
          (typeof entryFileNames === 'function'
            ? entryFileNames(chunk)
            : entryFileNames
          ).replace('[name]', moduleName(chunk, entryNames)),
      }
    },
  }
}

/**
 * `@sanity/pkg-utils` loads `package.config.ts` in its own process and
 * exposes no build mode to it, so the CLI flag is the only signal.
 */
function isDeclarationPass() {
  return process.argv.includes('--emitDeclarationOnly')
}

function moduleName(chunk, entryNames) {
  const name = vendorName(chunk.name)
  return !chunk.isEntry && entryNames.has(name.replace(/\.d$/, ''))
    ? name.replace(/[^/]+$/, '_$&')
    : name
}

function vendorName(name) {
  const match =
    /(?:^|\/)node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(.+)$/.exec(name)
  return match ? `_vendor/${match[1]}` : name
}
