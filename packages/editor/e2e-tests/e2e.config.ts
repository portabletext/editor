import type {Config} from 'jest'

const config: Config = {
  globalSetup: './setup/globalSetup.ts',
  globalTeardown: './setup/globalTeardown.ts',
  moduleFileExtensions: ['feature', 'js', 'ts'],
  setupFilesAfterEnv: ['./setup/afterEnv.ts'],
  testMatch: ['<rootDir>/**/*.test.ts'],
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
}

export default config
