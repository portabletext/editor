import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

/**
 * Tests cursor position at decorator mark boundaries.
 *
 * Replicates the exact Gherkin scenario that fails on CI Firefox:
 * 1. Insert a block via insert.blocks (not initialValue)
 * 2. Select "bar" and toggle strong
 * 3. Put caret after "foo "
 * 4. Type "new"
 * 5. Assert cursor position
 */
describe('mark boundary cursor position', () => {
  test('cursor position is consistent after typing at decorator leading edge', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)

    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    // Use insert.blocks to set up the document (matching Gherkin step)
    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo bar baz'}],
          markDefs: [],
          style: 'normal',
        },
      ],
      placement: 'auto',
      select: 'end',
    })

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as any
      expect(block?.children?.[0]?.text).toBe('foo bar baz')
    })

    // Select "bar"
    const block = editor.getSnapshot().context.value[0] as any
    const span = block.children[0]

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 4,
        },
        focus: {
          path: [{_key: block._key}, 'children', {_key: span._key}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      const sel = editor.getSnapshot().context.selection
      expect(sel).not.toBeNull()
    })

    // Toggle strong on "bar"
    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as any
      expect(block.children.length).toBeGreaterThan(1)
    })

    // Find the "foo " span
    const updatedBlock = editor.getSnapshot().context.value[0] as any
    const fooSpan = updatedBlock.children.find((c: any) => c.text === 'foo ')
    expect(fooSpan).toBeDefined()

    // Put caret after "foo " (leading edge of decorator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: updatedBlock._key}, 'children', {_key: fooSpan._key}],
          offset: 4,
        },
        focus: {
          path: [{_key: updatedBlock._key}, 'children', {_key: fooSpan._key}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      const sel = editor.getSnapshot().context.selection
      expect(sel).not.toBeNull()
      expect(sel!.focus.offset).toBe(4)
    })

    // Type "new"
    await userEvent.keyboard('new')

    // Assert: "new" should be undecorated and cursor should be in the
    // undecorated span
    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      const selection = snapshot.context.selection
      expect(selection).not.toBeNull()

      const block = snapshot.context.value[0] as any

      // "new" should be in the "foo " span (undecorated)
      const fooNewSpan = block.children.find((c: any) => c.text === 'foo new')
      expect(fooNewSpan).toBeDefined()
      expect(fooNewSpan.marks ?? []).toEqual([])

      // Cursor should be at end of "foo new" span
      const focusChildKey = (selection!.focus.path[2] as {_key: string})._key
      expect(focusChildKey).toBe(fooNewSpan._key)
      expect(selection!.focus.offset).toBe(7)
    })
  })
})
