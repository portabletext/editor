import reactHooks from 'eslint-plugin-react-hooks'
import {globalIgnores} from 'eslint/config'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  globalIgnores(['dist']),
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
    rules: {'react-hooks/exhaustive-deps': 'error'},
  },
])
