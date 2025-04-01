import {expect, test} from 'vitest'
import {compileSchemaDefinition, defineSchema} from '../editor/define-schema'
import {selectionToSlateRange} from './selection-to-slate-range'

function createBlock(_key: string) {
  return {
    _type: 'block',
    _key,
    children: [],
  }
}

function createObject(_type: string, _key: string) {
  return {
    _type,
    _key,
  }
}

function createSpan(_key: string, text: string) {
  return {
    _type: 'span',
    _key,
    text,
  }
}

test(selectionToSlateRange.name, () => {
  const schema = compileSchemaDefinition(
    defineSchema({
      blockObjects: [{name: 'image'}],
      inlineObjects: [{name: 'stock ticker'}],
    }),
  )

  expect(
    selectionToSlateRange({
      value: [],
      selection: null,
      schema,
    }),
  ).toBeUndefined()

  expect(
    selectionToSlateRange({
      value: [createObject('image', 'b0')],
      selection: null,
      schema,
    }),
  ).toBeUndefined()

  expect(
    selectionToSlateRange({
      value: [createObject('image', 'b0')],
      selection: {
        anchor: {
          path: [{_key: 'b0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0],
      offset: 0,
    },
    focus: {
      path: [0],
      offset: 0,
    },
  })

  expect(
    selectionToSlateRange({
      value: [createObject('image', 'b0'), createObject('image', 'b1')],
      selection: {
        anchor: {
          path: [{_key: 'b0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0],
      offset: 0,
    },
    focus: {
      path: [1],
      offset: 0,
    },
  })

  expect(
    selectionToSlateRange({
      value: [createBlock('b0')],
      selection: null,
      schema,
    }),
  ).toBeUndefined()

  expect(
    selectionToSlateRange({
      value: [createBlock('b0')],
      selection: {
        anchor: {
          path: [{_key: 'b0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual(undefined)

  expect(
    selectionToSlateRange({
      value: [createBlock('b0')],
      selection: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual(undefined)

  expect(
    selectionToSlateRange({
      value: [{...createBlock('b0'), children: [createSpan('b0c0', 'Hello')]}],
      selection: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0, 0],
      offset: 0,
    },
    focus: {
      path: [0, 0],
      offset: 0,
    },
  })

  expect(
    selectionToSlateRange({
      value: [
        {...createBlock('b0'), children: [createSpan('b0c0', 'foo bar baz')]},
      ],
      selection: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c0'}],
          offset: 7,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0, 0],
      offset: 4,
    },
    focus: {
      path: [0, 0],
      offset: 7,
    },
  })

  expect(
    selectionToSlateRange({
      value: [
        {
          ...createBlock('b0'),
          children: [
            createSpan('b0c0', 'foo '),
            createSpan('b0c1', 'bar'),
            createSpan('b0c2', ' baz'),
          ],
        },
      ],
      selection: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c1'}],
          offset: 3,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0, 1],
      offset: 0,
    },
    focus: {
      path: [0, 1],
      offset: 3,
    },
  })

  expect(
    selectionToSlateRange({
      value: [
        createObject('image', 'b1'),
        {
          ...createBlock('b0'),
          children: [
            createSpan('b0c0', 'foo '),
            createSpan('b0c1', 'bar'),
            createSpan('b0c2', ' baz'),
          ],
        },
      ],
      selection: {
        anchor: {
          path: [{_key: 'b1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c1'}],
          offset: 2,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0],
      offset: 0,
    },
    focus: {
      path: [1, 1],
      offset: 2,
    },
  })

  expect(
    selectionToSlateRange({
      value: [
        {
          ...createBlock('b0'),
          children: [
            createSpan('b0c0', 'foo '),
            createSpan('b0c1', 'bar'),
            createSpan('b0c2', ' baz'),
          ],
        },
        createObject('image', 'b1'),
      ],
      selection: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 'b0c1'}],
          offset: 2,
        },
        focus: {
          path: [{_key: 'b1'}],
          offset: 0,
        },
      },
      schema,
    }),
  ).toEqual({
    anchor: {
      path: [0, 1],
      offset: 2,
    },
    focus: {
      path: [1],
      offset: 0,
    },
  })
})
