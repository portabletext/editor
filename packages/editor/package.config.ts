import {defineConfig} from '@sanity/pkg-utils'

/**
 * Tier 1 of the slate-fork compiler un-exclusion (see
 * `/specs/render-pipeline-compiler-collapse.md`). These files are pure
 * utilities - no hooks, no React, no module-level mutation - and are
 * safe for react-compiler to memoize.
 *
 * Tier 2+ (hook helpers, wrappers, dispatch) un-exclude in follow-up
 * phases.
 */
const TIER_1_PATHS = [
  '/src/slate/path/path-equals.ts',
  '/src/slate/path/parent-path.ts',
  '/src/slate/text/text-equals.ts',
  '/src/slate/text/get-text-decorations.ts',
  '/src/slate/node/is-text-block-node.ts',
  '/src/slate/node/is-object-node.ts',
  '/src/slate/node/is-span-node.ts',
  '/src/slate/editor/is-editor.ts',
  '/src/slate/editor/start.ts',
  '/src/slate/editor/end.ts',
  '/src/slate/dom/utils/range-list.ts',
  '/src/slate/dom/utils/environment.ts',
  '/src/slate/react/utils/direction.ts',
]

export default defineConfig({
  define: {
    __DEV__: false,
  },
  dist: 'lib',
  extract: {
    customTags: [
      {
        name: 'group',
        allowMultiple: true,
        syntaxKind: 'block',
      },
    ],
    rules: {
      // Disable rules for now
      'ae-incompatible-release-tags': 'off',
    },
  },
  tsconfig: 'tsconfig.dist.json',
  strictOptions: {
    noImplicitBrowsersList: 'off',
    noImplicitSideEffects: 'error',
  },
  babel: {reactCompiler: true},
  reactCompilerOptions: {
    target: '19',
    // The slate-fork lives at `src/slate/`. Historically excluded
    // wholesale; we are un-excluding it in tiers as code is audited
    // safe for the compiler. Tier 1 = pure utilities (no hooks, no
    // React, no module-level mutation).
    sources: (filename: string) => {
      if (!filename.includes('/src/slate/')) {
        return true
      }
      return TIER_1_PATHS.some((path) => filename.endsWith(path))
    },
  },
  dts: 'rolldown',
})
