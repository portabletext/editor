import {vi} from 'vitest'

vi.mock(import('../../lib/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: async () => {
    throw new Error('Gboard window did not appear')
  },
  dumpFailure: async () => {},
  closeChrome: async () => {},
}))
