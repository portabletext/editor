import {afterAll, beforeEach} from 'vitest'

// Reports the first line of each failed test's error as one file error, so a suite run shows which
// assertion failed and not only that the test did.
const failures: string[] = []

beforeEach(({task, onTestFailed}) => {
  onTestFailed(({task: failed}) => {
    failures.push(
      `${task.name}: ${failed.result?.errors?.[0]?.message?.split('\n')[0]}`,
    )
  })
})

afterAll(() => {
  if (failures.length > 0) throw new Error(failures.join(' | '))
})
