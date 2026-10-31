import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: () => Promise.reject(new Error('Gboard window did not appear')),
  dumpFailure: async () => {},
  closeChrome: async () => {},
  clearChromeTabs: async () => {},
}))
