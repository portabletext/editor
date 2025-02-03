import {expect, test} from 'vitest'
import {applyAll} from './applyPatch'

test(applyAll.name, () => {
  expect(
    applyAll({href: 'https://sanity.io'}, [
      {
        type: 'set',
        path: ['description'],
        value: 'Sanity.io is a headless CMS',
      },
    ]),
  ).toEqual({
    href: 'https://sanity.io',
    description: 'Sanity.io is a headless CMS',
  })
})
