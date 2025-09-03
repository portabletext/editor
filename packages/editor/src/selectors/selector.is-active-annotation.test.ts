import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {isActiveAnnotation} from './selector.is-active-annotation'

describe(isActiveAnnotation.name, () => {
  const keyGenerator = createTestKeyGenerator()
  const annotationKey = keyGenerator()
  const blockKey = keyGenerator()
  const fooKey = keyGenerator()
  const barKey = keyGenerator()
  const bazKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: fooKey,
          text: 'foo ',
          marks: [],
        },
        {
          _type: 'span',
          _key: barKey,
          text: 'bar',
          marks: [annotationKey],
        },
        {
          _type: 'span',
          _key: bazKey,
          text: ' baz',
          marks: [],
        },
      ],
      markDefs: [
        {_key: annotationKey, _type: 'link', href: 'https://example.com'},
      ],
    },
  ]
  const schema = compileSchema(
    defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
  )

  describe('collapsed selection', () => {
    test('selection before the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 4,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 4,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection at the start of the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 0,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection after the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 0,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection at the end of the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection in the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(true)
    })
  })

  describe('expanded selection', () => {
    test('selection on the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(true)
    })

    test('selection in the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 1,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(true)
    })

    describe('selection including the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 2,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 2,
            },
          },
        },
      })

      test('mode: full', () => {
        expect(isActiveAnnotation('link')(snapshot)).toBe(false)
      })

      test('mode: partial', () => {
        expect(isActiveAnnotation('link', {mode: 'partial'})(snapshot)).toBe(
          true,
        )
      })
    })

    describe('selection before the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 4,
            },
          },
        },
      })

      test('mode: full', () => {
        expect(isActiveAnnotation('link')(snapshot)).toBe(false)
      })

      test('mode: partial', () => {
        expect(isActiveAnnotation('link', {mode: 'partial'})(snapshot)).toBe(
          false,
        )
      })
    })

    test('selection overlapping from the start', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection after the annotation', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 4,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })

    test('selection overlapping from the end', () => {
      const snapshot = createTestSnapshot({
        context: {
          schema,
          value,
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: bazKey}],
              offset: 4,
            },
          },
        },
      })

      expect(isActiveAnnotation('link')(snapshot)).toBe(false)
    })
  })
})
