import * as packageJson from './package.json'
import {createJestConfig} from './test-config/create-jest-config'

const config = createJestConfig({
  displayName: packageJson.name,
  modulePathIgnorePatterns: ['<rootDir>/e2e-tests'],
})

export default config
