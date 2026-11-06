import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  type Editor,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '../src'
import {createTestEditor} from '../src/test/vitest'

function updateRangeDecorations({
  rangeDecorations,
  details,
}: {
  rangeDecorations: Array<RangeDecoration>
  details: RangeDecorationOnMovedDetails
}) {
  if (rangeDecorations.length === 0 && details.newSelection) {
    return [{...details.rangeDecoration, selection: details.newSelection}]
  }
  return rangeDecorations?.flatMap((rangeDecoration) => {
    if (
      rangeDecoration.payload?.['id'] ===
      details.rangeDecoration.payload?.['id']
    ) {
      if (!details.newSelection) {
        return []
      }

      return [
        {
          selection: details.newSelection,
          payload: rangeDecoration.payload,
          onMoved: rangeDecoration.onMoved,
          component: rangeDecoration.component,
        },
      ]
    }

    return [rangeDecoration]
  })
}

describe('RangeDecorations: Block Split Operations', () => {
  test.each([
    {
      name: 'Scenario 1.1: Split block with decoration entirely after split point',
      initialValue: [textBlock('b1', [['s1', 'Hello there world']])],
      selection: selection('b1', 's1', 12, 'b1', 's1', 17),
      splitAt: selection('b1', 's1', 5, 'b1', 's1', 5),
      expected: ['Hello', ' there world'],
      expectedDecoratedText: 'world',
    },
    {
      name: 'Scenario 1.2: Split with decoration spanning the entire line',
      initialValue: [textBlock('b1', [['s1', 'hello dolly']])],
      selection: selection('b1', 's1', 0, 'b1', 's1', 11),
      splitAt: selection('b1', 's1', 6, 'b1', 's1', 6),
      expected: ['hello ', 'dolly'],
      expectedDecoratedText: 'hello dolly',
    },
    {
      name: 'Scenario 1.3: Split at exact decoration start boundary',
      initialValue: [textBlock('b1', [['s1', 'Hello there world']])],
      selection: selection('b1', 's1', 6, 'b1', 's1', 11),
      splitAt: selection('b1', 's1', 6, 'b1', 's1', 6),
      expected: ['Hello ', 'there world'],
      expectedDecoratedText: 'there',
    },
    {
      name: 'Scenario 1.4: Split at end of first block in multi-block decoration',
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b1', 's1', 0, 'b2', 's2', 5),
      splitAt: selection('b1', 's1', 5, 'b1', 's1', 5),
      expected: ['Hello', '', 'world'],
      expectedDecoratedText: 'Helloworld',
    },
  ])('$name', async (scenario) => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: scenario.initialValue,
      selection: scenario.selection,
    })

    harness.editor.send({type: 'select', at: scenario.splitAt})
    harness.editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual(
        scenario.expected,
      )
    })

    await harness.rerender()

    await vi.waitFor(() => {
      const decoratedText = Array.from(
        document.querySelectorAll('[data-testid="split-merge-decoration"]'),
      )
        .map((element) => element.textContent)
        .join('')
        .replaceAll('\uFEFF', '')
      expect(decoratedText).toEqual(scenario.expectedDecoratedText)
    })
  })
})

describe('RangeDecorations: Block Merge Operations', () => {
  test('Scenario 2.1: Backspace merge with decoration in second block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b2', 's2', 0, 'b2', 's2', 5),
    })

    harness.editor.send({
      type: 'select',
      at: selection('b2', 's2', 0, 'b2', 's2', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'Helloworld',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('world')
  })

  test('Scenario 2.2: Forward delete merge with decoration in first block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b1', 's1', 0, 'b1', 's1', 5),
    })

    harness.editor.send({
      type: 'select',
      at: selection('b1', 's1', 5, 'b1', 's1', 5),
    })
    harness.editor.send({type: 'delete', direction: 'forward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'Helloworld',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('Hello')
  })

  test('Scenario 2.3: Backspace merge with multi-span block and decoration on second child', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'foo']]),
        textBlock('b2', [
          ['s2', 'bar '],
          ['s3', 'baz'],
        ]),
      ],
      selection: selection('b2', 's3', 0, 'b2', 's3', 3),
    })

    harness.editor.send({
      type: 'select',
      at: selection('b2', 's2', 0, 'b2', 's2', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'foobar baz',
      ])
    })
    expect(harness.getSelection()).toEqual({
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 7,
      },
      focus: {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 10,
      },
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('baz')
  })

  test('Scenario 2.4: Sequential backspace merges 3 blocks into 1, decoration on last block survives', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'foo']]),
        textBlock('b2', [['s2', 'bar']]),
        textBlock('b3', [['s3', 'baz']]),
      ],
      selection: selection('b3', 's3', 0, 'b3', 's3', 3),
    })

    harness.editor.send({
      type: 'select',
      at: selection('b3', 's3', 0, 'b3', 's3', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})
    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'foo',
        'barbaz',
      ])
    })

    const secondBlock = harness.editor.getSnapshot().context.value[1]!
    const firstSpan = (
      secondBlock as PortableTextBlock & {
        children: Array<{_key: string}>
      }
    ).children[0]!
    harness.editor.send({
      type: 'select',
      at: selection(
        secondBlock._key,
        firstSpan._key,
        0,
        secondBlock._key,
        firstSpan._key,
        0,
      ),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'foobarbaz',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('baz')
  })
})

describe('RangeDecorations: Line Break at End of Block/Decoration', () => {
  test('Line break at end preserves the decoration on the original block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [textBlock('b1', [['s1', 'Hello']])],
      selection: selection('b1', 's1', 0, 'b1', 's1', 5),
    })

    harness.editor.send({
      type: 'select',
      at: selection('b1', 's1', 5, 'b1', 's1', 5),
    })
    harness.editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'Hello',
        '',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('Hello')
  })
})

describe('RangeDecorations: Block Merge (Decoration Preservation)', () => {
  test('Backspace at start of second block should preserve decoration in first block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', ' world']]),
      ],
      selection: selection('b1', 's1', 0, 'b1', 's1', 5),
    })
    harness.editor.send({
      type: 'select',
      at: selection('b2', 's2', 0, 'b2', 's2', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'Hello world',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('Hello')
  })

  test('Delete at end of first block should preserve decoration in second block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', ' world']]),
      ],
      selection: selection('b2', 's2', 1, 'b2', 's2', 6),
    })
    harness.editor.send({
      type: 'select',
      at: selection('b1', 's1', 5, 'b1', 's1', 5),
    })
    harness.editor.send({type: 'delete', direction: 'forward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'Hello world',
      ])
    })
    await harness.rerender()
    await expect
      .element(harness.locator.getByTestId('split-merge-decoration'))
      .toHaveTextContent('world')
  })
})

describe('RangeDecorations: Split then Merge (cross-block)', () => {
  test('Decoration spanning 3 blocks survives split-then-merge of middle block', async () => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: [
        textBlock('b1', [['s1', 'First block']]),
        textBlock('b2', [['s2', 'Middle block content']]),
        textBlock('b3', [['s3', 'Third block']]),
      ],
      selection: selection('b1', 's1', 3, 'b3', 's3', 5),
    })
    harness.editor.send({
      type: 'select',
      at: selection('b2', 's2', 7, 'b2', 's2', 7),
    })
    harness.editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'First block',
        'Middle ',
        'block content',
        'Third block',
      ])
    })

    const splitBlock = harness.editor.getSnapshot().context.value[2] as {
      _key: string
      children: Array<{_key: string}>
    }
    harness.editor.send({
      type: 'select',
      at: selection(
        splitBlock._key,
        splitBlock.children[0]!._key,
        0,
        splitBlock._key,
        splitBlock.children[0]!._key,
        0,
      ),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual([
        'First block',
        'Middle block content',
        'Third block',
      ])
    })
    await harness.rerender()
    const decorations = await harness.locator
      .getByTestId('split-merge-decoration')
      .all()
    expect(decorations.length).toEqual(3)
  })
})

describe('RangeDecorations: Overlapping Decorations', () => {
  test('Split inside overlap fires onMoved on both decorations', async () => {
    const movedA = vi.fn()
    const movedB = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: ({children}) => <span>{children}</span>,
        payload: {id: 'a'},
        selection: selection('b1', 's1', 3, 'b1', 's1', 11),
        onMoved: (details) => {
          movedA(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
      {
        component: ({children}) => <span>{children}</span>,
        payload: {id: 'b'},
        selection: selection('b1', 's1', 6, 'b1', 's1', 9),
        onMoved: (details) => {
          movedB(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]
    const {editor} = await createTestEditor({
      initialValue: [textBlock('b1', [['s1', 'Hello world end']])],
      editableProps: {rangeDecorations},
    })

    editor.send({
      type: 'select',
      at: selection('b1', 's1', 7, 'b1', 's1', 7),
    })
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'Hello w',
        'orld end',
      ])
    })
    expect(movedA.mock.calls.at(-1)?.[0].newSelection).not.toEqual(null)
    expect(movedB.mock.calls.at(-1)?.[0].newSelection).not.toEqual(null)
  })
})

describe('RangeDecorations: Undo and Redo of Split and Merge', () => {
  test.each([
    {
      name: 'split with decoration after the split point',
      initialValue: [textBlock('b1', [['s1', 'Hello there world']])],
      selection: selection('b1', 's1', 12, 'b1', 's1', 17),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 5),
      editedValue: ['Hello', ' there world'],
      editedSelection: selection('k2', 's1', 7, 'k2', 's1', 12),
      undoneSelection: selection('b1', 's1', 12, 'b1', 's1', 17),
    },
    {
      name: 'split inside the decoration',
      initialValue: [textBlock('b1', [['s1', 'hello dolly']])],
      selection: selection('b1', 's1', 0, 'b1', 's1', 11),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 6),
      editedValue: ['hello ', 'dolly'],
      editedSelection: selection('b1', 's1', 0, 'k2', 's1', 5),
      undoneSelection: selection('b1', 's1', 0, 'b1', 's1', 11),
    },
    {
      name: 'split at the decoration start',
      initialValue: [textBlock('b1', [['s1', 'Hello there world']])],
      selection: selection('b1', 's1', 6, 'b1', 's1', 11),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 6),
      editedValue: ['Hello ', 'there world'],
      editedSelection: selection('k2', 's1', 0, 'k2', 's1', 5),
      undoneSelection: selection('b1', 's1', 6, 'b1', 's1', 11),
    },
    {
      name: 'split at the decoration end',
      initialValue: [textBlock('b1', [['s1', 'Hello there world']])],
      selection: selection('b1', 's1', 0, 'b1', 's1', 5),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 5),
      editedValue: ['Hello', ' there world'],
      editedSelection: selection('b1', 's1', 0, 'b1', 's1', 5),
      undoneSelection: selection('b1', 's1', 0, 'b1', 's1', 5),
    },
    {
      name: 'split inside a multi-block decoration',
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b1', 's1', 0, 'b2', 's2', 5),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 3),
      editedValue: ['Hel', 'lo', 'world'],
      editedSelection: selection('b1', 's1', 0, 'b2', 's2', 5),
      undoneSelection: selection('b1', 's1', 0, 'b2', 's2', 5),
    },
    {
      name: 'split before a decoration spanning marked spans',
      initialValue: [
        textBlock('b1', [
          ['s1', 'foo '],
          ['s2', 'bar', ['strong']],
          ['s3', ' baz'],
        ]),
      ],
      selection: selection('b1', 's2', 1, 'b1', 's3', 2),
      edit: (editor: Editor) => splitBlock(editor, 'b1', 's1', 2),
      editedValue: ['fo', 'o ,bar, baz'],
      editedSelection: selection('k2', 's2', 1, 'k2', 's3', 2),
      undoneSelection: selection('b1', 's2', 1, 'b1', 's3', 2),
    },
    {
      // known gap: insert-first undo after a merge (B5 dropped)
      name: 'backspace merge with decoration in the second block',
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b2', 's2', 0, 'b2', 's2', 5),
      edit: (editor: Editor) => deleteAt(editor, 'b2', 's2', 0, 'backward'),
      editedValue: ['Helloworld'],
      editedSelection: selection('b1', 's1', 5, 'b1', 's1', 10),
      undoneSelection: selection('b2', 's2', 0, 'b2', 's2', 5),
      losesSelectionAfterUndo: true,
    },
    {
      // known gap: insert-first undo after a merge (B5 dropped)
      name: 'forward delete merge with decoration in the second block',
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b2', 's2', 0, 'b2', 's2', 5),
      edit: (editor: Editor) => deleteAt(editor, 'b1', 's1', 5, 'forward'),
      editedValue: ['Helloworld'],
      editedSelection: selection('b1', 's1', 5, 'b1', 's1', 10),
      undoneSelection: selection('b2', 's2', 0, 'b2', 's2', 5),
      losesSelectionAfterUndo: true,
    },
    {
      name: 'backspace merge with decoration across the block boundary',
      initialValue: [
        textBlock('b1', [['s1', 'Hello']]),
        textBlock('b2', [['s2', 'world']]),
      ],
      selection: selection('b1', 's1', 2, 'b2', 's2', 3),
      edit: (editor: Editor) => deleteAt(editor, 'b2', 's2', 0, 'backward'),
      editedValue: ['Helloworld'],
      editedSelection: selection('b1', 's1', 2, 'b1', 's1', 8),
      // known gap: insert-first undo after a merge (B5 dropped)
      undoneSelection: selection('b1', 's1', 2, 'b1', 's1', 5),
      redoneSelection: selection('b1', 's1', 2, 'b1', 's1', 5),
    },
    {
      name: 'backspace merge with decoration on a marked second child',
      initialValue: [
        textBlock('b1', [['s1', 'foo']]),
        textBlock('b2', [
          ['s2', 'bar '],
          ['s3', 'baz', ['strong']],
        ]),
      ],
      selection: selection('b2', 's3', 0, 'b2', 's3', 3),
      edit: (editor: Editor) => deleteAt(editor, 'b2', 's2', 0, 'backward'),
      editedValue: ['foobar ,baz'],
      editedSelection: selection('b1', 's1', 7, 'b1', 's3', 3),
      undoneSelection: selection('b2', 's2', 4, 'b2', 's3', 3),
    },
  ])('$name', async (scenario) => {
    const harness = await createMovingRangeDecorationHarness({
      initialValue: scenario.initialValue,
      selection: scenario.selection,
      schemaDefinition: {decorators: [{name: 'strong'}]},
    })
    const initialTersePt = getTersePt(harness.editor.getSnapshot().context)

    await userEvent.click(harness.locator)
    scenario.edit(harness.editor)

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual(
        scenario.editedValue,
      )
      expect(harness.getSelection()).toEqual(scenario.editedSelection)
    })

    harness.editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual(
        initialTersePt,
      )
      expect(harness.getSelection()).toEqual(
        'losesSelectionAfterUndo' in scenario
          ? undefined
          : scenario.undoneSelection,
      )
    })

    harness.editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual(
        scenario.editedValue,
      )
      expect(harness.getSelection()).toEqual(
        'losesSelectionAfterUndo' in scenario
          ? undefined
          : 'redoneSelection' in scenario
            ? scenario.redoneSelection
            : scenario.editedSelection,
      )
    })

    harness.editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(harness.editor.getSnapshot().context)).toEqual(
        initialTersePt,
      )
      expect(harness.getSelection()).toEqual(
        'losesSelectionAfterUndo' in scenario
          ? undefined
          : scenario.undoneSelection,
      )
    })
  })
})

function textBlock(
  blockKey: string,
  spans: Array<[key: string, text: string, marks?: Array<string>]>,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: spans.map(([key, text, marks]) => ({
      _type: 'span',
      _key: key,
      text,
      marks: marks ?? [],
    })),
    markDefs: [],
  }
}

function selection(
  anchorBlockKey: string,
  anchorSpanKey: string,
  anchorOffset: number,
  focusBlockKey: string,
  focusSpanKey: string,
  focusOffset: number,
) {
  return {
    anchor: {
      path: [
        {_key: anchorBlockKey},
        'children' as const,
        {_key: anchorSpanKey},
      ],
      offset: anchorOffset,
    },
    focus: {
      path: [{_key: focusBlockKey}, 'children' as const, {_key: focusSpanKey}],
      offset: focusOffset,
    },
  }
}

async function createMovingRangeDecorationHarness(args: {
  initialValue: Array<PortableTextBlock>
  selection: ReturnType<typeof selection>
  schemaDefinition?: NonNullable<
    Parameters<typeof createTestEditor>[0]
  >['schemaDefinition']
}) {
  let rangeDecorations: Array<RangeDecoration> = [
    {
      component: ({children}) => (
        <span data-testid="split-merge-decoration">{children}</span>
      ),
      payload: {id: 'split-merge'},
      selection: args.selection,
      onMoved: (details) => {
        rangeDecorations = updateRangeDecorations({rangeDecorations, details})
      },
    },
  ]
  const result = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: args.initialValue,
    editableProps: {rangeDecorations},
    schemaDefinition: args.schemaDefinition,
  })

  return {
    ...result,
    getSelection: () => rangeDecorations[0]?.selection,
    rerender: () =>
      result.rerender({
        initialValue: result.editor.getSnapshot().context.value,
        editableProps: {rangeDecorations},
      }),
  }
}

function splitBlock(
  editor: Editor,
  blockKey: string,
  spanKey: string,
  offset: number,
) {
  editor.send({
    type: 'select',
    at: selection(blockKey, spanKey, offset, blockKey, spanKey, offset),
  })
  editor.send({type: 'insert.break'})
}

function deleteAt(
  editor: Editor,
  blockKey: string,
  spanKey: string,
  offset: number,
  direction: 'backward' | 'forward',
) {
  editor.send({
    type: 'select',
    at: selection(blockKey, spanKey, offset, blockKey, spanKey, offset),
  })
  editor.send({type: 'delete', direction})
}
