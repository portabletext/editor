import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorOperation} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

function getFirstSpanText(value: Array<PortableTextBlock>): string {
  const block = value[0] as PortableTextTextBlock
  const span = block.children[0] as PortableTextSpan
  return span.text
}

function createBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
  }
}

describe('event.operation', () => {
  test('Scenario: Observing operations for local edits', async () => {
    const {editor, locator} = await createTestEditor()
    const operations: Array<EditorOperation> = []

    editor.on('operation', (event) => {
      operations.push(event.operation)
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(
        operations.filter((operation) => operation.type === 'insert.text'),
      ).not.toHaveLength(0)
      expect(
        operations.filter((operation) => operation.type === 'set.selection'),
      ).not.toHaveLength(0)
    })

    editor.send({
      type: 'insert.blocks',
      blocks: [createBlock('b1', 'bar')],
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(
        operations.filter((operation) => operation.type === 'insert'),
      ).not.toHaveLength(0)
    })

    // The engine's undo bookkeeping is not part of the public operation
    // shape — not even as an untyped runtime property.
    expect(
      operations.filter((operation) => 'inverse' in operation),
    ).toHaveLength(0)
  })

  test('Scenario: Maintaining a block index map in userland', async () => {
    const {editor} = await createTestEditor({
      initialValue: [createBlock('b1', 'one'), createBlock('b2', 'two')],
    })

    const blockIndexMap = new Map<string, number>()

    function rebuildBlockIndexMap() {
      blockIndexMap.clear()
      editor.getSnapshot().context.value.forEach((block, index) => {
        blockIndexMap.set(block._key, index)
      })
    }

    function expectedEntries() {
      return editor
        .getSnapshot()
        .context.value.map((block, index) => [block._key, index])
    }

    rebuildBlockIndexMap()
    editor.on('operation', (event) => {
      if (event.operation.type !== 'set.selection') {
        rebuildBlockIndexMap()
      }
    })

    editor.send({
      type: 'insert.blocks',
      blocks: [createBlock('b3', 'three'), createBlock('b4', 'four')],
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(4)
      expect([...blockIndexMap.entries()]).toEqual(expectedEntries())
    })

    editor.send({
      type: 'delete.block',
      at: [{_key: 'b2'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(3)
      expect([...blockIndexMap.entries()]).toEqual(expectedEntries())
    })
  })

  test('Scenario: A throwing listener does not break editing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const {editor, locator} = await createTestEditor()
    const operations: Array<EditorOperation> = []

    editor.on('operation', () => {
      throw new Error('consumer bug')
    })
    editor.on('operation', (event) => {
      operations.push(event.operation)
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(getFirstSpanText(editor.getSnapshot().context.value)).toBe('foo')
      expect(
        operations.filter((operation) => operation.type === 'insert.text'),
      ).not.toHaveLength(0)
    })

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('Scenario: EventListenerPlugin receives operation events', async () => {
    const operationEvents: Array<EditorOperation> = []

    const {locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'operation') {
              operationEvents.push(event.operation)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(operationEvents).not.toHaveLength(0)
    })
  })

  test('Scenario: Operations from value sync are observed while patches are gated', async () => {
    const {editor} = await createTestEditor()
    const operations: Array<EditorOperation> = []
    const patches: Array<unknown> = []

    editor.on('operation', (event) => {
      operations.push(event.operation)
    })
    editor.on('patch', (event) => {
      patches.push(event.patch)
    })

    editor.send({
      type: 'update value',
      value: [createBlock('b1', 'synced')],
    })

    await vi.waitFor(() => {
      expect(getFirstSpanText(editor.getSnapshot().context.value)).toBe(
        'synced',
      )
      expect(operations).not.toHaveLength(0)
    })

    // `patch`/`mutation` are gated while the editor is pristine; the
    // operation stream is not.
    expect(patches).toHaveLength(0)
  })
})
