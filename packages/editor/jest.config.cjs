'use strict'

const {createJestConfig} = require('./test-config/config.cjs')

module.exports = createJestConfig({
  displayName: require('./package.json').name,
  modulePathIgnorePatterns: ['<rootDir>/e2e-tests'],
})
