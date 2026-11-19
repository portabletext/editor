import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: () => Promise.reject(new Error('Gboard window did not appear')),
  dumpFailure: async () => {},
  stopChromeForRetry: () => Promise.resolve(['100']),
  closeChrome: async () => {},
}))
