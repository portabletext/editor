import {defineSchema, type EditorSnapshot} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {getFragment} from '@portabletext/editor/selectors'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {TablePlugin} from '../plugin.table'

/**
 * A consumer `serialize.data`/`deserialize.data` Behavior pair standing in
 * for a real one, e.g. the markdown restore Behaviors from the migration
 * guide. Registered for `text/plain` (not `text/markdown`) to keep the
 * assertions below focused on the forwarding contract rather than on any
 * one mime type.
 */
const markdownTextPlainBehaviors = [
  defineBehavior({
    on: 'deserialize.data',
    guard: ({snapshot, event}) => {
      if (event.mimeType !== 'text/plain') {
        return false
      }

      const blocks = markdownToPortableText(event.data, {
        schema: snapshot.context.schema,
        keyGenerator: snapshot.context.keyGenerator,
      })

      if (blocks.length === 0) {
        return false
      }

      return {blocks}
    },
    actions: [
      ({event}, {blocks}) => [
        raise({...event, type: 'deserialization.success', data: blocks}),
      ],
    ],
  }),
  defineBehavior({
    on: 'serialize.data',
    guard: ({event}) => event.mimeType === 'text/plain',
    actions: [
      ({snapshot, event}) => [
        raise({
          type: 'serialization.success',
          mimeType: 'text/plain',
          data: portableTextToMarkdown(
            event.blocks ?? getFragment(snapshot).map((entry) => entry.node),
          ),
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
]

function MarkdownTextPlainPlugin() {
  return <BehaviorPlugin behaviors={markdownTextPlainBehaviors} />
}

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
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
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

const cell = (key: string, text: string) => ({
  _type: 'cell',
  _key: key,
  value: [
    {
      _type: 'block',
      _key: `b-${key}`,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `s-${key}`, text, marks: []}],
    },
  ],
})

// 2x2 grid: c00 c01 / c10 c11
const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'A'), cell('c01', 'B')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'C'), cell('c11', 'D')]},
    ],
  },
]

function spanPath(cellKey: string) {
  const rowKey = cellKey.startsWith('c0') ? 'r0' : 'r1'
  return [
    {_key: 't0'},
    'rows',
    {_key: rowKey},
    'cells',
    {_key: cellKey},
    'value',
    {_key: `b-${cellKey}`},
    'children',
    {_key: `s-${cellKey}`},
  ]
}

const leftColumnSelection = {
  anchor: {path: spanPath('c00'), offset: 0},
  focus: {path: spanPath('c10'), offset: 1},
}

function value(snapshot: EditorSnapshot) {
  return snapshot.context.value as typeof initialValue
}

/**
 * Selects the left column: anchor in `c00`, focus in `c10`. The linear range
 * between them covers `c01`, which the rectangle excludes.
 */
async function selectLeftColumn() {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue,
    children: <TablePlugin />,
  })
  editor.send({type: 'focus'})
  editor.send({type: 'select', at: leftColumnSelection})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
  })
  return editor
}

describe('rectangular selection copy/cut', () => {
  test('copying a column selection leaves `text/plain` and `text/markdown` empty', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(dataTransfer.getData('application/x-portable-text')),
      ).not.toEqual([])
    })
    // Core's `text/html` and `text/plain` converters only read text blocks
    // and known block objects; a table's `rows`/`cells` nesting is opaque to
    // them, so the forwarded rectangle serializes to nothing for either.
    // Core ships no `text/markdown` converter at all. A consumer that wants
    // any of these mime types populated registers its own `serialize.data`
    // Behavior (see the `text/plain` consumer test below).
    expect(dataTransfer.getData('text/html')).toBe('')
    expect(dataTransfer.getData('text/plain')).toBe('')
    expect(dataTransfer.getData('text/markdown')).toBe('')
  })

  test('a consumer `serialize.data` Behavior for `text/plain` serializes the forwarded rectangle, not the raw selection', async () => {
    // The table plugin's `forward` only reaches Behaviors registered after
    // it: mounting order is registration order, and a `forward`ed event
    // resumes at the next not-yet-run Behavior in that order. Swapping the
    // plugin order here would make this Behavior see the un-narrowed event
    // (`event.blocks` still `undefined`) and serialize the raw selection
    // instead of the rectangle.
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: (
        <>
          <TablePlugin />
          <MarkdownTextPlainPlugin />
        </>
      ),
    })
    editor.send({type: 'focus'})
    editor.send({type: 'select', at: leftColumnSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      // The linear fragment between the corners would include `c01` (`B`);
      // the rectangle excludes it.
      expect(dataTransfer.getData('text/plain')).toBe(
        ['|  |', '| --- |', '| A |', '| C |'].join('\n'),
      )
    })
  })

  test('a consumer `deserialize.data` Behavior for `text/plain` round-trips a copied rectangle through markdown', async () => {
    const localInitialValue = [
      ...initialValue,
      {
        _type: 'block',
        _key: 'p0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's-p0', text: '', marks: []}],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: localInitialValue,
      children: (
        <>
          <TablePlugin />
          <MarkdownTextPlainPlugin />
        </>
      ),
    })
    editor.send({type: 'focus'})

    const wholeTableSelection = {
      anchor: {path: spanPath('c00'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: wholeTableSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const copyTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer: copyTransfer},
      position: {selection: wholeTableSelection},
    })

    let markdown = ''
    await vi.waitFor(() => {
      markdown = copyTransfer.getData('text/plain')
      expect(markdown).not.toBe('')
    })

    // Only `text/plain` reaches the paste's `DataTransfer`: the deserialize
    // pipeline prefers `application/x-portable-text` when present, which
    // would skip the markdown Behavior under test and paste the original
    // rectangle back verbatim instead of round-tripping through markdown.
    const outsideCaret = {
      anchor: {path: [{_key: 'p0'}, 'children', {_key: 's-p0'}], offset: 0},
      focus: {path: [{_key: 'p0'}, 'children', {_key: 's-p0'}], offset: 0},
    }
    editor.send({type: 'select', at: outsideCaret})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.anchor.path[0]).toEqual({
        _key: 'p0',
      })
    })

    const pasteTransfer = new DataTransfer()
    pasteTransfer.setData('text/plain', markdown)
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer: pasteTransfer},
      position: {selection: outsideCaret},
    })

    // `insert.blocks` at an empty text block's caret replaces the empty
    // block instead of leaving it beside the inserted content, so `p0`
    // itself does not survive the paste.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        ...initialValue,
        {
          _key: 'k22',
          _type: 'table',
          rows: [
            {
              _key: 'k14',
              _type: 'row',
              cells: [
                {
                  _key: 'k10',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k8',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k9', _type: 'span', text: 'A', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _key: 'k13',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k11',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k12', _type: 'span', text: 'B', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _key: 'k21',
              _type: 'row',
              cells: [
                {
                  _key: 'k17',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k15',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k16', _type: 'span', text: 'C', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _key: 'k20',
                  _type: 'cell',
                  value: [
                    {
                      _key: 'k18',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k19', _type: 'span', text: 'D', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('copying a column selection serializes only the column', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      // The linear fragment would include c01 (`B`).
      expect(
        JSON.parse(dataTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c00', 'A')]},
            {_type: 'row', _key: 'r1', cells: [cell('c10', 'C')]},
          ],
        },
      ])
    })
  })

  test('slicing keeps header rows positional', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          headerRows: 1,
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
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})

    // Right column (c01 -> c11): the header row is included.
    const rightColumnSelection = {
      anchor: {path: spanPath('c01'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: rightColumnSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const columnTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer: columnTransfer},
      position: {selection: rightColumnSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(columnTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          headerRows: 1,
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c01', 'B')]},
            {_type: 'row', _key: 'r1', cells: [cell('c11', 'D')]},
          ],
        },
      ])
    })

    // Bottom row (c10 -> c11): the header row is excluded, so the copy
    // carries no header rows.
    const bottomRowSelection = {
      anchor: {path: spanPath('c10'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: bottomRowSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path.at(-1)).toEqual(
        {_key: 's-c11'},
      )
    })

    const rowTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer: rowTransfer},
      position: {selection: bottomRowSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(rowTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          headerRows: 0,
          rows: [
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ])
    })
  })

  test('cutting a column selection serializes the column and clears it', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(dataTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c00', 'A')]},
            {_type: 'row', _key: 'r1', cells: [cell('c10', 'C')]},
          ],
        },
      ])
      // The column cells cleared; the rest of the table is untouched.
      const snapshot = editor.getSnapshot()
      expect(
        value(snapshot)[0]?.rows[0]?.cells[0]?.value[0]?.children[0]?.text,
      ).toBe('')
      expect(
        value(snapshot)[0]?.rows[1]?.cells[0]?.value[0]?.children[0]?.text,
      ).toBe('')
      expect(
        value(snapshot)[0]?.rows[0]?.cells[1]?.value[0]?.children[0]?.text,
      ).toBe('B')
      expect(
        value(snapshot)[0]?.rows[1]?.cells[1]?.value[0]?.children[0]?.text,
      ).toBe('D')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })
})
