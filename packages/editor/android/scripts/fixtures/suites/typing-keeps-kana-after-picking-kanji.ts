import {vi} from 'vitest'

vi.mock(import('thumbjar'), () => ({
  typeOnDevice: (_context: unknown, {prefix}: {prefix: string}) =>
    Promise.resolve({
      text: `${prefix}きょう今日`,
      picked: ['今日', '今日'],
      compositionstart: 2,
      nested: 0,
      compositionstartPerWord: [1, 1],
    }),
}))
