import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  rollup: {
    optimizeLodash: true,
  },
  tsconfig: 'tsconfig.dist.json',
  strictOptions: {
    noImplicitBrowsersList: 'off',
  },
})
