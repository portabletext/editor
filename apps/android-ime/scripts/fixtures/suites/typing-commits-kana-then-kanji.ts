import {vi} from 'vitest'

vi.mock(import('../../driver.ts'), () => ({
  typeOnDevice: async ({prefix}: {prefix: string}) => ({
    text: `${prefix}きょう今日`,
    picked: ['space', '今日'],
    compositionstart: 2,
    nested: 0,
    compositionstartPerWord: [1, 1],
  }),
}))
