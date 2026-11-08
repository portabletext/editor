import {compileSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../../test-utils/text-block-depths'
import {resolveContainersRich} from '../../schema/resolve-containers-batch'
import {resolveTestbedContainers} from '../../traversal/node-traversal-testbed'
import type {PortableTextEditorEngine} from '../../types/editor-engine'
import {createEditor} from '../create-editor'
import {apply} from './apply'
import {inTestChange} from './change.test-utils'

describe(`${apply.name} with a compact path to a text block at the root`, () => {
  test('an `unset` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () => apply(editor, {type: 'unset', path: [0, 0]}))

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.operations).toEqual([])
  })

  test('a `set` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {type: 'set', path: [0, 0, 'text'], value: 'baz'}),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('a `insert` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert',
        path: [0, 0],
        node: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('a `insert.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert.text',
        path: [0, 0],
        offset: 3,
        text: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('a `remove.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {type: 'remove.text', path: [0, 0], offset: 1, text: 'oo'}),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('a `set.selection` to a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [0, 0], offset: 0},
          focus: {path: [0, 0], offset: 0},
        },
      }),
    )

    expect(editor.snapshot.context.selection).toEqual(null)
    expect(editor.operations).toEqual([])
  })
})

describe(`${apply.name} with a compact path to a text block inside a callout`, () => {
  test('an `unset` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {type: 'unset', path: [0, 'content', 0, 0]}),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(editor.operations).toEqual([])
  })

  test('a `set` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set',
        path: [0, 'content', 0, 0, 'text'],
        value: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `insert` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert',
        path: [0, 'content', 0, 0],
        node: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `insert.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert.text',
        path: [0, 'content', 0, 0],
        offset: 3,
        text: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `remove.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'remove.text',
        path: [0, 'content', 0, 0],
        offset: 1,
        text: 'oo',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `set.selection` to a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [0, 'content', 0, 0], offset: 0},
          focus: {path: [0, 'content', 0, 0], offset: 0},
        },
      }),
    )

    expect(editor.snapshot.context.selection).toEqual(null)
    expect(editor.operations).toEqual([])
  })
})

describe(`${apply.name} with a compact path to a text block inside a callout inside a callout`, () => {
  test('an `unset` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {type: 'unset', path: [0, 'content', 0, 'content', 0, 0]}),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
    expect(editor.operations).toEqual([])
  })

  test('a `set` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set',
        path: [0, 'content', 0, 'content', 0, 0, 'text'],
        value: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })

  test('a `insert` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert',
        path: [0, 'content', 0, 'content', 0, 0],
        node: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })

  test('a `insert.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert.text',
        path: [0, 'content', 0, 'content', 0, 0],
        offset: 3,
        text: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })

  test('a `remove.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'remove.text',
        path: [0, 'content', 0, 'content', 0, 0],
        offset: 1,
        text: 'oo',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })

  test('a `set.selection` to a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [0, 'content', 0, 'content', 0, 0], offset: 0},
          focus: {path: [0, 'content', 0, 'content', 0, 0], offset: 0},
        },
      }),
    )

    expect(editor.snapshot.context.selection).toEqual(null)
    expect(editor.operations).toEqual([])
  })
})

describe(`${apply.name} with a compact path to a text block inside a field with its own sub-schema`, () => {
  test('an `unset` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {type: 'unset', path: [0, 'body', 0, 0]}),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(editor.operations).toEqual([])
  })

  test('a `set` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set',
        path: [0, 'body', 0, 0, 'text'],
        value: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `insert` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert',
        path: [0, 'body', 0, 0],
        node: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `insert.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert.text',
        path: [0, 'body', 0, 0],
        offset: 3,
        text: 'baz',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `remove.text` at a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'remove.text',
        path: [0, 'body', 0, 0],
        offset: 1,
        text: 'oo',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a `set.selection` to a compact span path (indexed) is dropped', () => {
    const editor = createBareEditor([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [0, 'body', 0, 0], offset: 0},
          focus: {path: [0, 'body', 0, 0], offset: 0},
        },
      }),
    )

    expect(editor.snapshot.context.selection).toEqual(null)
    expect(editor.operations).toEqual([])
  })
})

describe(`${apply.name} at the root path`, () => {
  test('an `insert` at `[]` changes nothing and records no operation', () => {
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    inTestChange(editor, () =>
      apply(editor, {
        type: 'insert',
        path: [],
        node: {_key: 'i0', _type: 'span', text: 'baz', marks: []},
        position: 'after',
      }),
    )

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.operations).toEqual([])
  })
})

function createBareEditor(
  value: Array<PortableTextBlock>,
): PortableTextEditorEngine {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers: resolveTestbedContainers(schema, textBlockDepthsContainers),
      keyGenerator: createTestKeyGenerator('generated-'),
      value,
    },
  })
  const editor = createEditor() as PortableTextEditorEngine

  editor.containers = resolveContainersRich(schema, textBlockDepthsContainers)
  editor.blockIndexMap = new Map(snapshot.blockIndexMap)
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    ...snapshot,
    blockIndexMap: editor.blockIndexMap,
  } as PortableTextEditorEngine['snapshot']

  return editor
}
