import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import {compileSchemaDefinition, defineSchema} from '../editor/editor-schema'
import type {IndexedEditorSelection} from '../editor/indexed-selection'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getSelectionText} from './selector.get-selection-text'

const brokenBlock = {
  _type: 'block',
  _key: 'b0',
  style: 'normal',
  markDefs: [],
  children: [
    {
      _key: 's0',
      _type: 'span',
      text: '',
    },
    {
      _key: 's1',
      _type: 'stock-ticker',
    },
    {
      _key: 's2',
      _type: 'span',
      text: 'b',
    },
    {
      _key: 's3',
      _type: 'span',
      text: 'a',
    },
    {
      _key: 's4',
      _type: 'span',
      text: 'r',
    },
    {
      _key: 's5',
      _type: 'stock-ticker',
    },
    {
      _key: 's6',
      _type: 'span',
      text: '',
    },
  ],
}
const bazBlock = {
  _type: 'block',
  _key: 'b1',
  style: 'normal',
  markDefs: [],
  children: [
    {
      _key: 's7',
      _type: 'span',
      text: 'baz',
    },
  ],
}
const imageBlock = {
  _type: 'image',
  _key: 'b2',
}

test(getSelectionText.name, () => {
  function snapshot(
    value: Array<PortableTextBlock>,
    selection: IndexedEditorSelection,
  ) {
    return createTestSnapshot({
      context: {
        schema: compileSchemaDefinition(
          defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
        ),
        value,
        selection,
      },
    })
  }

  expect(
    getSelectionText(
      snapshot(
        [
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'f',
                marks: ['strong'],
              },
              {
                _type: 'span',
                _key: 'k2',
                marks: ['strong', 'em'],
                text: 'oo b',
              },
              {
                _type: 'span',
                _key: 'k3',
                marks: ['strong', 'em', 'underline'],
                text: 'a',
              },
              {
                _type: 'span',
                _key: 'k4',
                marks: ['strong', 'underline'],
                text: 'r ba',
              },
              {
                _type: 'span',
                _key: 'k5',
                marks: ['strong'],
                text: 'z',
              },
            ],
          },
        ],
        {
          anchor: {path: [0, 0], offset: 0},
          focus: {path: [0, 2], offset: 0},
        },
      ),
    ),
  ).toBe('foo b')
  expect(
    getSelectionText(
      snapshot(
        [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'foo bar'}],
          },
        ],
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 0],
            offset: 3,
          },
        },
      ),
    ),
  ).toBe('foo')
  expect(
    getSelectionText(
      snapshot(
        [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'foo bar'}],
          },
        ],
        {
          anchor: {
            path: [0, 0],
            offset: 3,
          },
          focus: {
            path: [0, 0],
            offset: 7,
          },
        },
      ),
    ),
  ).toBe(' bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 0],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 1],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 2],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 2],
          offset: 1,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 3],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 3],
          offset: 1,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('r')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 4],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('r')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 5],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [0, 6],
          offset: 0,
        },
        focus: {
          path: [0, 5],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock, bazBlock], {
        anchor: {
          path: [0, 3],
          offset: 0,
        },
        focus: {
          path: [1, 0],
          offset: 2,
        },
      }),
    ),
  ).toBe('arba')
  expect(
    getSelectionText(
      snapshot([brokenBlock, bazBlock], {
        anchor: {
          path: [0, 3],
          offset: 0,
        },
        focus: {
          path: [1, 0],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock, imageBlock, bazBlock], {
        anchor: {
          path: [1],
          offset: 0,
        },
        focus: {
          path: [1, 0],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock, imageBlock, bazBlock], {
        anchor: {
          path: [1],
          offset: 0,
        },
        focus: {
          path: [2, 0],
          offset: 1,
        },
      }),
    ),
  ).toBe('b')
  expect(
    getSelectionText(
      snapshot(
        [
          {
            _type: 'block',
            _key: 'e0-k8',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'e0-k7',
                text: ':b',
                marks: [],
              },
              {
                text: 'a',
                _type: 'span',
                _key: 'e0-k9',
                marks: ['strong'],
              },
              {
                text: 'r',
                marks: [],
                _type: 'span',
                _key: 'e0-k10',
              },
            ],
          },
        ],
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 2],
            offset: 1,
          },
        },
      ),
    ),
  ).toBe(':bar')
})
