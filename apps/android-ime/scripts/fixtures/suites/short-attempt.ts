import {vi} from 'vitest'

// The crash files run on real timers, so an attempt that hangs until its bound, and the read after it,
// are given short ones.
vi.mock(import('../../lib/budget.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  ATTEMPT_SECONDS: 1,
  FAULT_READ_SECONDS: 1,
}))
