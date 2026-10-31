import {beforeEach} from 'vitest'

// Marks every test in the file `test.fails`, as a case whose crash reproduces would be.
beforeEach(({task}) => {
  Object.assign(task, {fails: true})
})
