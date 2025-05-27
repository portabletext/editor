import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import applyPatch from './applyPatch'

describe(applyPatch.name, () => {
  const keyGenerator = createTestKeyGenerator()

  const span = {
    _type: 'span',
    _key: keyGenerator(),
    text: 'Hello',
  }
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    children: [span],
  }
  const image1 = {
    _type: 'image',
    _key: keyGenerator(),
    src: 'https://sanity.io/image1.jpg',
  }
  const image2 = {
    _type: 'image',
    _key: keyGenerator(),
    src: 'https://sanity.io/image2.jpg',
  }
  const gallery = {
    _type: 'gallery',
    _key: keyGenerator(),
    images: [image1],
  }

  describe('`diffMatchPatch`', () => {
    describe('text block', () => {
      test('add text', () => {
        expect(
          applyPatch([block], {
            type: 'diffMatchPatch',
            path: [0, 'children', 0, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff('Hello', 'Hello there')),
            ),
          }),
        ).toEqual([
          {
            ...block,
            children: [{...span, text: 'Hello there'}],
          },
        ])
      })

      test('remove text', () => {
        expect(
          applyPatch([block], {
            type: 'diffMatchPatch',
            path: [0, 'children', 0, 'text'],
            value: stringifyPatches(makePatches(makeDiff('Hello', 'Hell'))),
          }),
        ).toEqual([
          {
            ...block,
            children: [{...span, text: 'Hell'}],
          },
        ])
      })

      test('change text', () => {
        expect(
          applyPatch([block], {
            type: 'diffMatchPatch',
            path: [0, 'children', 0, 'text'],
            value: stringifyPatches(makePatches(makeDiff('Hello', 'HeLLo'))),
          }),
        ).toEqual([
          {
            ...block,
            children: [{...span, text: 'HeLLo'}],
          },
        ])
      })
    })
  })

  describe('`insert` before', () => {
    describe('root', () => {
      test('empty', () => {
        expect(
          applyPatch([], {
            type: 'insert',
            path: [0],
            position: 'before',
            items: [image1],
          }),
        ).toEqual([image1])
      })

      test('non-empty (indexed path)', () => {
        expect(
          applyPatch([image1], {
            type: 'insert',
            path: [0],
            position: 'before',
            items: [image2],
          }),
        ).toEqual([image2, image1])
      })

      test('non-empty (keyed path)', () => {
        expect(
          applyPatch([image1], {
            type: 'insert',
            path: [{_key: image1._key}],
            position: 'before',
            items: [image2],
          }),
        ).toEqual([image2, image1])
      })
    })

    describe('block object', () => {
      test('indexed path', () => {
        expect(
          applyPatch([gallery], {
            type: 'insert',
            path: [0, 'images', 0],
            position: 'before',
            items: [image2],
          }),
        ).toEqual([
          {
            ...gallery,
            images: [image2, image1],
          },
        ])
      })

      test('keyed path', () => {
        expect(
          applyPatch([gallery], {
            type: 'insert',
            path: [{_key: gallery._key}, 'images', {_key: image1._key}],
            position: 'before',
            items: [image2],
          }),
        ).toEqual([
          {
            ...gallery,
            images: [image2, image1],
          },
        ])
      })
    })
  })

  describe('`insert` after', () => {
    describe('root', () => {
      test('empty', () => {
        expect(
          applyPatch([], {
            type: 'insert',
            path: [0],
            position: 'after',
            items: [image1],
          }),
        ).toEqual([image1])
      })

      test('non-empty (indexed path)', () => {
        expect(
          applyPatch([image1], {
            type: 'insert',
            path: [0],
            position: 'after',
            items: [image2],
          }),
        ).toEqual([image1, image2])
      })

      test('non-empty (keyed path)', () => {
        expect(
          applyPatch([image1], {
            type: 'insert',
            path: [{_key: image1._key}],
            position: 'after',
            items: [image2],
          }),
        ).toEqual([image1, image2])
      })
    })

    describe('block object', () => {
      test('indexed path', () => {
        expect(
          applyPatch([gallery], {
            type: 'insert',
            path: [0, 'images', 0],
            position: 'after',
            items: [image2],
          }),
        ).toEqual([
          {
            ...gallery,
            images: [image1, image2],
          },
        ])
      })

      test('keyed path', () => {
        expect(
          applyPatch([gallery], {
            type: 'insert',
            path: [{_key: gallery._key}, 'images', {_key: image1._key}],
            position: 'after',
            items: [image2],
          }),
        ).toEqual([
          {
            ...gallery,
            images: [image1, image2],
          },
        ])
      })
    })
  })

  describe('`set`', () => {
    describe('root', () => {
      test('value to value', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [],
            value: [gallery],
          }),
        ).toEqual([gallery])
      })

      test('value to empty', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [],
            value: [],
          }),
        ).toEqual([])
      })

      test('empty to value', () => {
        expect(
          applyPatch([], {
            type: 'set',
            path: [],
            value: [gallery],
          }),
        ).toEqual([gallery])
      })

      test('empty to empty', () => {
        expect(
          applyPatch([], {
            type: 'set',
            path: [],
            value: [],
          }),
        ).toEqual([])
      })
    })

    describe('block object', () => {
      test('indexed path', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [0],
            value: gallery,
          }),
        ).toEqual([gallery])
      })

      test('keyed path', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [{_key: image1._key}],
            value: gallery,
          }),
        ).toEqual([gallery])
      })
    })

    describe('block object property', () => {
      test('indexed path', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [0, 'alt'],
            value: 'Sanity.io is a headless CMS',
          }),
        ).toEqual([
          {
            ...image1,
            alt: 'Sanity.io is a headless CMS',
          },
        ])
      })

      test('keyed path', () => {
        expect(
          applyPatch([image1], {
            type: 'set',
            path: [{_key: image1._key}, 'alt'],
            value: 'Sanity.io is a headless CMS',
          }),
        ).toEqual([
          {
            ...image1,
            alt: 'Sanity.io is a headless CMS',
          },
        ])
      })
    })
  })

  describe('`unset`', () => {
    test('root', () => {
      expect(
        applyPatch([image1], {
          type: 'unset',
          path: [],
        }),
      ).toEqual(undefined)
    })

    describe('block object', () => {
      test('indexed path', () => {
        expect(
          applyPatch([image1], {
            type: 'unset',
            path: [0],
          }),
        ).toEqual([])
      })

      test('keyed path', () => {
        expect(
          applyPatch([image1], {
            type: 'unset',
            path: [{_key: image1._key}],
          }),
        ).toEqual([])
      })
    })

    describe('block object property', () => {
      test('indexed path', () => {
        expect(
          applyPatch([image1], {
            type: 'unset',
            path: [0, 'alt'],
          }),
        ).toEqual([
          {
            ...image1,
            alt: undefined,
          },
        ])
      })

      test('keyed path', () => {
        expect(
          applyPatch([image1], {
            type: 'unset',
            path: [{_key: image1._key}, 'alt'],
          }),
        ).toEqual([
          {
            ...image1,
            alt: undefined,
          },
        ])
      })
    })
  })
})

function createTestKeyGenerator() {
  let index = 0

  return function keyGenerator() {
    const key = `k${index}`
    index++
    return key
  }
}
