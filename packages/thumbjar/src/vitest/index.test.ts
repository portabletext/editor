import {describe, expect, test} from 'vitest'
import {deviceProject} from './index.ts'

describe(deviceProject.name, () => {
  test('allows device hooks the same worst-case timeout as device tests', () => {
    const project = deviceProject({
      include: ['tests/*.test.ts'],
      pageUrl: 'http://localhost:8765/editor.html',
      pageHint: 'Build the page.',
    })
    expect({
      testTimeout: project.test?.testTimeout,
      hookTimeout: project.test?.hookTimeout,
    }).toEqual({testTimeout: 661_000, hookTimeout: 661_000})
  })
})
