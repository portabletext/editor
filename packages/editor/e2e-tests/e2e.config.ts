import * as packageJson from '../package.json'
import {createJestConfig} from '../test-config/create-jest-config'

const config = createJestConfig({
  displayName: packageJson.name,
  globalSetup: './setup/globalSetup.ts',
  globalTeardown: './setup/globalTeardown.ts',
  setupFilesAfterEnv: ['./setup/afterEnv.ts'],
})

export default config
