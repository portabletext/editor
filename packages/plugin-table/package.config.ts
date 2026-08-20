import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  reactCompiler: {transform: 'oxc', target: '19'},
  // Lightning CSS lowers `light-dark()` into a `--lightningcss-light`/`-dark`
  // var pair that only resolves when it also processes the `color-scheme`
  // declaration. This stylesheet leaves `color-scheme` to the consumer, so the
  // lowered pair resolves to both colours at once and every themed token
  // computes to garbage. The tokens stay authored; minification still applies.
  css: {target: false},
})
