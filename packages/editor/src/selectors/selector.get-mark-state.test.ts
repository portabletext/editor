import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getMarkState} from './selector.get-mark-state'

describe(getMarkState.name, () => {
  test('Scenario: Caret after annotated decorator', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        keyGenerator,
        value: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: fooSpanKey,
                text: 'foo ',
              },
              {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: [linkKey, 'strong'],
              },
              {
                _type: 'span',
                _key: bazSpanKey,
                text: ' baz',
              },
            ],
            markDefs: [
              {
                _type: 'link',
                _key: linkKey,
                href: 'https://portabletext.org',
              },
            ],
            style: 'normal',
          },
        ],
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: bazSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: bazSpanKey}],
            offset: 0,
          },
          backward: false,
        },
        schema: compileSchema(
          defineSchema({
            annotations: [{name: 'link'}],
            decorators: [{name: 'strong'}],
          }),
        ),
      },
    })

    expect(getMarkState(snapshot)).toEqual({
      state: 'changed',
      marks: [],
      previousMarks: [linkKey, 'strong'],
    })
  })
})
