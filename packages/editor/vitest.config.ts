import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['html', 'json', 'json-summary'],
      include: ['src/**'],
      reportOnFailure: true,
      clean: true,
    },
  },
})
