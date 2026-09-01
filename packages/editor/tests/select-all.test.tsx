import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Select-all is editor-owned. Browsers cannot be trusted to build the range
 * themselves: chromium's native select-all produces an already-collapsed
 * range whenever a non-editable element sits at either content edge of the
 * editing host. Block objects render non-editable, and table renders carry
 * non-editable chrome, so both a table-only document and any document
 * starting or ending with a void block had a native select-all no-op.
 */

// Not `ControlOrMeta`: `userEvent` resolves that from the host OS while the
// shortcut guard resolves the platform from the user agent, and playwright's
// webkit reports a Mac user agent on Linux. `IS_MAC` follows the guard's
// source of truth.
const selectAllChord = IS_MAC ? '{Meta>}a{/Meta}' : '{Control>}a{/Control}'

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

/**
 * Rendered with real `<table>` DOM plus a non-editable chrome sibling, the
 * shape of any real-world table render with selection chrome. The chrome
 * sibling is the part that matters: it puts a non-editable element at the
 * document's content edge, which is what collapses chromium's native
 * select-all.
 */
const containers = [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({attributes, children}) => (
      <div {...attributes}>
        <table>
          <tbody>{children}</tbody>
        </table>
        <div contentEditable={false}>chrome</div>
      </div>
    ),
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({attributes, children}) => <td {...attributes}>{children}</td>,
  }),
]

function cell(key: string, text: string) {
  return {
    _type: 'cell',
    _key: key,
    content: [
      {
        _type: 'block',
        _key: `b-${key}`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `s-${key}`, text, marks: []}],
      },
    ],
  }
}

describe('Feature: Select All', () => {
  test('Scenario: Selecting the whole document when a table is the only block', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [cell('c00', 'A'), cell('c01', 'B')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })
    await userEvent.click(
      // Aimed at cell text rather than the editable's surface: a click on a
      // container's bare surface inserts an escape placeholder, which would
      // change the document before select-all runs.
      locator.getByText('A'),
    )

    await userEvent.keyboard(selectAllChord)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 't0'},
            'rows',
            {_key: 'r0'},
            'cells',
            {_key: 'c00'},
            'content',
            {_key: 'b-c00'},
            'children',
            {_key: 's-c00'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 't0'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c11'},
            'content',
            {_key: 'b-c11'},
            'children',
            {_key: 's-c11'},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Selecting the whole document over block objects', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {_type: 'image', _key: 'img1', src: 'a.png'},
        {_type: 'image', _key: 'img2', src: 'b.png'},
      ],
    })
    await userEvent.click(locator)

    await userEvent.keyboard(selectAllChord)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'img1'}], offset: 0},
        focus: {path: [{_key: 'img2'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Selecting the whole document over plain text blocks', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: 'blockA',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'spanA', text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: 'blockB',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'spanB', text: 'bar', marks: []}],
        },
      ],
    })
    await userEvent.click(locator)

    await userEvent.keyboard(selectAllChord)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })
})
