import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Editor, Operation} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.operation', () => {
  test('Scenario: Typing emits `insert.text`, never `set.selection`', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', '')],
    })
    const operations = collectOperations(editor)

    await userEvent.type(locator, 'foo')

    // One operation per typed character; the selection moved throughout,
    // but `set.selection` is not part of the public stream.
    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 0,
          text: 'f',
        },
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 1,
          text: 'o',
        },
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 2,
          text: 'o',
        },
      ])
    })
  })

  test('Scenario: Inserting a block emits `insert` with an `inverse`', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'one')],
    })
    const operations = collectOperations(editor)

    editor.send({
      type: 'insert.blocks',
      blocks: [block('b2', 'two')],
      placement: 'after',
    })

    // The `path` anchors at the sibling the block is inserted after; the
    // `inverse` targets the inserted block itself and is what makes the
    // operation reversible for consumers: an `unset`'s inverse is the only
    // way to learn what was removed.
    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          node: block('b2', 'two'),
          inverse: {type: 'unset', path: [{_key: 'b2'}]},
        },
      ])
    })
  })

  test('Scenario: Operations from value sync are observed while patches are gated', async () => {
    const {editor} = await createTestEditor()
    const operations = collectOperations(editor)
    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    editor.send({type: 'update value', value: [block('b1', 'synced')]})

    // Value sync replaces the empty editor's seed block, inserting at an
    // index path (there is no sibling to anchor by key). Remote-applied
    // operations don't need to be reversible, so the engine doesn't
    // populate `inverse` for them.
    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: block('b1', 'synced'),
        },
      ])
    })

    // `patch`/`mutation` are gated while the editor is pristine; the
    // operation stream is not.
    expect(patches).toEqual([])
  })

  test('Scenario: Normalization fix operations are delivered adjacent to their trigger', async () => {
    const {editor} = await createTestEditor()
    const operations = collectOperations(editor)

    // A text block with no children triggers a normalization fix that
    // inserts a placeholder span. Value sync applies in a batch, so the fix
    // runs at the batch close and is delivered after its trigger
    // (application order). The opposite, nested order for unbatched applies
    // is pinned at the unit level in `operation-channel.test.ts`; the
    // public contract is only adjacency, which is why the docs steer
    // consumers toward snapshot-seeded recompute.
    editor.send({type: 'update value', value: [emptyBlock('b1')]})

    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: emptyBlock('b1'),
        },
        {
          type: 'insert',
          path: [{_key: 'b1'}, 'children', 0],
          position: 'before',
          node: {_type: 'span', _key: 'k3', text: '', marks: []},
          inverse: {
            type: 'unset',
            path: [{_key: 'b1'}, 'children', {_key: 'k3'}],
          },
        },
      ])
    })
  })

  test('Scenario: Undo and redo emit the operations they apply', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('barfoo')
    })

    const operations = collectOperations(editor)
    const spanPath = [{_key: 'b1'}, 'children', {_key: 'b1-span'}]

    editor.send({type: 'history.undo'})

    // The undo applies inverse operations, observed on the stream like any
    // other change: each typed character is removed again, last first.
    await vi.waitFor(() => {
      expect(operations).toEqual([
        {type: 'remove.text', path: spanPath, offset: 2, text: 'r'},
        {type: 'remove.text', path: spanPath, offset: 1, text: 'a'},
        {type: 'remove.text', path: spanPath, offset: 0, text: 'b'},
      ])
    })
    operations.length = 0

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(operations).toEqual([
        {type: 'insert.text', path: spanPath, offset: 0, text: 'b'},
        {type: 'insert.text', path: spanPath, offset: 1, text: 'a'},
        {type: 'insert.text', path: spanPath, offset: 2, text: 'r'},
      ])
    })
  })

  test('Scenario: Maintaining a block index map in userland', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'one'), block('b2', 'two')],
    })
    const blockIndexMap = new Map<string, number>()
    function rebuild() {
      blockIndexMap.clear()
      editor.getSnapshot().context.value.forEach((valueBlock, index) => {
        blockIndexMap.set(valueBlock._key, index)
      })
    }
    rebuild()
    editor.on('operation', rebuild)

    editor.send({
      type: 'insert.blocks',
      blocks: [block('b3', 'three')],
      placement: 'after',
    })
    await vi.waitFor(() => {
      expect([...blockIndexMap.entries()]).toEqual([
        ['b1', 0],
        ['b2', 1],
        ['b3', 2],
      ])
    })

    editor.send({type: 'delete.block', at: [{_key: 'b2'}]})
    await vi.waitFor(() => {
      expect([...blockIndexMap.entries()]).toEqual([
        ['b1', 0],
        ['b3', 1],
      ])
    })
  })

  test('Scenario: A throwing listener does not break editing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', '')],
    })
    editor.on('operation', () => {
      throw new Error('consumer bug')
    })
    const operations = collectOperations(editor)

    await userEvent.type(locator, 'fx')

    // The throwing listener neither breaks the edit nor delivery to the
    // listener subscribed after it.
    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('fx')
      expect(operations).toEqual([
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 0,
          text: 'f',
        },
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 1,
          text: 'x',
        },
      ])
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('Scenario: EventListenerPlugin receives operation events', async () => {
    const operations: Array<Operation> = []
    const {locator} = await createTestEditor({
      initialValue: [block('b1', '')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'operation') {
              operations.push(event.operation)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    // The plugin subscribes at mount, so it observes the initial value sync
    // as well as the local edit.
    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: block('b1', ''),
        },
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 0,
          text: 'a',
        },
      ])
    })
  })
})

/**
 * Collect every public operation the editor emits from this point on.
 */
function collectOperations(editor: Editor): Array<Operation> {
  const operations: Array<Operation> = []
  editor.on('operation', (event) => {
    operations.push(event.operation)
  })
  return operations
}

function block(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
  }
}

function emptyBlock(key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [],
  }
}

function firstSpanText(editor: Editor): string {
  const firstBlock = editor.getSnapshot().context.value[0] as
    | PortableTextTextBlock
    | undefined
  const span = firstBlock?.children[0] as PortableTextSpan | undefined
  return span?.text ?? ''
}
