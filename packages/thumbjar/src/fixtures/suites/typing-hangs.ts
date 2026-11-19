import {vi} from 'vitest'
import {sleep} from '../../device/util.ts'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: async () => {
    await sleep(3600)
    return {
      steps: [],
      selection: null,
      events: [],
      text: '今日',
    }
  },
  dumpFailure: async () => {},
  closeChrome: async () => {},
}))
