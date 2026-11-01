import {describe, expect, test} from 'vitest'
import {deviceTestFileSeconds} from './budget.ts'

describe(deviceTestFileSeconds.name, () => {
  test("gives each test its timeout on top of the global setup and Vitest's start and exit", () => {
    expect([1, 2, 3, 4].map(deviceTestFileSeconds)).toEqual([
      675, 1250, 1825, 2400,
    ])
  })
})
