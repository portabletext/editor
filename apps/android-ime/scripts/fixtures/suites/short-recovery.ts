import {vi} from 'vitest'

// The crash files run on real timers, so a tap back that hangs until its bound is given a short one.
vi.mock(import('../../lib/budget.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  RECOVERY_SECONDS: 1,
}))
