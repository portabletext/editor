import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {Container} from '../../renderers/renderer.types'
import {
  resolveContainers,
  resolveContainersRich,
} from '../../schema/resolve-containers'
import {createEditor} from '../create-editor'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import {subscribeToOperations} from './operation-channel'

const schema = compileSchema(
  defineSchema({
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    inlineObjects: [{name: 'stock-ticker'}],
    blockObjects: [
      {name: 'image'},
      {
        name: 'gallery',
        fields: [{name: 'items', type: 'array', of: [{type: 'block'}]}],
      },
      {
        name: 'note-board',
        fields: [
          {
            name: 'notes',
            type: 'array',
            of: [{type: 'object', name: 'note', fields: []}],
          },
        ],
      },
    ],
  }),
)

const rawContainers: ReadonlyArray<Container> = [
  {kind: 'container', type: 'gallery', arrayField: 'items'},
  {kind: 'container', type: 'note-board', arrayField: 'notes'},
]

/**
 * Fixtures deliberately violate `PortableTextBlock` (missing `_key`,
 * `_type`, `children` as a non-array, ...) - that's the runtime data these
 * corrections exist to repair. `Fixture` is the honest type for them; the
 * single cast at the editor boundary below is the only place that lies
 * about it.
 */
type Fixture = Record<string, unknown>

// Keep in sync with `corrections.test.ts`'s `createBareEditor`: this one
// additionally wires up `containers` for the container-correction fixtures
// above, which that file's schema doesn't need.
function createBareEditor(value: ReadonlyArray<Fixture>): Editor {
  const keyGenerator = createTestKeyGenerator()
  const editor = createEditor()
  editor.containers = resolveContainersRich(schema, rawContainers)
  editor.blockIndexMap = new Map()
  editor.listIndexMap = new Map()
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers: resolveContainers(schema, rawContainers),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      value: value as unknown as Array<PortableTextBlock>,
      selection: null,
    },
    decoratorState: {},
  } as Editor['snapshot']
  return editor
}

function runNormalize(
  value: ReadonlyArray<Fixture>,
  options: {remote?: boolean} = {},
) {
  const editor = createBareEditor(structuredClone(value))
  const operations: Array<EngineOperation> = []
  subscribeToOperations(editor, (event) => operations.push(event.operation))
  if (options.remote) {
    editor.isProcessingRemoteChanges = true
  }
  normalize(editor, {force: true})
  return {operations, value: editor.snapshot.context.value}
}

describe('normalize-node corrections equivalence', () => {
  test('empty editor gets a placeholder block', () => {
    // `root.no-blocks` is reactive, not a static defect a force-normalize
    // scan discovers: an editor whose value starts at `[]` has no nodes
    // for `getNodes` to seed `dirtyPaths` from (see `normalize.ts`'s
    // `force` branch), so force-normalizing an already-empty value is a
    // no-op. The real trigger is an operation that empties a
    // previously-nonempty value, dirtying the root path. Removing the
    // only block reproduces that.
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
    ])
    const operations: Array<EngineOperation> = []
    subscribeToOperations(editor, (event) => operations.push(event.operation))

    editor.apply({type: 'unset', path: [{_key: 'b0'}]})

    // `after` listeners observe a normalization fix's events before the
    // triggering operation's own `after` event (see `operation-channel.ts`),
    // so the reactive placeholder insert and selection nest ahead of the
    // `unset` that triggered them.
    expect(operations).toEqual([
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k0'}]},
      },
      {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        },
      },
      {
        type: 'unset',
        path: [{_key: 'b0'}],
        inverse: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'b0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's0', text: '', marks: []}],
          },
        },
      },
    ])
    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
      },
    ])
  })

  test('empty editor gets a placeholder block while processing remote changes', () => {
    // `root.no-blocks` is `structural`, so unlike the cosmetic corrections
    // it must still fire here: an editor left with zero blocks has nothing
    // to render regardless of who emptied it.
    const editor = createBareEditor([
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
    ])
    editor.isProcessingRemoteChanges = true
    const operations: Array<EngineOperation> = []
    subscribeToOperations(editor, (event) => operations.push(event.operation))

    editor.apply({type: 'unset', path: [{_key: 'b0'}]})

    // `apply-operation.ts` only fills in an operation's `inverse` when
    // `!editor.isProcessingRemoteChanges` - remote-origin changes don't
    // need a locally-computed undo step - so every recorded op here is
    // missing the `inverse` its local counterpart above has.
    expect(operations).toEqual([
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        },
      },
      {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        },
      },
      {
        type: 'unset',
        path: [{_key: 'b0'}],
      },
    ])
    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
      },
    ])
  })

  test('adjacent empty spans (several in a row)', () => {
    const value = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: []},
          {_type: 'span', _key: 's2', text: '', marks: []},
          {_type: 'span', _key: 's3', text: '', marks: []},
          {_type: 'span', _key: 's4', text: '', marks: []},
          {_type: 'span', _key: 's5', text: 'b', marks: []},
        ],
      },
    ]
    expect(runNormalize(value).operations).toEqual([
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's2',
            text: '',
            marks: [],
          },
          position: 'after',
        },
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's3',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's3',
            text: '',
            marks: [],
          },
          position: 'after',
        },
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's4',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's4',
            text: '',
            marks: [],
          },
          position: 'after',
        },
      },
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 1,
        text: 'b',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's5',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's5',
            text: 'b',
            marks: [],
          },
          position: 'after',
        },
      },
    ]) // adjacent-empty-spans (local)
    expect(runNormalize(value, {remote: true}).operations).toEqual([]) // adjacent-empty-spans (remote)
  })

  test('deep-equal span runs N=4', () => {
    const value = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: ['strong']},
          {_type: 'span', _key: 's2', text: 'b', marks: ['strong']},
          {_type: 'span', _key: 's3', text: 'c', marks: ['strong']},
          {_type: 'span', _key: 's4', text: 'd', marks: ['strong']},
        ],
      },
    ]
    expect(runNormalize(value).operations).toEqual([
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 1,
        text: 'b',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's2',
            text: 'b',
            marks: ['strong'],
          },
          position: 'after',
        },
      },
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 2,
        text: 'c',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's3',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's3',
            text: 'c',
            marks: ['strong'],
          },
          position: 'after',
        },
      },
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 3,
        text: 'd',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's4',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's4',
            text: 'd',
            marks: ['strong'],
          },
          position: 'after',
        },
      },
    ]) // deep-equal-span-runs (local)
    expect(runNormalize(value, {remote: true}).operations).toEqual([]) // deep-equal-span-runs (remote)
  })

  test('spans differing only in marks order', () => {
    const value = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: ['strong', 'em']},
          {_type: 'span', _key: 's2', text: 'b', marks: ['em', 'strong']},
        ],
      },
    ]
    expect(runNormalize(value).operations).toEqual([
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 1,
        text: 'b',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's2',
            text: 'b',
            marks: ['em', 'strong'],
          },
          position: 'after',
        },
      },
    ]) // marks-order (local)
    expect(runNormalize(value, {remote: true}).operations).toEqual([]) // marks-order (remote)
  })

  test('inline objects leading/trailing/adjacent/lone', () => {
    const leading = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'stock-ticker', _key: 'o1'},
          {_type: 'span', _key: 's1', text: 'a', marks: []},
        ],
      },
    ]
    expect(runNormalize(leading).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // inline-object-leading (local)
    expect(runNormalize(leading, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
      },
    ]) // inline-object-leading (remote)

    const trailing = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: []},
          {_type: 'stock-ticker', _key: 'o1'},
        ],
      },
    ]
    expect(runNormalize(trailing).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'after',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // inline-object-trailing (local)
    expect(runNormalize(trailing, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'after',
      },
    ]) // inline-object-trailing (remote)

    const adjacent = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: []},
          {_type: 'stock-ticker', _key: 'o1'},
          {_type: 'stock-ticker', _key: 'o2'},
          {_type: 'span', _key: 's2', text: 'b', marks: []},
        ],
      },
    ]
    expect(runNormalize(adjacent).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o2',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // inline-object-adjacent (local)
    expect(runNormalize(adjacent, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o2',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
      },
    ]) // inline-object-adjacent (remote)

    const lone = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'stock-ticker', _key: 'o1'}],
      },
    ]
    expect(runNormalize(lone).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k1',
          text: '',
          marks: [],
        },
        position: 'after',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
    ]) // inline-object-lone (local)
    expect(runNormalize(lone, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'o1',
          },
        ],
        node: {
          _type: 'span',
          _key: 'k1',
          text: '',
          marks: [],
        },
        position: 'after',
      },
    ]) // inline-object-lone (remote)
  })

  test('missing key/type', () => {
    const missingBlockKey = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingBlockKey).operations).toEqual([
      {
        type: 'set',
        path: [0, '_key'],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [0, '_key'],
        },
      },
    ]) // missing-block-key (local)
    expect(runNormalize(missingBlockKey, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [0, '_key'],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [0, '_key'],
        },
      },
    ]) // missing-block-key (remote)

    const missingChildKey = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingChildKey).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            0,
            '_key',
          ],
        },
      },
    ]) // missing-child-key (local)
    expect(runNormalize(missingChildKey, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            0,
            '_key',
          ],
        },
      },
    ]) // missing-child-key (remote)

    const missingBlockType = [
      {
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingBlockType).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          '_type',
        ],
        value: 'block',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            '_type',
          ],
        },
      },
    ]) // missing-block-type (local)
    expect(runNormalize(missingBlockType, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          '_type',
        ],
        value: 'block',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            '_type',
          ],
        },
      },
    ]) // missing-block-type (remote)

    const missingChildType = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingChildType).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          '_type',
        ],
        value: 'span',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            '_type',
          ],
        },
      },
    ]) // missing-child-type (local)
    expect(runNormalize(missingChildType, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          '_type',
        ],
        value: 'span',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            '_type',
          ],
        },
      },
    ]) // missing-child-type (remote)
  })

  test('duplicate sibling keys, duplicate container-child keys', () => {
    const dupSibling = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'a', marks: []},
          {_type: 'span', _key: 's1', text: 'b', marks: []},
        ],
      },
    ]
    expect(runNormalize(dupSibling).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          1,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'children',
            1,
            '_key',
          ],
          value: 's1',
        },
      },
      {
        type: 'insert.text',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
        ],
        offset: 1,
        text: 'b',
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 'k0',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 'k0',
            text: 'b',
            marks: [],
          },
          position: 'after',
        },
      },
    ]) // duplicate-sibling-key (local)
    expect(runNormalize(dupSibling, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          1,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'children',
            1,
            '_key',
          ],
          value: 's1',
        },
      },
    ]) // duplicate-sibling-key (remote)

    const dupContainerChild = [
      {
        _type: 'gallery',
        _key: 'g1',
        items: [
          {
            _type: 'block',
            _key: 'gb1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'gs1', text: 'a', marks: []}],
          },
          {
            _type: 'block',
            _key: 'gb1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'gs2', text: 'b', marks: []}],
          },
        ],
      },
    ]
    expect(runNormalize(dupContainerChild).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'g1',
          },
          'items',
          1,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'g1',
            },
            'items',
            1,
            '_key',
          ],
          value: 'gb1',
        },
      },
    ]) // duplicate-container-child-key (local)
    expect(runNormalize(dupContainerChild, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'g1',
          },
          'items',
          1,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'g1',
            },
            'items',
            1,
            '_key',
          ],
          value: 'gb1',
        },
      },
    ]) // duplicate-container-child-key (remote)
  })

  test('missing style/marks/markDefs/text, children non-array/empty', () => {
    const missingMarkDefs = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingMarkDefs).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
        },
      },
    ]) // missing-mark-defs (local)
    expect(runNormalize(missingMarkDefs, {remote: true}).operations).toEqual([]) // missing-mark-defs (remote)

    const missingStyle = [
      {
        _type: 'block',
        _key: 'b1',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ]
    expect(runNormalize(missingStyle).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'style',
        ],
        value: 'normal',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'style',
          ],
        },
      },
    ]) // missing-style (local)
    expect(runNormalize(missingStyle, {remote: true}).operations).toEqual([]) // missing-style (remote)

    const missingMarks = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a'}],
      },
    ]
    expect(runNormalize(missingMarks).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          'marks',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            'marks',
          ],
        },
      },
    ]) // missing-marks (local)
    expect(runNormalize(missingMarks, {remote: true}).operations).toEqual([]) // missing-marks (remote)

    const missingText = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', marks: []}],
      },
    ]
    expect(runNormalize(missingText).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          'text',
        ],
        value: '',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            'text',
          ],
        },
      },
    ]) // missing-text (local)
    expect(runNormalize(missingText, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          'text',
        ],
        value: '',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            'text',
          ],
        },
      },
    ]) // missing-text (remote)

    const childrenNonArray = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: 'not-an-array',
      },
    ]
    expect(runNormalize(childrenNonArray).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
          ],
        },
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // children-non-array (local)
    expect(runNormalize(childrenNonArray, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
          ],
        },
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
      },
    ]) // children-non-array (remote)

    const childrenEmpty = [
      {_type: 'block', _key: 'b1', style: 'normal', markDefs: [], children: []},
    ]
    expect(runNormalize(childrenEmpty).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // children-empty (local)
    expect(runNormalize(childrenEmpty, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
      },
    ]) // children-empty (remote)
  })

  test('unused + duplicate markDefs, annotations on empty span', () => {
    const link1 = {_key: 'm1', _type: 'link', href: 'https://a'}
    const link2 = {_key: 'm2', _type: 'link', href: 'https://b'}
    const dupMarkDefs = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [link1, {...link1}],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: ['m1']}],
      },
    ]
    expect(runNormalize(dupMarkDefs).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [
          {
            _key: 'm1',
            _type: 'link',
            href: 'https://a',
          },
        ],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
          value: [
            {
              _key: 'm1',
              _type: 'link',
              href: 'https://a',
            },
            {
              _key: 'm1',
              _type: 'link',
              href: 'https://a',
            },
          ],
        },
      },
    ]) // duplicate-mark-defs (local)
    expect(runNormalize(dupMarkDefs, {remote: true}).operations).toEqual([]) // duplicate-mark-defs (remote)

    const unusedMarkDefs = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [link1, link2],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: ['m1']}],
      },
    ]
    expect(runNormalize(unusedMarkDefs).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [
          {
            _key: 'm1',
            _type: 'link',
            href: 'https://a',
          },
        ],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
          value: [
            {
              _key: 'm1',
              _type: 'link',
              href: 'https://a',
            },
            {
              _key: 'm2',
              _type: 'link',
              href: 'https://b',
            },
          ],
        },
      },
    ]) // unused-mark-defs (local)
    expect(runNormalize(unusedMarkDefs, {remote: true}).operations).toEqual([]) // unused-mark-defs (remote)

    const annotationsOnEmptySpan = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [link1],
        children: [{_type: 'span', _key: 's1', text: '', marks: ['m1']}],
      },
    ]
    expect(runNormalize(annotationsOnEmptySpan).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          'marks',
        ],
        value: [],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            'marks',
          ],
          value: ['m1'],
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
          value: [
            {
              _key: 'm1',
              _type: 'link',
              href: 'https://a',
            },
          ],
        },
      },
    ]) // annotations-on-empty-span (local)
    expect(
      runNormalize(annotationsOnEmptySpan, {remote: true}).operations,
    ).toEqual([]) // annotations-on-empty-span (remote)
  })

  test('container missing child array', () => {
    const containerEmpty = [{_type: 'gallery', _key: 'g1', items: []}]
    expect(runNormalize(containerEmpty).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'g1',
          },
          'items',
          0,
        ],
        node: {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: '',
              marks: [],
            },
          ],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'g1',
            },
            'items',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // container-missing-child-array-empty (local)
    expect(runNormalize(containerEmpty, {remote: true}).operations).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'g1',
          },
          'items',
          0,
        ],
        node: {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: '',
              marks: [],
            },
          ],
        },
        position: 'before',
      },
    ]) // container-missing-child-array-empty (remote)

    const containerNoField = [{_type: 'gallery', _key: 'g1'}]
    expect(runNormalize(containerNoField).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'g1',
          },
          'items',
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: '',
                marks: [],
              },
            ],
          },
        ],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'g1',
            },
            'items',
          ],
        },
      },
    ]) // container-missing-child-array-no-field (local)
    expect(runNormalize(containerNoField, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'g1',
          },
          'items',
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: '',
                marks: [],
              },
            ],
          },
        ],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'g1',
            },
            'items',
          ],
        },
      },
    ]) // container-missing-child-array-no-field (remote)
  })

  test('container missing child array, non-block child type', () => {
    // `note-board`'s `notes` field only accepts `note` (an inline object,
    // not `block`), exercising the correction's other child-creation
    // branch: a bare `{_type, _key}` object instead of a placeholder block.
    const noteBoardEmpty = [{_type: 'note-board', _key: 'nb1', notes: []}]
    expect(runNormalize(noteBoardEmpty).operations).toEqual([
      {
        type: 'insert',
        path: [{_key: 'nb1'}, 'notes', 0],
        node: {_type: 'note', _key: 'k0'},
        position: 'before',
        inverse: {type: 'unset', path: [{_key: 'nb1'}, 'notes', {_key: 'k0'}]},
      },
    ])
  })

  test('composite fixture tripping several rules', () => {
    const composite = [
      {
        _type: 'block',
        _key: 'b1',
        markDefs: [],
        children: [
          {_type: 'span', text: 'a', marks: []},
          {_type: 'span', _key: 's2', text: '', marks: []},
        ],
      },
    ]
    expect(runNormalize(composite).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            0,
            '_key',
          ],
        },
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
          node: {
            _type: 'span',
            _key: 's2',
            text: '',
            marks: [],
          },
          position: 'after',
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'style',
        ],
        value: 'normal',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'style',
          ],
        },
      },
    ]) // composite (local)
    expect(runNormalize(composite, {remote: true}).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
          '_key',
        ],
        value: 'k0',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            0,
            '_key',
          ],
        },
      },
    ]) // composite (remote)
  })

  test('worst-case convergence', () => {
    const worst = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: 'not-an-array',
      },
    ]
    expect(runNormalize(worst).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
          ],
        },
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'b1',
          },
          'children',
          0,
        ],
        node: {
          _type: 'span',
          _key: 'k0',
          text: '',
          marks: [],
        },
        position: 'before',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 'k0',
            },
          ],
        },
      },
    ]) // worst-case-children-not-array (local)

    const manyDefects = [
      {
        _type: 'block',
        _key: 'b1',
        markDefs: [
          {_key: 'm1', _type: 'link', href: 'x'},
          {_key: 'm1', _type: 'link', href: 'x'},
        ],
        children: [
          {_type: 'span', _key: 's1', text: 'a'},
          {_type: 'span', _key: 's2', text: '', marks: ['m1']},
        ],
      },
    ]
    expect(runNormalize(manyDefects).operations).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
          'marks',
        ],
        value: [],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's2',
            },
            'marks',
          ],
          value: ['m1'],
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's1',
          },
          'marks',
        ],
        value: [],
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
            'marks',
          ],
        },
      },
      {
        type: 'unset',
        path: [
          {
            _key: 'b1',
          },
          'children',
          {
            _key: 's2',
          },
        ],
        inverse: {
          type: 'insert',
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
          node: {
            _type: 'span',
            _key: 's2',
            text: '',
            marks: [],
          },
          position: 'after',
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'style',
        ],
        value: 'normal',
        inverse: {
          type: 'unset',
          path: [
            {
              _key: 'b1',
            },
            'style',
          ],
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [
          {
            _key: 'm1',
            _type: 'link',
            href: 'x',
          },
        ],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
          value: [
            {
              _key: 'm1',
              _type: 'link',
              href: 'x',
            },
            {
              _key: 'm1',
              _type: 'link',
              href: 'x',
            },
          ],
        },
      },
      {
        type: 'set',
        path: [
          {
            _key: 'b1',
          },
          'markDefs',
        ],
        value: [],
        inverse: {
          type: 'set',
          path: [
            {
              _key: 'b1',
            },
            'markDefs',
          ],
          value: [
            {
              _key: 'm1',
              _type: 'link',
              href: 'x',
            },
          ],
        },
      },
    ]) // worst-case-many-defects (local)
  })
})
