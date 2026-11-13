import {vi} from 'vitest'

vi.mock(import('thumbjar'), () => ({
  typeOnDevice: (_context: unknown, {prefix}: {prefix: string}) =>
    Promise.resolve({
      text: `${prefix}今日今日`,
      picked: ['space', '今日'],
      compositionstart: 2,
      nested: 0,
      compositionstartPerWord: [1, 1],
    }),
}))
