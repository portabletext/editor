import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {isSelectionExpanded} from '../src/selectors/selector.is-selection-expanded'
import {createTestEditor} from '../src/test/vitest'

/**
 * A behavior that empties a container child and selects it (the table
 * plugin's rectangle clear does exactly this) leaves the editor in a state
 * normalization is expected to repair: the child gets a fresh empty text
 * block. The selection must follow that repair. Before the fix it stayed
 * parked on the container-child path itself, and any `insert.text` executing
 * against that degenerate point silently dropped its text.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

const cellPath = [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'cell0'}]

/**
 * Mirrors the table plugin's rectangle clear: unset every block inside the
 * cell, then collapse onto the cell and let normalization mint the empty
 * replacement block.
 */
const clearCellOnDelete = defineBehavior({
  on: 'delete',
  guard: ({snapshot}) => isSelectionExpanded(snapshot),
  actions: [
    () => [
      raise({type: 'unset', at: [...cellPath, 'content', {_key: 'cb0'}]}),
      raise({type: 'select.block', at: cellPath, select: 'start'}),
    ],
  ],
})

/**
 * Same clear, but selecting with an expanded range whose endpoints sit on
 * the table and the emptied cell, exercising `resolveSelection`'s expanded
 * branch (endpoints resolved independently) against the unnormalized hole.
 */
const clearCellAndSelectExpanded = defineBehavior({
  on: 'custom.clear and select expanded',
  actions: [
    () => [
      raise({type: 'unset', at: [...cellPath, 'content', {_key: 'cb0'}]}),
      raise({
        type: 'select',
        at: {
          anchor: {path: [{_key: 't0'}], offset: 0},
          focus: {path: cellPath, offset: 0},
        },
      }),
    ],
  ],
})

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [
          {
            _type: 'cell',
            _key: 'cell0',
            content: [
              {
                _type: 'block',
                _key: 'cb0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'cs0', text: 'AA', marks: []}],
              },
            ],
          },
        ],
      },
    ],
  },
]

function tableWithClearedCell(text: string) {
  return [
    {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [
            {
              _type: 'cell',
              _key: 'cell0',
              content: [
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [{_type: 'span', _key: 'k3', text, marks: []}],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

const mintedLeafPath = [
  ...cellPath,
  'content',
  {_key: 'k2'},
  'children',
  {_key: 'k3'},
]

describe('selection on an emptied container child', () => {
  test('resolves to the leaf of the normalization-minted block', async () => {
    const editor = await selectAcrossCellText()

    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(tableWithClearedCell(''))
      expect(snapshot.context.selection).toEqual({
        anchor: {path: mintedLeafPath, offset: 0},
        focus: {path: mintedLeafPath, offset: 0},
        backward: false,
      })
    })
  })

  test('an expanded selection onto the emptied child resolves both endpoints', async () => {
    const editor = await selectAcrossCellText()

    editor.send({type: 'custom.clear and select expanded'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(tableWithClearedCell(''))
      expect(snapshot.context.selection).toEqual({
        anchor: {path: mintedLeafPath, offset: 0},
        focus: {path: mintedLeafPath, offset: 0},
        backward: false,
      })
    })
  })

  test('insert.text following a clearing delete lands in the repaired child', async () => {
    const editor = await selectAcrossCellText()

    editor.send({type: 'insert.text', text: 'e'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(tableWithClearedCell('e'))
      expect(snapshot.context.selection).toEqual({
        anchor: {path: mintedLeafPath, offset: 1},
        focus: {path: mintedLeafPath, offset: 1},
        backward: false,
      })
    })
  })
})

async function selectAcrossCellText() {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue,
    children: (
      <>
        <NodePlugin nodes={containers} />
        <BehaviorPlugin
          behaviors={[clearCellOnDelete, clearCellAndSelectExpanded]}
        />
      </>
    ),
  })
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          ...cellPath,
          'content',
          {_key: 'cb0'},
          'children',
          {_key: 'cs0'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          ...cellPath,
          'content',
          {_key: 'cb0'},
          'children',
          {_key: 'cs0'},
        ],
        offset: 2,
      },
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.offset).toBe(2)
  })
  return editor
}
