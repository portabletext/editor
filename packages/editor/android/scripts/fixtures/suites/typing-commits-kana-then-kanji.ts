import {vi} from 'vitest'

vi.mock(import('thumbjar'), () => ({
  typeOnDevice: ({prefix}: {prefix: string}) =>
    Promise.resolve({
      text: `${prefix}きょう今日`,
      picked: ['space', '今日'],
      compositionstart: 2,
      nested: 0,
      compositionstartPerWord: [1, 1],
    }),
}))
