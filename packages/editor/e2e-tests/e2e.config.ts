import * as packageJson from '../package.json'
import {createJestConfig} from '../test-config/create-jest-config'

const config = createJestConfig({
  displayName: packageJson.name,
  globalSetup: './setup/globalSetup.ts',
  globalTeardown: './setup/globalTeardown.ts',
  setupFilesAfterEnv: ['./setup/afterEnv.ts'],
  transform: {
    '\\.feature$': '<rootDir>/feature-file-transformer.js',
  },
  moduleFileExtensions: ['feature', 'js', 'ts'],
})

export default config
