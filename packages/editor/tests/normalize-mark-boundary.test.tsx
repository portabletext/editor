import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

/**
 * Replicates the exact Gherkin execution order:
 * 1. Create editor (Given one editor)
 * 2. Insert blocks (Given the editor state)
 * 3. Focus editor (When the editor is focused)
 * 4. Select text, toggle decorator, place caret, type
 * 5. Assert cursor position
 *
 * The key difference from the previous test: focus happens AFTER
 * insert.blocks, matching the Gherkin step order.
 */
describe('mark boundary cursor position (Gherkin order)', () => {
  test('leading edge: type "new" after "foo " with "bar" decorated', async () => {
    const keyGenerator = createTestKeyGenerator()

    // Step 1: Given one editor (no click yet)
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    // Step 2: Given the editor state "B: foo bar baz|"
    // (insert.blocks before focus, matching Gherkin order)
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

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

    // Step 3: When the editor is focused (AFTER insert.blocks)
    await userEvent.click(locator)

    // Step 4: "bar" is selected
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

    // "strong" is toggled
    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as any
      expect(block.children.length).toBeGreaterThan(1)
    })

    // the caret is put after "foo "
    const updatedBlock = editor.getSnapshot().context.value[0] as any
    const fooSpan = updatedBlock.children.find((c: any) => c.text === 'foo ')
    expect(fooSpan).toBeDefined()

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

    // "new" is typed
    await userEvent.keyboard('new')

    // Step 5: Assert cursor position
    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      const selection = snapshot.context.selection
      expect(selection).not.toBeNull()

      const block = snapshot.context.value[0] as any

      // "new" should be undecorated
      const fooNewSpan = block.children.find((c: any) => c.text === 'foo new')
      expect(fooNewSpan).toBeDefined()
      expect(fooNewSpan.marks ?? []).toEqual([])

      // Cursor should be at end of "foo new" span (outside decorator)
      const focusChildKey = (selection!.focus.path[2] as {_key: string})._key
      expect(focusChildKey).toBe(fooNewSpan._key)
      expect(selection!.focus.offset).toBe(7)
    })
  })

  test('trailing edge: type "new" before " baz" with "bar" decorated', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

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

    await userEvent.click(locator)

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

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as any
      expect(block.children.length).toBeGreaterThan(1)
    })

    // the caret is put before " baz" (trailing edge of decorator)
    const updatedBlock = editor.getSnapshot().context.value[0] as any
    const bazSpan = updatedBlock.children.find((c: any) => c.text === ' baz')
    expect(bazSpan).toBeDefined()

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: updatedBlock._key}, 'children', {_key: bazSpan._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: updatedBlock._key}, 'children', {_key: bazSpan._key}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      const sel = editor.getSnapshot().context.selection
      expect(sel).not.toBeNull()
    })

    // "new" is typed
    await userEvent.keyboard('new')

    // Assert: "new" should be decorated (typed at trailing edge continues decorator)
    // and cursor should be outside the decorator
    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      const selection = snapshot.context.selection
      expect(selection).not.toBeNull()

      const block = snapshot.context.value[0] as any

      // "barnew" should have strong mark
      const barNewSpan = block.children.find((c: any) => c.text === 'barnew')
      expect(barNewSpan).toBeDefined()
      expect(barNewSpan.marks).toEqual(['strong'])

      // Cursor should be at offset 0 of " baz" span (outside decorator)
      const focusChildKey = (selection!.focus.path[2] as {_key: string})._key
      expect(focusChildKey).toBe(bazSpan._key)
      expect(selection!.focus.offset).toBe(0)
    })
  })
})
