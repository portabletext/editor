import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
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

  test('Scenario: Auto-resolved blocks arrive repaired in their own insert operation', async () => {
    const {editor} = await createTestEditor()
    const operations = collectOperations(editor)

    // A text block with no children is auto-resolved by `validateValue` at
    // sync ingress: the placeholder span is part of the inserted node
    // itself, not a separate normalization fix operation.
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
          node: {
            ...emptyBlock('b1'),
            children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
          },
        },
      ])
    })
  })

  test('Scenario: Normalization fix operations are delivered adjacent to their trigger', async () => {
    const {editor} = await createTestEditor()
    const operations = collectOperations(editor)

    // Duplicate child keys pass value validation (no dup-key check at
    // ingress) and are repaired by engine normalization, which renames the
    // second occurrence. Value sync applies in a batch, so the fix runs at
    // the batch close and is delivered after its trigger (application
    // order). The opposite, nested order for unbatched applies is pinned
    // at the unit level in `operation-channel.test.ts`; the public
    // contract is only adjacency, which is why the docs steer consumers
    // toward snapshot-seeded recompute.
    // The differing marks keep the two spans from also triggering the
    // adjacent same-mark merge, so the rename is the only fix.
    const dupBlock: PortableTextBlock = {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'dup', text: 'one', marks: []},
        {_type: 'span', _key: 'dup', text: 'two', marks: ['strong']},
      ],
    }
    editor.send({type: 'update value', value: [dupBlock]})

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
          node: dupBlock,
        },
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', 1, '_key'],
          value: 'k2',
          inverse: {
            type: 'set',
            path: [{_key: 'b1'}, 'children', 1, '_key'],
            value: 'dup',
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

  test('Scenario: A local edit reports origin `local`', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', '')],
    })
    const origins = collectOperationOrigins(editor)

    await userEvent.type(locator, 'fo')

    await vi.waitFor(() => {
      expect(origins).toEqual(['local', 'local'])
    })
  })

  test('Scenario: A remote patch reports origin `remote`', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const origins = collectOperationOrigins(editor)

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}, 'text'],
          value: 'bar',
          origin: 'remote',
        },
      ],
      snapshot: [block('b1', 'bar')],
    })

    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('bar')
      expect(origins).toEqual(['remote'])
    })
  })

  test('Scenario: Undo and redo report origin `local`', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('barfoo')
    })

    const origins = collectOperationOrigins(editor)

    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('foo')
      expect(origins).toEqual(['local', 'local', 'local'])
    })
    origins.length = 0

    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('barfoo')
      expect(origins).toEqual(['local', 'local', 'local'])
    })
  })

  test('Scenario: Remote-fallout normalization reports origin `remote`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [initialBlock],
    })
    const origins = collectOperationOrigins(editor)

    // A remote insert lands a second span with the same key as the first.
    // The engine's duplicate-key fix, unlike the same-mark-merge fix, isn't
    // gated off during remote processing, so it fires here and its `set`
    // rides the same remote batch as the triggering `insert`.
    const duplicateSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [duplicateSpan],
          origin: 'remote',
        },
      ],
      snapshot: [
        {...initialBlock, children: [...initialBlock.children, duplicateSpan]},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialBlock,
          children: [initialBlock.children[0], {...duplicateSpan, _key: 'k4'}],
        },
      ])
      expect(origins).toEqual(['remote', 'remote'])
    })
  })

  test('Scenario: Local-edit fallout normalization reports origin `local`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [initialBlock],
    })
    const origins = collectOperationOrigins(editor)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    // The `insert.text` and the same-mark-merge fix it triggers both run
    // inside the local edit, unlike the initial value sync (which is
    // wrapped as a remote change).
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialBlock,
          children: [
            {...initialBlock.children[0], text: 'foobar'},
            {...initialBlock.children[2], text: 'baz!'},
          ],
        },
      ])
      expect(origins).toEqual(['local', 'local', 'local'])
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

/**
 * Collect the `origin` of every public operation event from this point on.
 */
function collectOperationOrigins(editor: Editor): Array<'local' | 'remote'> {
  const origins: Array<'local' | 'remote'> = []
  editor.on('operation', (event) => {
    origins.push(event.origin)
  })
  return origins
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
