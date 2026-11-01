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
 */
export function preserveModules() {
  return {
    name: 'preserve-modules',
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
          ).replace('[name]', vendorName(chunk.name)),
      }
    },
  }
}

function vendorName(name) {
  const match =
    /(?:^|\/)node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(.+)$/.exec(name)
  return match ? `_vendor/${match[1]}` : name
}
