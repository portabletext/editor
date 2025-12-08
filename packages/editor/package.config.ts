import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  define: {
    __DEV__: false,
  },
  dist: 'lib',
  extract: {
    enabled: false, // due to incompatibility with slate-dom and bundling dts
  },
  rollup: {
    optimizeLodash: true,
  },
  tsconfig: 'tsconfig.dist.json',
  strictOptions: {
    noImplicitBrowsersList: 'off',
    noImplicitSideEffects: 'error',
  },
  babel: {reactCompiler: true},
  reactCompilerOptions: {target: '18'},
  dts: 'rolldown',
})
