import {getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {RangeDecoration, RangeDecorationOnMovedDetails} from '../src'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../test-utils/text-selection'

function updateRangeDecorations({
  rangeDecorations,
  details,
}: {
  rangeDecorations: Array<RangeDecoration>
  details: RangeDecorationOnMovedDetails
}) {
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

describe('Range decoration tracking', () => {
  test('decoration follows content when splitting before it', async () => {
    const onMoved = vi.fn()

    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        onMoved: (details) => {
          onMoved(details)
          rangeDecorations = updateRangeDecorations({
            rangeDecorations,
            details,
          })
        },
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 8,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 11,
          },
        },
        payload: {id: 'rd0'},
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [
            {_type: 'span', _key: 'a1', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations,
      },
    })

    // Verify the decoration is rendered around "baz"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('baz'),
    )

    // Place cursor after "bar" (before " baz")
    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo bar'),
    })

    // Press Enter to split
    editor.send({type: 'insert.break'})

    // Verify the document was split
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo bar',
        ' baz',
      ])
    })

    // The onMoved callback should have been called with a non-null selection
    // pointing to "baz" in the second block
    await vi.waitFor(() => {
      expect(onMoved).toHaveBeenCalled()
    })
    const movedDetails = onMoved.mock
      .calls[0]![0] as RangeDecorationOnMovedDetails
    expect(movedDetails.newSelection).not.toBeNull()

    // Re-render with updated decorations
    await rerender({
      editableProps: {
        rangeDecorations,
      },
    })

    // The decoration should still be around "baz" in the second block
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('baz'),
    )
  })

  test('decoration survives split then merge back', async () => {
    const onMoved = vi.fn()

    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        onMoved: (details) => {
          onMoved(details)
          rangeDecorations = updateRangeDecorations({
            rangeDecorations,
            details,
          })
        },
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 8,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 11,
          },
        },
        payload: {id: 'rd0'},
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [
            {_type: 'span', _key: 'a1', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations,
      },
    })

    // Verify the decoration is rendered around "baz"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('baz'),
    )

    // Split: place cursor after "bar", press Enter
    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo bar'),
    })
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo bar',
        ' baz',
      ])
    })

    // Re-render with updated decorations after split
    await rerender({
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('baz'),
    )

    // Reset onMoved tracking
    onMoved.mockClear()

    // Merge: place cursor at start of second block, press Backspace
    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, ' baz'),
    })
    editor.send({type: 'delete.backward', unit: 'character'})

    // Verify the blocks merged
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
    })

    // Re-render with updated decorations after merge
    await rerender({
      editableProps: {
        rangeDecorations,
      },
    })

    // The decoration should still be around "baz"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('baz'),
    )
  })
})
