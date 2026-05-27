import reactHooks from 'eslint-plugin-react-hooks'
import {globalIgnores} from 'eslint/config'
import tseslint from 'typescript-eslint'

// Keep in lock-step with `reactCompilerOptions.sources` in
// `package.config.ts`. These vendored engine files are un-excluded from
// BOTH the react-compiler boundary and the eslint react-hooks rules
// in tiers as the code is audited safe (see
// `/specs/render-pipeline-compiler-collapse.md`).
const TIER_1_PATHS = [
  'src/engine/path/path-equals.ts',
  'src/engine/path/parent-path.ts',
  'src/engine/text/text-equals.ts',
  'src/engine/text/get-text-decorations.ts',
  'src/engine/node/is-text-block-node.ts',
  'src/engine/node/is-object-node.ts',
  'src/engine/node/is-span-node.ts',
  'src/engine/editor/is-editor.ts',
  'src/engine/editor/start.ts',
  'src/engine/editor/end.ts',
  'src/engine/dom/utils/range-list.ts',
  'src/engine/dom/utils/environment.ts',
  'src/engine/react/utils/direction.ts',
]

/**
 * Tier 2 = hook utilities. Phase 2 of the un-exclusion plan.
 */
const TIER_2_PATHS = [
  'src/engine/react/hooks/use-engine-static.tsx',
  'src/engine/react/hooks/use-isomorphic-layout-effect.ts',
  'src/engine/react/hooks/use-generic-selector.tsx',
  'src/engine/react/hooks/use-read-only.ts',
  'src/engine/react/hooks/use-decorations.ts',
  'src/engine/react/hooks/use-decorations-by-child.ts',
]

/**
 * Tier 3 = wrapper components rendered by `useChildren`.
 */
const TIER_3_PATHS = [
  'src/engine/react/components/element.tsx',
  'src/engine/react/components/text.tsx',
  'src/engine/react/components/leaf.tsx',
  'src/engine/react/components/object-node.tsx',
  'src/engine/react/components/string.tsx',
]

const UN_IGNORED_ENGINE_PATHS = [
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
    'src/engine/**',
    // Un-ignore Tier 1 pure utilities so react-hooks rules apply.
    ...UN_IGNORED_ENGINE_PATHS.map((path) => `!${path}`),
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
