import path from 'node:path'

import {type Config} from '@jest/types'

export function createJestConfig(config: Config.InitialOptions = {}) {
  const {
    testMatch = [],
    setupFiles = [],
    globals = {},
    moduleNameMapper = {},
    modulePathIgnorePatterns = [],
    transform = {},
    ...restOfInputConfig
  } = config

  return {
    globals,
    modulePathIgnorePatterns: [
      ...modulePathIgnorePatterns,
      '<rootDir>/bin/',
      '<rootDir>/coverage/',
      '<rootDir>/lib/',
    ],
    resolver: path.resolve(__dirname, './resolver.cjs'),
    testEnvironment: path.resolve(__dirname, './jsdom.jest.env.ts'),
    setupFiles: [...setupFiles, path.resolve(__dirname, './setup.ts')],
    testEnvironmentOptions: {
      url: 'http://localhost:3333',
    },
    testMatch: [...testMatch, '<rootDir>/**/*.{test,spec}.{js,ts,tsx}'],
    transformIgnorePatterns: ['/node_modules/(?!(get-random-values-esm)/)'],
    testPathIgnorePatterns: ['/node_modules/', '/.yalc/'],
    transform: {
      ...transform,
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
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
    ...restOfInputConfig,
  } satisfies Config.InitialOptions
}
