import {defineConfig} from '@sanity/pkg-utils'

/**
 * The slate-fork lives at `src/slate/`. Historically excluded
 * wholesale from react-compiler; we are un-excluding it in tiers as
 * code is audited safe for the compiler.
 *
 * - Tier 1 = pure utilities (no hooks, no React, no module-level
 *   mutation).
 * - Tier 2 = hook utilities (`useContext`, `useEffect`-style and
 *   selector helpers used by the wrappers).
 * - Tier 3 = wrapper components rendered by `useChildren`. The
 *   compiler can compile these even though `useChildren` itself
 *   stays uncompiled: the cache stabilizes the props bundle at the
 *   call site. Hand-rolled `React.memo` equalities are retained for
 *   now because `useChildren` allocates fresh `path` arrays each
 *   render; deleting the equalities is gated on a follow-up that
 *   compiles `useChildren`.
 *
 * See `/specs/render-pipeline-compiler-collapse.md`. Kept in lock-step
 * with `eslint.config.js` (the react-hooks ignores).
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

/**
 * Tier 2 = hook utilities (no per-render ref mutation, no manual
 * memoization that the compiler can't see). Phase 2 of the
 * un-exclusion plan.
 */
const TIER_2_PATHS = [
  '/src/slate/react/hooks/use-slate-static.tsx',
  '/src/slate/react/hooks/use-isomorphic-layout-effect.ts',
  '/src/slate/react/hooks/use-generic-selector.tsx',
  '/src/slate/react/hooks/use-read-only.ts',
  '/src/slate/react/hooks/use-decorations.ts',
]

/**
 * Tier 3 = wrapper components rendered by `useChildren`. Phase 3 of
 * the un-exclusion plan.
 */
const TIER_3_PATHS = [
  '/src/slate/react/components/element.tsx',
  '/src/slate/react/components/text.tsx',
  '/src/slate/react/components/leaf.tsx',
  '/src/slate/react/components/object-node.tsx',
  '/src/slate/react/components/string.tsx',
]

const UN_EXCLUDED_SLATE_PATHS = [
  ...TIER_1_PATHS,
  ...TIER_2_PATHS,
  ...TIER_3_PATHS,
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
    sources: (filename: string) => {
      if (!filename.includes('/src/slate/')) {
        return true
      }
      return UN_EXCLUDED_SLATE_PATHS.some((path) => filename.endsWith(path))
    },
  },
  dts: 'rolldown',
})
