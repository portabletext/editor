import {afterAll} from 'vitest'

// Listed after `src/vitest/setup.ts`: Vitest runs `afterAll` hooks in reverse order, so this hook sets
// every test's duration to 23.4 s before the summary hook reads it.
// oxlint-disable-next-line no-empty-pattern -- Vitest reads a hook's first argument as the fixtures it uses and takes only an object pattern, and this hook uses none
afterAll(({}, file) => {
  const tasks = [...file.tasks]
  for (const task of tasks) {
    if (task.type === 'suite') {
      tasks.push(...task.tasks)
    } else if (task.result) {
      task.result.duration = 23400
    }
  }
})
