import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getMarkState} from './selector.get-mark-state'

describe(getMarkState.name, () => {
  test('Scenario: Caret after annotation', () => {
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
                marks: [],
              },
              {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: [linkKey],
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
          },
        ],
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 3,
          },
          backward: false,
        },
      },
    })

    expect(getMarkState(snapshot)).toEqual({
      state: 'changed',
      marks: [],
      previousMarks: [linkKey],
    })
  })

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

  test('Scenario: Caret after annotation inside decorator', () => {
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
                marks: ['strong'],
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
                marks: ['strong'],
              },
            ],
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
      marks: ['strong'],
      previousMarks: [linkKey, 'strong'],
    })
  })

  test('Scenario: Caret in annotation, at the edge of decorator', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
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
                text: 'foo',
                marks: [linkKey],
              },
              {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: [linkKey, 'strong'],
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
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
      state: 'unchanged',
      marks: [linkKey],
    })
  })

  test('Scenario: Caret between two annotations', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const linkKey = keyGenerator()
    const commentKey = keyGenerator()
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
                text: 'foo',
                marks: [linkKey],
              },
              {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: [commentKey],
              },
            ],
            markDefs: [
              {
                _type: 'link',
                _key: linkKey,
                href: 'https://portabletext.org',
              },
              {
                _type: 'comment',
                _key: commentKey,
                text: 'Comment A',
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          backward: false,
        },
        schema: compileSchema(
          defineSchema({
            annotations: [{name: 'link'}, {name: 'comment'}],
          }),
        ),
      },
    })

    expect(getMarkState(snapshot)).toEqual({
      state: 'changed',
      marks: [],
      previousMarks: [linkKey],
    })
  })
})
