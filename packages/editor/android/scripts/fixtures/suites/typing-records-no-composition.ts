import {vi} from 'vitest'

vi.mock(import('thumbjar'), () => ({
  typeOnDevice: ({prefix}: {prefix: string}) =>
    Promise.resolve({
      text: `${prefix}今日今日`,
      picked: ['今日', '今日'],
      compositionstart: 0,
      nested: 0,
      compositionstartPerWord: [0, 0],
    }),
}))
