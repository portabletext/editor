import {diffMatchPatch, insert, unset, type Path} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {
  type Editor,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '../src'
import {safeStringify} from '../src/internal-utils/safe-json'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image'},
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              name: 'row',
              type: 'object',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      name: 'cell',
                      type: 'object',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}, {type: 'image'}],
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
    },
  ],
})

const containers = [
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

describe('Range Decorations spanning block objects', () => {
  test("Scenario: a highlight from 'brave' in block 1 across the image to 'new' in block 3 follows typing before, inside, and after it", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    insertText(harness.editor, point('b1', 's1', 0), 'very ')
    await harness.expectDecoratedText('brave worlda new')
    insertText(harness.editor, point('b1', 's1', 16), 'ly')
    await harness.expectDecoratedText('bravely worlda new')
    insertText(harness.editor, point('b3', 's3', 9), '!')
    await harness.expectDecoratedText('bravely worlda new')
  })

  test.each(['prop', 'registered'] as const)(
    "Scenario: a highlight from 'brave' in block 1 across the deleted image to 'new' in block 3 ($kind)",
    async (kind) => {
      const harness = await createHarness({
        value: imageValue(),
        range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
        kind,
      })

      harness.editor.send({type: 'delete.block', at: [{_key: 'image'}]})

      await harness.expectDecoratedText('brave worlda new')
    },
  )

  test("Scenario: a highlight from 'brave' in block 1 across a newly inserted image to 'new' in block 3", async () => {
    const harness = await createHarness({
      value: [
        textBlock('b1', 's1', 'hello brave world'),
        textBlock('b3', 's3', 'a new day'),
      ],
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'insert.block',
      block: {_type: 'image', _key: 'inserted-image'},
      placement: 'before',
      at: range(point('b3', 's3', 0), point('b3', 's3', 0)),
    })

    await harness.expectDecoratedText('brave worlda new')
  })

  test("Scenario: a highlight from 'brave' in block 1 across an image moved after block 3 to 'new' in block 3", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'move.block',
      at: [{_key: 'image'}],
      to: [{_key: 'b3'}],
    })

    await harness.expectDecoratedText('brave worlda new')
  })

  test.fails("Scenario: a highlight from 'brave' in block 1 to 'new' in block 3 gains a text block moved between its edges", async () => {
    // DECISION: A moved block landing between the surviving edges is inside the
    // highlight, consistent with preserving all text between those edges.
    const harness = await createHarness({
      value: [
        textBlock('b1', 's1', 'hello brave world'),
        textBlock('b3', 's3', 'a new day'),
        textBlock('b4', 's4', 'moved text'),
      ],
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'move.block',
      at: [{_key: 'b4'}],
      to: [{_key: 'b3'}],
    })

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'hello brave world',
        'moved text',
        'a new day',
      ])
    })
    await harness.expectDecoratedText('brave worldmoved texta new')
  })

  test("Scenario: a highlight from 'brave' in block 1 across the image to 'new' in block 3 shrinks after a partial selection is deleted", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'select',
      at: range(point('b1', 's1', 12), point('b3', 's3', 2)),
    })
    harness.editor.send({type: 'delete', direction: 'forward'})

    await harness.expectDecoratedText('brave new')
  })

  test("Scenario: a highlight from 'brave' in block 1 across the image to 'new' in block 3 dies when the whole highlight is deleted", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'select',
      at: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })
    harness.editor.send({type: 'delete', direction: 'forward'})

    await harness.expectDecoratedText(null)
  })

  test("Scenario: a highlight from 'brave' in block 1 across a pasted image to 'new' in block 3", async () => {
    const harness = await createHarness({
      value: [
        textBlock('b1', 's1', 'hello brave world'),
        textBlock('b3', 's3', 'a new day'),
      ],
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })
    const at = range(point('b1', 's1', 11), point('b1', 's1', 11))
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(
      'application/x-portable-text',
      safeStringify([
        textBlock('paste-b1', 'paste-s1', 'one'),
        {_type: 'image', _key: 'paste-image'},
        textBlock('paste-b2', 'paste-s2', 'two'),
      ]),
    )
    harness.editor.send({type: 'select', at})
    harness.editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: at},
    })

    await harness.expectDecoratedText('braveonetwo worlda new')
  })

  test("Scenario: a highlight from 'brave' before an image to 'new' after it survives Enter and Backspace at the image edges", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    select(harness.editor, point('b1', 's1', 17))
    harness.editor.send({type: 'insert.break'})
    await harness.expectDecoratedText('brave worlda new')
    select(harness.editor, point('b3', 's3', 0))
    harness.editor.send({type: 'delete', direction: 'backward'})
    await harness.expectDecoratedText('brave worlda new')
  })

  test("Scenario: a highlight starting at the boundary after the image and ending at 'new' in block 3", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 17), point('b3', 's3', 5)),
    })

    harness.editor.send({
      type: 'move.block',
      at: [{_key: 'image'}],
      to: [{_key: 'b1'}],
    })

    await harness.expectDecoratedText('a new')
  })
})

describe('Range Decorations inside tables', () => {
  test.each(['prop', 'registered'] as const)(
    "Scenario: a highlight from 'ell' to 'text' inside one table cell follows typing ($kind)",
    async (kind) => {
      const harness = await createHarness({
        value: tableValue(),
        range: range(
          cellPoint('r1', 'c1', 'cb1', 'cs1', 1),
          cellPoint('r1', 'c1', 'cb1', 'cs1', 9),
        ),
        kind,
      })

      insertText(harness.editor, cellPoint('r1', 'c1', 'cb1', 'cs1', 4), 'X')

      await harness.expectDecoratedText('ellX text')
    },
  )

  test("Scenario: a highlight from 'one' in cell 1 to 'two' in cell 2 of the same row", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c1', 'cb1', 'cs1', 10),
        cellPoint('r1', 'c2', 'cb2', 'cs2', 3),
      ),
    })

    insertText(harness.editor, cellPoint('r1', 'c2', 'cb2', 'cs2', 0), 'new ')

    await harness.expectDecoratedText('onenew two')
  })

  test("Scenario: a highlight from 'two' in row 1 to 'three' in row 2", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c2', 'cb2', 'cs2', 0),
        cellPoint('r2', 'c3', 'cb3', 'cs3', 5),
      ),
    })

    insertText(harness.editor, cellPoint('r2', 'c3', 'cb3', 'cs3', 5), '!')

    await harness.expectDecoratedText('twothree')
  })

  test("Scenario: a highlight from 'before' before the table to 'one' in its first cell", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        point('before', 'before-span', 0),
        cellPoint('r1', 'c1', 'cb1', 'cs1', 13),
      ),
    })

    insertText(harness.editor, cellPoint('r1', 'c1', 'cb1', 'cs1', 13), '!')

    await harness.expectDecoratedText('beforecell text one')
  })

  test("Scenario: a highlight from 'three' in the last table cell to 'after' after the table", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r2', 'c3', 'cb3', 'cs3', 0),
        point('after', 'after-span', 5),
      ),
    })

    insertText(harness.editor, point('after', 'after-span', 5), '!')

    await harness.expectDecoratedText('threeoutsideafter')
  })

  test("Scenario: a highlight from 'two' in row 1 to 'three' in row 2 survives a row inserted inside and removed outside it", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c2', 'cb2', 'cs2', 0),
        cellPoint('r2', 'c3', 'cb3', 'cs3', 5),
      ),
    })
    const row = tableRow(
      'inserted-row',
      'inserted-cell',
      'inserted-block',
      'inserted-span',
      'middle',
    )

    harness.editor.send({
      type: 'apply',
      patches: [
        insert([row], 'before', [{_key: 'table'}, 'rows', {_key: 'r2'}]),
      ],
    })
    await harness.expectDecoratedText('twomiddlethree')
    harness.editor.send({
      type: 'apply',
      patches: [unset([{_key: 'table'}, 'rows', {_key: 'outside-row'}])],
    })
    await harness.expectDecoratedText('twomiddlethree')
  })

  test("Scenario: a highlight from 'ell' to 'one' in a table cell dies when the cell text is deleted", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c1', 'cb1', 'cs1', 1),
        cellPoint('r1', 'c1', 'cb1', 'cs1', 13),
      ),
    })

    harness.editor.send({
      type: 'select',
      at: range(
        cellPoint('r1', 'c1', 'cb1', 'cs1', 0),
        cellPoint('r1', 'c1', 'cb1', 'cs1', 13),
      ),
    })
    harness.editor.send({type: 'delete', direction: 'forward'})

    await harness.expectDecoratedText(null)
  })

  test.fails("Scenario: a highlight from 'before' before the table to 'two' in a cell shrinks when the whole table is deleted", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        point('before', 'before-span', 0),
        cellPoint('r1', 'c2', 'cb2', 'cs2', 3),
      ),
    })

    harness.editor.send({type: 'delete.block', at: [{_key: 'table'}]})

    await vi.waitFor(() => {
      expect(harness.getRange()).toEqual(
        range(
          point('before', 'before-span', 0),
          point('before', 'before-span', 6),
        ),
      )
    })
    await harness.expectDecoratedText('before')
  })

  test("Scenario: a highlight from 'ell' to 'one' in a table cell survives Enter and Backspace at its edges", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c1', 'cb1', 'cs1', 1),
        cellPoint('r1', 'c1', 'cb1', 'cs1', 13),
      ),
    })

    select(harness.editor, cellPoint('r1', 'c1', 'cb1', 'cs1', 1))
    harness.editor.send({type: 'insert.break'})
    await harness.expectDecoratedText('ell text one')
    select(harness.editor, cellPoint('r1', 'c1', 'cb1', 'cs1', 0))
    harness.editor.send({type: 'delete', direction: 'backward'})
    await harness.expectDecoratedText('ell text one')
  })

  test("Scenario: a remote image deletion preserves a highlight from 'brave' to 'new'", async () => {
    const harness = await createHarness({
      value: imageValue(),
      range: range(point('b1', 's1', 6), point('b3', 's3', 5)),
    })

    remote(harness.editor, [unset([{_key: 'image'}])])

    await harness.expectDecoratedText('brave worlda new')
  })

  test("Scenario: a remote row insertion preserves a highlight from 'two' in row 1 to 'three' in row 2", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c2', 'cb2', 'cs2', 0),
        cellPoint('r2', 'c3', 'cb3', 'cs3', 5),
      ),
    })

    remote(harness.editor, [
      insert(
        [
          tableRow(
            'remote-row',
            'remote-cell',
            'remote-block',
            'remote-span',
            'remote',
          ),
        ],
        'before',
        [{_key: 'table'}, 'rows', {_key: 'r2'}],
      ),
    ])

    await harness.expectDecoratedText('tworemotethree')
  })

  test("Scenario: remote cross-cell typing preserves a highlight from 'one' in cell 1 to 'two' in cell 2", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        cellPoint('r1', 'c1', 'cb1', 'cs1', 10),
        cellPoint('r1', 'c2', 'cb2', 'cs2', 3),
      ),
    })

    remote(harness.editor, [
      diffMatchPatch('cell text one', 'cell text onXe', [
        {_key: 'table'},
        'rows',
        {_key: 'r1'},
        'cells',
        {_key: 'c1'},
        'content',
        {_key: 'cb1'},
        'children',
        {_key: 'cs1'},
        'text',
      ]),
    ])

    await harness.expectDecoratedText('onXetwo')
  })

  test.fails("Scenario: a remote table deletion shrinks a highlight from 'before' to 'two' to its surviving text", async () => {
    const harness = await createHarness({
      value: tableValue(),
      range: range(
        point('before', 'before-span', 0),
        cellPoint('r1', 'c2', 'cb2', 'cs2', 3),
      ),
    })

    remote(harness.editor, [unset([{_key: 'table'}])])

    await vi.waitFor(() => {
      expect(harness.getRange()).toEqual(
        range(
          point('before', 'before-span', 0),
          point('before', 'before-span', 6),
        ),
      )
    })
    await harness.expectDecoratedText('before')
  })
})

function textBlock(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}

function imageValue(): Array<PortableTextBlock> {
  return [
    textBlock('b1', 's1', 'hello brave world'),
    {_type: 'image', _key: 'image'},
    textBlock('b3', 's3', 'a new day'),
  ]
}

function tableValue(): Array<PortableTextBlock> {
  return [
    textBlock('before', 'before-span', 'before'),
    {
      _type: 'table',
      _key: 'table',
      rows: [
        {
          _type: 'row',
          _key: 'r1',
          cells: [
            {
              _type: 'cell',
              _key: 'c1',
              content: [textBlock('cb1', 'cs1', 'cell text one')],
            },
            {
              _type: 'cell',
              _key: 'c2',
              content: [textBlock('cb2', 'cs2', 'two')],
            },
          ],
        },
        tableRow('r2', 'c3', 'cb3', 'cs3', 'three'),
        tableRow(
          'outside-row',
          'outside-cell',
          'outside-block',
          'outside-span',
          'outside',
        ),
      ],
    },
    textBlock('after', 'after-span', 'after'),
  ]
}

function tableRow(
  rowKey: string,
  cellKey: string,
  blockKey: string,
  spanKey: string,
  text: string,
) {
  return {
    _type: 'row',
    _key: rowKey,
    cells: [
      {
        _type: 'cell',
        _key: cellKey,
        content: [textBlock(blockKey, spanKey, text)],
      },
    ],
  }
}

type TestPoint = {path: Path; offset: number}

function point(blockKey: string, spanKey: string, offset: number): TestPoint {
  return {
    path: [{_key: blockKey}, 'children' as const, {_key: spanKey}],
    offset,
  }
}

function cellPoint(
  rowKey: string,
  cellKey: string,
  blockKey: string,
  spanKey: string,
  offset: number,
): TestPoint {
  return {
    path: [
      {_key: 'table'},
      'rows' as const,
      {_key: rowKey},
      'cells' as const,
      {_key: cellKey},
      'content' as const,
      {_key: blockKey},
      'children' as const,
      {_key: spanKey},
    ],
    offset,
  }
}

function range(anchor: TestPoint, focus: TestPoint) {
  return {anchor, focus}
}

async function createHarness(args: {
  value: Array<PortableTextBlock>
  range: ReturnType<typeof range>
  kind?: 'prop' | 'registered'
}) {
  let decorations: Array<RangeDecoration> = [
    {
      component: ({children}) => (
        <span data-testid="block-object-decoration">{children}</span>
      ),
      payload: {id: 'block-object'},
      selection: args.range,
      onMoved: (details) => {
        decorations = updateDecorations(decorations, details)
      },
    },
  ]
  const result = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: args.value,
    editableProps:
      args.kind === 'registered' ? undefined : {rangeDecorations: decorations},
    children: <NodePlugin nodes={containers} />,
  })
  const registration =
    args.kind === 'registered'
      ? result.editor.registerDecorations({
          decorations: [
            {
              id: 'block-object',
              type: 'range',
              range: args.range,
              render: ({children}) => (
                <span data-testid="block-object-decoration">{children}</span>
              ),
            },
          ],
        })
      : undefined

  return {
    ...result,
    getRange: () =>
      registration?.getDecorations()[0]?.range ?? decorations[0]?.selection,
    expectDecoratedText: async (expected: string | null) => {
      if (registration === undefined) {
        await result.rerender({
          initialValue: result.editor.getSnapshot().context.value,
          editableProps: {rangeDecorations: decorations},
          children: <NodePlugin nodes={containers} />,
        })
      }
      await vi.waitFor(() => {
        const text = Array.from(
          document.querySelectorAll('[data-testid="block-object-decoration"]'),
        )
          .map((element) => element.textContent)
          .join('')
          .replaceAll('\uFEFF', '')
        expect(text === '' ? null : text).toEqual(expected)
      })
    },
  }
}

function updateDecorations(
  decorations: Array<RangeDecoration>,
  details: RangeDecorationOnMovedDetails,
) {
  return decorations.flatMap((decoration) => {
    if (
      decoration.payload?.['id'] !== details.rangeDecoration.payload?.['id']
    ) {
      return [decoration]
    }
    return details.newSelection === null
      ? []
      : [{...decoration, selection: details.newSelection}]
  })
}

function select(editor: Editor, at: TestPoint) {
  editor.send({type: 'select', at: range(at, at)})
}

function insertText(editor: Editor, at: TestPoint, text: string) {
  select(editor, at)
  editor.send({type: 'insert.text', text})
}

function remote(
  editor: Editor,
  patches: Array<
    | ReturnType<typeof unset>
    | ReturnType<typeof insert>
    | ReturnType<typeof diffMatchPatch>
  >,
) {
  editor.send({
    type: 'apply',
    patches: patches.map((patch) => ({...patch, origin: 'remote' as const})),
  })
}
