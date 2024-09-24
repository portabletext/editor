import path from 'node:path'
import type {Config} from '@jest/types'

const config: Config.InitialOptions = {
  globals: {},
  globalSetup: './setup/globalSetup.ts',
  globalTeardown: './setup/globalTeardown.ts',
  moduleFileExtensions: ['feature', 'js', 'ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/bin/',
    '<rootDir>/coverage/',
    '<rootDir>/lib/',
  ],
  resolver: path.resolve(__dirname, './resolver.cjs'),
  setupFiles: [path.resolve(__dirname, './setup.ts')],
  setupFilesAfterEnv: ['./setup/afterEnv.ts'],
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  testEnvironment: path.resolve(__dirname, './jsdom.jest.env.ts'),
  testEnvironmentOptions: {
    url: 'http://localhost:3333',
  },
  testMatch: ['<rootDir>/**/*.{test,spec}.{js,ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/.yalc/'],
  transform: {
    '\\.feature$': '<rootDir>/feature-file-transformer.js',
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        // Don't look for babel.config.{ts,js,json} files or .babelrc files
        configFile: false,
        babelrc: false,
        // The rest is only needed by Jest, if Jest is updated to no longer need babel then this can be removed as well as related dependencies
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: '14',
                chrome: '61',
                safari: '11.3',
                firefox: '60',
                edge: '79',
              },
            },
          ],
          '@babel/preset-typescript',
          ['@babel/preset-react', {runtime: 'automatic'}],
        ],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(get-random-values-esm)/)'],
}

export default config
