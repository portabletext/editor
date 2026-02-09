/**
 * Tests for RangeDecoration behavior during complex editor operations.
 *
 * These tests verify that RangeDecorations correctly track their target text
 * during paste, split, merge, and other multi-operation sequences.
 *
 * @see failure-scenarios artifact for detailed scenario descriptions
 */
import {getTersePt} from '@portabletext/test'
import {type ReactNode} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {type RangeDecoration, type RangeDecorationOnMovedDetails} from '../src'
import {createTestEditor} from '../src/test/vitest'

/**
 * Test component for range decorations
 */
function RangeDecorationComponent({children}: {children?: ReactNode}) {
  return <span data-testid="range-decoration">{children}</span>
}

/**
 * Helper to update decorations based on onMoved callback
 */
function updateRangeDecorations({
  rangeDecorations,
  details,
}: {
  rangeDecorations: Array<RangeDecoration>
  details: RangeDecorationOnMovedDetails
}): Array<RangeDecoration> {
  return rangeDecorations.flatMap((rangeDecoration) => {
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
  test('Scenario 1.1: Split block with decoration entirely after split point', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 12, // start of "world"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 17, // end of "world"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello there world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )

    // Split after "Hello" (offset 5)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.break'})

    // Wait for operation to complete
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(2)
    })

    // Verify document structure: "Hello" / " there world"
    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'Hello',
      ' there world',
    ])

    // Verify onMoved was called with new selection in second block
    expect(onMovedSpy).toHaveBeenCalled()
    const lastCall =
      onMovedSpy.mock.calls[onMovedSpy.mock.calls.length - 1]?.[0]
    expect(lastCall?.newSelection).not.toBeNull()

    // Re-render with updated decorations
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should still highlight "world" in second block
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )
  })

  test('Scenario 1.3: Split at exact decoration start boundary', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 6, // start of "there"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 11, // end of "there"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello there world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )

    // Split at offset 6 (exactly at decoration start)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 6,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 6,
        },
      },
    })
    editor.send({type: 'insert.break'})

    // Wait for operation to complete
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(2)
    })

    // Verify document structure: "Hello " / "there world"
    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'Hello ',
      'there world',
    ])

    // Verify onMoved was called
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render with updated decorations
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should be in second block highlighting "there"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )
  })

  // This test documents expected behavior - split through decoration should invalidate
  // Pending decision from @lead on whether to allow cross-block decorations
  test.skip('Scenario 1.2: Split block with decoration spanning split point (pending design decision)', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3, // start of "lo the"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 9, // end of "lo the"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello there world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Split at offset 5 (in the middle of the decoration "lo the")
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(2)
    })

    // Expected: onMoved called with null (decoration invalidated)
    expect(onMovedSpy).toHaveBeenCalled()
    const lastCall =
      onMovedSpy.mock.calls[onMovedSpy.mock.calls.length - 1]?.[0]
    expect(lastCall?.newSelection).toBeNull()
  })
})

describe('RangeDecorations: Block Merge Operations', () => {
  test('Scenario 2.1: Backspace merge with decoration in second block', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b2'}, 'children', {_key: 's2'}],
            offset: 0, // start of "world"
          },
          focus: {
            path: [{_key: 'b2'}, 'children', {_key: 's2'}],
            offset: 5, // end of "world"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello'}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration on "world"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )

    // Position cursor at start of "world" and backspace to merge
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          offset: 0,
        },
      },
    })
    editor.send({type: 'delete', direction: 'backward'})

    // Wait for merge
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(1)
    })

    // Verify merged: "Helloworld"
    expect(getTersePt(editor.getSnapshot().context)).toEqual(['Helloworld'])

    // onMoved should be called with new position
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should still highlight "world"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )
  })

  test('Scenario 2.2: Forward delete merge with decoration in first block', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0, // start of "Hello"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5, // end of "Hello"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello'}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration on "Hello"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )

    // Position cursor at end of "Hello" and forward delete to merge
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'delete', direction: 'forward'})

    // Wait for merge
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(1)
    })

    // Verify merged
    expect(getTersePt(editor.getSnapshot().context)).toEqual(['Helloworld'])

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should still highlight "Hello"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )
  })
})

describe('RangeDecorations: Paste Operations', () => {
  test('Scenario 3.1: Paste single line before decoration', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 6, // start of "world"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 11, // end of "world"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )

    // Position cursor at start and insert text
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
        },
      },
    })

    // Type text at beginning (simulates simple paste)
    await userEvent.type(locator, 'AAA ')

    // Wait for text insertion
    await vi.waitFor(() => {
      const context = editor.getSnapshot().context
      const terse = getTersePt(context)
      expect(terse[0]).toContain('AAA')
    })

    // onMoved should be called
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should still highlight "world" (offset shifted)
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )
  })

  test('Scenario 3.4: Paste replacing selection that includes decoration', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 6, // start of "world"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 11, // end of "world"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world!'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )

    // Select "lo wor" (offset 3-9) which overlaps the decoration
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 9,
        },
      },
    })

    // Type to replace selection
    await userEvent.type(locator, 'XXX')

    // Wait for replacement
    await vi.waitFor(() => {
      const context = editor.getSnapshot().context
      const terse = getTersePt(context)
      expect(terse[0]).toContain('XXX')
    })

    // Decoration should be invalidated (selection partially deleted)
    // Note: This verifies current behavior. The decoration may become
    // invalid or truncated depending on implementation.
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // The decoration component should no longer be rendering "world"
    // since that text was partially deleted
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .not.toHaveTextContent('world'),
    )
  })
})

describe('RangeDecorations: Collapsed (Cursor) Decorations', () => {
  test('Scenario 5.1: Insert text at collapsed decoration position', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'cursor-marker'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5, // collapsed at "Hello|world"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5,
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Helloworld'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify collapsed decoration is rendered
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    // Insert text at offset 5
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })

    await userEvent.type(locator, 'X')

    // Wait for insertion
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse[0]).toBe('HelloXworld')
    })

    // onMoved should be called - decoration position should shift
    expect(onMovedSpy).toHaveBeenCalled()

    // The decoration should still be valid (just moved)
    const lastCall =
      onMovedSpy.mock.calls[onMovedSpy.mock.calls.length - 1]?.[0]
    expect(lastCall?.newSelection).not.toBeNull()
  })
})

describe('RangeDecorations: Block Object Insertion', () => {
  test('Scenario 4.1: Insert block object before decorated text', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0, // start of "Hello"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5, // end of "Hello"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
      schemaDefinition: {
        blockObjects: [{name: 'image'}],
      },
    })

    // Verify initial decoration
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )

    // Insert block object at the beginning (before block b1)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'before',
    })

    // Wait for insertion - should have image block then text block
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value?.length).toBe(2)
      expect(value?.[0]?._type).toBe('image')
    })

    // onMoved should be called with new path (block moved from index 0 to index 1)
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
      schemaDefinition: {
        blockObjects: [{name: 'image'}],
      },
    })

    // Decoration should still highlight "Hello" (now in second block)
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )
  })

  test('Scenario 4.3: Insert block object mid-block with decoration after', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 6, // start of "world"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 11, // end of "world"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world foo'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
      schemaDefinition: {
        blockObjects: [{name: 'image'}],
      },
    })

    // Verify initial decoration on "world"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )

    // Position cursor after "Hello " and insert block object
    // This should split the block and insert the image in between
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 6,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 6,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'after',
    })

    // Wait for operation - should now be: "Hello " / {image} / "world foo"
    // or similar structure depending on implementation
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value?.length).toBeGreaterThan(1)
    })

    // onMoved should be called - decoration path likely changed
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
      schemaDefinition: {
        blockObjects: [{name: 'image'}],
      },
    })

    // Decoration should still highlight "world"
    // This may be in a new block after the image
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('world'),
    )
  })
})

describe('RangeDecorations: Undo/Redo', () => {
  test('Scenario 6.1: Undo split with decoration', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0, // start of "Hello"
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5, // end of "Hello"
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Verify initial decoration on "Hello"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )

    // Split after "Hello"
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.break'})

    // Wait for split
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(2)
    })

    // Clear spy to track undo-specific calls
    onMovedSpy.mockClear()

    // Re-render after split
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Verify decoration still on "Hello" (in first block)
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )

    // Undo the split
    editor.send({type: 'history.undo'})

    // Wait for undo
    await vi.waitFor(() => {
      const terse = getTersePt(editor.getSnapshot().context)
      expect(terse.length).toBe(1)
    })

    // onMoved should be called for undo
    expect(onMovedSpy).toHaveBeenCalled()

    // Re-render after undo
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should be back to original position highlighting "Hello"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )
  })

  test('Scenario 6.2: Redo after undo maintains decoration', async () => {
    const onMovedSpy = vi.fn()
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: RangeDecorationComponent,
        payload: {id: 'dec1'},
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 5,
          },
        },
        onMoved: (details) => {
          onMovedSpy(details)
          rangeDecorations = updateRangeDecorations({rangeDecorations, details})
        },
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello world'}],
          markDefs: [],
        },
      ],
      editableProps: {rangeDecorations},
    })

    // Split, undo, then redo
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context).length).toBe(2)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context).length).toBe(1)
    })

    // Now redo
    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context).length).toBe(2)
    })

    // Re-render
    await rerender({
      initialValue: editor.getSnapshot().context.value,
      editableProps: {rangeDecorations},
    })

    // Decoration should still be valid and highlighting "Hello"
    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('Hello'),
    )
  })
})
