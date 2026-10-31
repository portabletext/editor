import {vi} from 'vitest'
import {sleep} from '../../lib/util.ts'

vi.mock(import('../../lib/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: async () => {
    await sleep(3600)
    return {
      text: '今日',
      picked: ['今日'],
      compositionstart: 1,
      nested: 0,
      compositionstartPerWord: [1],
    }
  },
  dumpFailure: async () => {},
  closeChrome: async () => {},
  clearChromeTabs: async () => {},
}))
