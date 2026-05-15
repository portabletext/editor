import reactHooks from 'eslint-plugin-react-hooks'
import {globalIgnores} from 'eslint/config'
import tseslint from 'typescript-eslint'

// Keep in lock-step with `reactCompilerOptions.sources` in
// `package.config.ts`. These slate-fork files are un-excluded from
// BOTH the react-compiler boundary and the eslint react-hooks rules
// in tiers as the code is audited safe (see
// `/specs/render-pipeline-compiler-collapse.md`).
const TIER_1_PATHS = [
  'src/slate/path/path-equals.ts',
  'src/slate/path/parent-path.ts',
  'src/slate/text/text-equals.ts',
  'src/slate/text/get-text-decorations.ts',
  'src/slate/node/is-text-block-node.ts',
  'src/slate/node/is-object-node.ts',
  'src/slate/node/is-span-node.ts',
  'src/slate/editor/is-editor.ts',
  'src/slate/editor/start.ts',
  'src/slate/editor/end.ts',
  'src/slate/dom/utils/range-list.ts',
  'src/slate/dom/utils/environment.ts',
  'src/slate/react/utils/direction.ts',
]

/**
 * Tier 2 = hook utilities. Phase 2 of the un-exclusion plan.
 */
const TIER_2_PATHS = [
  'src/slate/react/hooks/use-slate-static.tsx',
  'src/slate/react/hooks/use-isomorphic-layout-effect.ts',
  'src/slate/react/hooks/use-generic-selector.tsx',
  'src/slate/react/hooks/use-read-only.ts',
  'src/slate/react/hooks/use-decorations.ts',
  'src/slate/react/hooks/use-decorations-by-child.ts',
]

/**
 * Tier 3 = wrapper components rendered by `useChildren`.
 */
const TIER_3_PATHS = [
  'src/slate/react/components/element.tsx',
  'src/slate/react/components/text.tsx',
  'src/slate/react/components/leaf.tsx',
  'src/slate/react/components/object-node.tsx',
  'src/slate/react/components/string.tsx',
]

const UN_IGNORED_SLATE_PATHS = [
  ...TIER_1_PATHS,
  ...TIER_2_PATHS,
  ...TIER_3_PATHS,
]

export default tseslint.config([
  globalIgnores([
    'coverage',
    'dist',
    'lib',
    '**/__tests__/**',
    'src/slate/**',
    'src/slate-dom/**',
    'src/slate-react/**',
    // Un-ignore Tier 1 pure utilities so react-hooks rules apply.
    ...UN_IGNORED_SLATE_PATHS.map((path) => `!${path}`),
  ]),
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{cjs,mjs,js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
])
