import type {Config} from '@jest/types'
import {createJestConfig} from '../test-config/create-jest-config'

const config: Config.InitialOptions = createJestConfig({
  globalSetup: './setup/globalSetup.ts',
  globalTeardown: './setup/globalTeardown.ts',
  setupFilesAfterEnv: ['./setup/afterEnv.ts'],
  transform: {
    '\\.feature$': '<rootDir>/feature-file-transformer.js',
  },
  moduleFileExtensions: ['feature', 'js', 'ts'],
})

export default config
