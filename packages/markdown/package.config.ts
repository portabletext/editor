import {defineConfig} from '@sanity/pkg-utils'
import {preserveModules} from '../../build-config/preserve-modules.js'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  plugins: [preserveModules()],
})
