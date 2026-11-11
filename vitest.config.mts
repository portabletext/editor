import {defineConfig} from 'vitest/config'

// Only the tests of the scripts the workflows run. Each package has its own
// Vitest configuration for its own tests.
export default defineConfig({
  test: {
    name: 'workflow-scripts',
    environment: 'node',
    include: ['.github/scripts/**/*.test.ts'],
  },
})
