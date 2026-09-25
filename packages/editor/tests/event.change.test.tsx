import {
  diffMatchPatch,
  insert,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  type ChangeEvent,
  type Editor,
  type EditorEmittedEvent,
  type MutationEvent,
} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {safeParse, safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

// Not `ControlOrMeta`: `userEvent` resolves that from the host OS while the
// shortcut guard resolves the platform from the user agent (see
// `select-all.test.tsx`).
const selectAllChord = IS_MAC ? '{Meta>}a{/Meta}' : '{Control>}a{/Control}'

describe('event.change', () => {
  test("Scenario: Local typing produces a `change` event adjacent to the flush's `mutation`", async () => {
    const events: Array<EditorEmittedEvent> = []
    const {locator} = await createTestEditor({
      initialValue: [block('b1', '')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'mutation')).toBe(true)
    })

    const mutationIndex = events.findIndex((event) => event.type === 'mutation')

    // The `change` event is the very next event after its `mutation`: same
    // flush, no event slipped in between.
    expect(events[mutationIndex + 1]).toEqual({
      type: 'change',
      operations: [
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
      ],
      origin: 'local',
    })
  })

  test("Scenario: Local typing across two flushes reports each flush's own operations, never a cumulative total", async () => {
    const changes: Array<ChangeEvent> = []
    const {locator} = await createTestEditor({
      initialValue: [block('b1', '')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type !== 'change' || event.origin !== 'local') {
              return
            }
            // Cloned at receipt: a consumer holding onto `changes` must see
            // what was reported at the time, not a live array the engine
            // keeps mutating after this listener returns.
            changes.push(safeParse(safeStringify(event)) as ChangeEvent)
          }}
        />
      ),
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(changes).toHaveLength(1)
    })

    await userEvent.type(locator, 'o')

    await vi.waitFor(() => {
      expect(changes).toHaveLength(2)
    })

    const spanPath = [{_key: 'b1'}, 'children', {_key: 'b1-span'}]
    expect(changes).toEqual([
      {
        type: 'change',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'f'},
        ],
        origin: 'local',
      },
      {
        type: 'change',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 1, text: 'o'},
        ],
        origin: 'local',
      },
    ])
  })

  test("Scenario: The sync machine's auto-resolution patches produce a `mutation` with no matching local bulk, and emit no `change`", async () => {
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    // A second `update value` with a real content change (`foo` -> `foo!`)
    // and an orphaned `markDefs` entry (unused by any span mark): the sync
    // machine's validation auto-resolves the orphan by sending its own
    // `patch` (sync-machine.ts's `Resolve validations that can be resolved
    // automatically` branch), outside `withoutPatching`'s bracket and with
    // no local operation ever recorded for it.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b1',
          style: 'normal',
          markDefs: [{_type: 'link', _key: 'orphan', href: 'x'}],
          children: [{_type: 'span', _key: 'b1-span', text: 'foo!', marks: []}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'mutation')).toBe(true)
    })

    expect(events).toEqual(
      expect.arrayContaining([
        {
          type: 'mutation',
          patches: [
            {type: 'unset', path: [{_key: 'b1'}, 'markDefs', {_key: 'orphan'}]},
          ],
          value: expect.anything(),
        },
      ]),
    )

    // The auto-resolution `mutation` carries no local operations, so it
    // must report no `change`: `origin: 'local'` never appears here.
    expect(
      events.some(
        (event) => event.type === 'change' && event.origin === 'local',
      ),
    ).toBe(false)
  })

  test('Scenario: A retired local bulk is not re-reported when a later, unrelated auto-resolution mutation flushes', async () => {
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', '')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(
        events.some(
          (event) => event.type === 'change' && event.origin === 'local',
        ),
      ).toBe(true)
    })

    const localChangesAfterTyping = events.filter(
      (event) => event.type === 'change' && event.origin === 'local',
    )

    // A second `update value` with an orphaned `markDefs` entry, well
    // after typing's own flush: the auto-resolution mutation that follows
    // must not re-report `f`'s operations.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b1',
          style: 'normal',
          markDefs: [{_type: 'link', _key: 'orphan', href: 'x'}],
          children: [{_type: 'span', _key: 'b1-span', text: 'f', marks: []}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        events.some(
          (event) =>
            event.type === 'mutation' &&
            event.patches.some((patch) => patch.path.includes('markDefs')),
        ),
      ).toBe(true)
    })

    expect(
      events.filter(
        (event) => event.type === 'change' && event.origin === 'local',
      ),
    ).toEqual(localChangesAfterTyping)
  })

  test('Scenario: Clearing the editor and typing again reports only content operations on `change`, while `mutation` carries the structural bookkeeping', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)
    const mutations: Array<MutationEvent> = []
    editor.on('mutation', (event) => {
      mutations.push(event)
    })

    const spanPath = [{_key: 'b1'}, 'children', {_key: 'b1-span'}]

    await userEvent.click(locator)
    await userEvent.keyboard(selectAllChord)
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(mutations).toHaveLength(1)
    })

    // Emptying the last block to nothing collapses the whole document:
    // the outbox reports it as `unset([])`, in the same flush as the
    // text removal, while the ledger reports only the text removal.
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            ...diffMatchPatch('foo', '', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset([]), origin: 'local'},
        ],
        value: expect.anything(),
      },
    ])

    expect(changes).toEqual([
      {
        type: 'change',
        operations: [
          {type: 'remove.text', path: spanPath, offset: 0, text: 'foo'},
        ],
        origin: 'local',
      },
    ])

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(mutations).toHaveLength(2)
    })

    // Typing into the emptied editor re-synthesizes the document: the
    // outbox replays the placeholder block that was living in memory all
    // along (same `b1`/`b1-span` keys, never regenerated) via its own
    // `setIfMissing`/`insert` bookkeeping patches. None of that reaches
    // the ledger: the `change` carries only the typed character.
    expect(mutations).toEqual([
      mutations[0],
      {
        type: 'mutation',
        patches: [
          {...setIfMissing([], []), origin: 'local'},
          {
            ...insert([block('b1', '')], 'before', [0]),
            origin: 'local',
          },
          {
            ...diffMatchPatch('', 'f', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
        value: expect.anything(),
      },
    ])

    expect(changes).toEqual([
      changes[0],
      {
        type: 'change',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'f'},
        ],
        origin: 'local',
      },
    ])

    // Every `change` bulk paired with its own `mutation`: neither channel
    // dropped or coalesced a burst the other kept.
    expect(changes).toHaveLength(mutations.length)
  })

  test('Scenario: A local bulk reusing an id still pending from an earlier bulk is not dropped', async () => {
    // Two primitive `insert`s carry the default `undefined` id; a
    // `decorator.toggle` between them opens a distinct one. All three land
    // in one flush, and every `mutation` must keep its own `change` with
    // its own operations despite the id reuse.
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)
    const mutations: Array<MutationEvent> = []
    editor.on('mutation', (event) => {
      mutations.push(event)
    })

    const insertAfterB1 = (blockKey: string, spanKey: string, text: string) =>
      editor.send({
        type: 'insert',
        at: [{_key: 'b1'}],
        value: {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text, marks: []}],
        },
        position: 'after',
      })

    insertAfterB1('b2', 'b2-span', 'one')
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          offset: 0,
        },
        focus: {path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}], offset: 3},
      },
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    insertAfterB1('b3', 'b3-span', 'two')

    await vi.waitFor(() => {
      expect(mutations).toHaveLength(3)
    })

    expect(changes).toEqual([
      {
        type: 'change',
        operations: [
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'b2-span', text: 'one', marks: []},
              ],
            },
            inverse: {type: 'unset', path: [{_key: 'b2'}]},
          },
        ],
        origin: 'local',
      },
      {
        type: 'change',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}, 'marks'],
            value: ['strong'],
            inverse: {
              type: 'set',
              path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}, 'marks'],
              value: [],
            },
          },
        ],
        origin: 'local',
      },
      {
        type: 'change',
        operations: [
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b3',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'b3-span', text: 'two', marks: []},
              ],
            },
            inverse: {type: 'unset', path: [{_key: 'b3'}]},
          },
        ],
        origin: 'local',
      },
    ])
  })

  test('Scenario: A normalization repair triggered by a remote patch is reported only in the remote `change`', async () => {
    // The fed patch inserts a span with no `_key`: `normalize` repairs it
    // by setting one (`engine/core/normalize-node.ts`'s "Set missing key on
    // node" rule, which runs for remote content too). The repair operation
    // applies with `isPatching` already restored (its own `withoutPatching`
    // bracket, nested inside `withRemoteChanges`'s, has closed) but still
    // inside the remote bracket: it must join only that bracket's `change`,
    // never a second, local one.
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)
    const mutations: Array<MutationEvent> = []
    editor.on('mutation', (event) => {
      mutations.push(event)
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
          position: 'after',
          items: [{_type: 'span', text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    const repairPath = [{_key: 'b1'}, 'children', 1, '_key']

    // The repair's own outgoing patch still reaches the outbox: waiting for
    // its `mutation` proves the flush that would carry a spurious local
    // `change` (the bug) has already happened by the time the assertion
    // below runs.
    await vi.waitFor(() => {
      expect(mutations).toEqual([
        {
          type: 'mutation',
          patches: [
            {type: 'set', path: repairPath, value: 'k2', origin: 'local'},
          ],
          value: expect.anything(),
        },
      ])
    })

    expect(changes).toEqual([
      {
        type: 'change',
        operations: [
          {
            type: 'insert',
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            position: 'after',
            node: {_type: 'span', text: 'bar', marks: []},
          },
          {
            type: 'set',
            path: repairPath,
            value: 'k2',
            inverse: {type: 'unset', path: repairPath},
          },
        ],
        origin: 'remote',
      },
    ])
  })

  test('Scenario: A remote patch that empties the document reports only the removal, never the placeholder insert', async () => {
    // Emptying the document runs `normalizeNode`'s empty-editor branch,
    // which inserts the placeholder block still inside `withRemoteChanges`'s
    // bracket. The placeholder never lived in the stored document, so the
    // remote `change` bulk must carry only the operation that removed the
    // real content.
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({
      type: 'patches',
      patches: [{type: 'unset', path: [{_key: 'b1'}], origin: 'remote'}],
      snapshot: [],
    })

    await vi.waitFor(() => {
      expect(changes).toEqual([
        {
          type: 'change',
          operations: [{type: 'unset', path: [{_key: 'b1'}]}],
          origin: 'remote',
        },
      ])
    })
  })

  test('Scenario: Remote fed patches produce one `change` event with origin `remote`', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)

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
      expect(changes).toEqual([
        {
          type: 'change',
          operations: [
            {
              type: 'set',
              path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}, 'text'],
              value: 'bar',
            },
          ],
          origin: 'remote',
        },
      ])
    })
  })

  test('Scenario: `update value` with a changed value produces a `change` event with the applied, non-empty operations', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)

    // No patch is fed here: the sync machine invents the operations that
    // turn `foo` into `bar`, pinning that `change` carries what was
    // applied, not what was received (there is nothing received).
    editor.send({
      type: 'update value',
      value: [block('b1', 'bar')],
    })

    await vi.waitFor(() => {
      expect(changes).toEqual([
        {
          type: 'change',
          operations: reconciliationOperations('b1', 'foo', 'bar'),
          origin: 'remote',
        },
      ])
    })
  })

  test('Scenario: `update value` changing two blocks emits one `change` event per block, in order', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo'), block('b2', 'baz')],
    })
    const changes = collectChanges(editor)

    editor.send({
      type: 'update value',
      value: [block('b1', 'foo!'), block('b2', 'baz!')],
    })

    await vi.waitFor(() => {
      expect(changes).toEqual([
        {
          type: 'change',
          operations: reconciliationOperations('b1', 'foo', 'foo!'),
          origin: 'remote',
        },
        {
          type: 'change',
          operations: reconciliationOperations('b2', 'baz', 'baz!'),
          origin: 'remote',
        },
      ])
    })
  })

  test('Scenario: `update value` with an identical value emits no `change` event', async () => {
    const {editor} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({
      type: 'update value',
      value: [block('b1', 'foo')],
    })
    editor.send({
      type: 'update value',
      value: [block('b1', 'bar')],
    })

    // The identical update is proven silent by the next real update still
    // landing exactly once: a spurious `change` from the identical update
    // would show up here as a second event.
    await vi.waitFor(() => {
      expect(changes).toEqual([
        {
          type: 'change',
          operations: reconciliationOperations('b1', 'foo', 'bar'),
          origin: 'remote',
        },
      ])
    })
  })

  test('Scenario: Undo after local typing produces a `change` event with origin `local`', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [block('b1', 'foo')],
    })
    const mutations: Array<unknown> = []
    editor.on('mutation', (event) => {
      mutations.push(event)
    })

    await userEvent.type(locator, 'bar')
    // Waiting for the typing's own `mutation` flush first keeps it from
    // sharing an undo step (and thus one `change` bulk) with the undo
    // that follows.
    await vi.waitFor(() => {
      expect(mutations.length).toBeGreaterThan(0)
      expect(firstSpanText(editor)).toBe('barfoo')
    })

    const changes = collectChanges(editor)

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(firstSpanText(editor)).toBe('foo')
    })

    const spanPath = [{_key: 'b1'}, 'children', {_key: 'b1-span'}]
    await vi.waitFor(() => {
      expect(changes).toEqual([
        {
          type: 'change',
          operations: [
            {type: 'remove.text', path: spanPath, offset: 2, text: 'r'},
            {type: 'remove.text', path: spanPath, offset: 1, text: 'a'},
            {type: 'remove.text', path: spanPath, offset: 0, text: 'b'},
          ],
          origin: 'local',
        },
      ])
    })
  })
})

function collectChanges(editor: Editor): Array<ChangeEvent> {
  const changes: Array<ChangeEvent> = []
  editor.on('change', (event) => {
    changes.push(event)
  })
  return changes
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

/**
 * The operations the sync machine's reconciliation applies to turn a text
 * block's `text` from `before` to `after`: normalization first fills in
 * the missing `markDefs`/`marks` defaults (each carrying its own inverse,
 * even though remote operations do not need one to be undoable), then the
 * text itself is replaced by removing and re-inserting it wholesale rather
 * than diffing.
 */
function reconciliationOperations(
  blockKey: string,
  before: string,
  after: string,
) {
  const blockPath = [{_key: blockKey}]
  const spanPath = [{_key: blockKey}, 'children', {_key: `${blockKey}-span`}]

  return [
    {
      type: 'set',
      path: [...blockPath, 'markDefs'],
      value: [],
      inverse: {type: 'set', path: [...blockPath, 'markDefs'], value: []},
    },
    {
      type: 'set',
      path: [...spanPath, 'marks'],
      value: [],
      inverse: {type: 'set', path: [...spanPath, 'marks'], value: []},
    },
    {type: 'remove.text', path: spanPath, offset: 0, text: before},
    {type: 'insert.text', path: spanPath, offset: 0, text: after},
  ]
}

function firstSpanText(editor: Editor): string {
  const firstBlock = editor.getSnapshot().context.value[0] as
    | (PortableTextBlock & {children: Array<{text?: string}>})
    | undefined
  const span = firstBlock?.children[0]
  return typeof span?.text === 'string' ? span.text : ''
}
