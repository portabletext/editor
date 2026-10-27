import {defineConfig} from '@sanity/pkg-utils'
import {preserveModules} from '../../build-config/preserve-modules.js'
import {COMPILED_SOURCES} from './react-compiler-sources.ts'

export default defineConfig({
  define: {
    __DEV__: false,
  },
  dist: 'lib',
  tsdoc: {
    customTags: [{name: 'group', allowMultiple: true, syntaxKind: 'block'}],
    rules: {
      // Disable rules for now
      'ae-incompatible-release-tags': 'off',
    },
  },
  tsconfig: 'tsconfig.dist.json',
  plugins: [preserveModules()],
  strictOptions: {
    noImplicitBrowsersList: 'off',
    noImplicitSideEffects: 'error',
  },
  reactCompiler: {
    transform: 'oxc',
    target: '19',
    sources: COMPILED_SOURCES,
  },
})
