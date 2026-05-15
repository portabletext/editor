import reactHooks from 'eslint-plugin-react-hooks'
import {globalIgnores} from 'eslint/config'
import tseslint from 'typescript-eslint'

// Keep in lock-step with `reactCompilerOptions.sources` in
// `package.config.ts`. Tier 1 files are un-excluded from BOTH the
// react-compiler boundary and the eslint react-hooks rules.
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
    ...TIER_1_PATHS.map((path) => `!${path}`),
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
