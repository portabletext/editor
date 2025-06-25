import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import type {EditorSelection} from '..'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
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
    selection: EditorSelection,
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
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
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
            path: [{_key: 'b0'}, 'children', {_key: 's0'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b0'}, 'children', {_key: 's0'}],
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
            path: [{_key: 'b0'}, 'children', {_key: 's0'}],
            offset: 3,
          },
          focus: {
            path: [{_key: 'b0'}, 'children', {_key: 's0'}],
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
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's2'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('bar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's2'}],
          offset: 1,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's3'}],
          offset: 1,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('r')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('r')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's6'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's5'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock, bazBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's7'}],
          offset: 2,
        },
      }),
    ),
  ).toBe('arba')
  expect(
    getSelectionText(
      snapshot([brokenBlock, bazBlock], {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's7'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('ar')
  expect(
    getSelectionText(
      snapshot([brokenBlock, imageBlock, bazBlock], {
        anchor: {
          path: [{_key: imageBlock._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's7'}],
          offset: 0,
        },
      }),
    ),
  ).toBe('')
  expect(
    getSelectionText(
      snapshot([brokenBlock, imageBlock, bazBlock], {
        anchor: {
          path: [{_key: imageBlock._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's7'}],
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
            path: [
              {
                _key: 'e0-k8',
              },
              'children',
              {
                _key: 'e0-k7',
              },
            ],
            offset: 0,
          },
          focus: {
            path: [
              {
                _key: 'e0-k8',
              },
              'children',
              {
                _key: 'e0-k10',
              },
            ],
            offset: 1,
          },
        },
      ),
    ),
  ).toBe(':bar')
})
