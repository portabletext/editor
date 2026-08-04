import {applyAll, type Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import type {MutationEvent, PatchEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins'
import {
  getMarkState,
  isActiveAnnotation,
  isActiveDecorator,
} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

/**
 * Pins the cosmetic-normalization contract (`engine/core/normalize-node.ts`):
 * a collaborator's span structure and a document's untidy-but-valid shapes
 * (unused/duplicate `markDefs`, annotations on empty spans) arrive
 * untouched, nothing is emitted for them, and the block canonicalizes on
 * its next local edit.
 */
describe('remote patches skip cosmetic normalization', () => {
  test('a remote marks change does not merge the surrounding spans', async () => {
    // The production trigger: a collaborator removes a decorator from the
    // middle span, and the receiver observes the marks change before the
    // collaborator's own merge fallout arrives.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: barKey}, 'marks'],
          value: [],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: []},
            {_type: 'span', _key: bazKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patchEvents.map((event) => event.patch)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: bazKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(
            makePatches(makeDiff('foobar', 'foobarbaz!')),
          ),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          origin: 'local',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(mutationEvents.flatMap((event) => event.patches)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: bazKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(
            makePatches(makeDiff('foobar', 'foobarbaz!')),
          ),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          origin: 'local',
        },
      ])
    })
  })

  test('adjacent same-mark spans arriving via remote patches are kept', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'remoteSpan', text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'remoteSpan', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patchEvents.map((event) => event.patch)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('bar', 'bar!'))),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar!'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          origin: 'local',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(mutationEvents.flatMap((event) => event.patches)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('bar', 'bar!'))),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar!'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          origin: 'local',
        },
      ])
    })
  })

  test('an empty span arriving via remote patches is kept', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'remoteSpan', text: '', marks: ['em']}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'remoteSpan', text: '', marks: ['em']},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patchEvents.map((event) => event.patch)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          origin: 'local',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(mutationEvents.flatMap((event) => event.patches)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          origin: 'local',
        },
      ])
    })
  })

  test('the block re-canonicalizes on its next local edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'remoteSpan', text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.at(0)?.children).toHaveLength(2)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'remoteSpan'}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foobar!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(mutationEvents.length).toBeGreaterThan(0)
    })
  })

  test('a collaborator removing a decorator does not corrupt the document through a receiver echo', async () => {
    // The end-to-end customer symptom. A collaborator un-bolds the middle
    // of "foo|bar|baz": their editor emits `set marks: []` followed by its
    // own local merge fallout (two text `diffMatchPatch`es and two
    // `unset`s). Listeners deliver patches of one transaction across
    // multiple events, so a receiver can observe the block between the
    // marks change and the merge. A receiver that normalizes at that point
    // emits its own mirror-image merge, and when the store applies that
    // echo, the `diffMatchPatch`es re-insert text the collaborator's own
    // merge already inserted: "foobarbaz" becomes "foobarbazbarbaz", the
    // duplicated-tail corruption from the field report.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patchEvents: Array<PatchEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patchEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    function diffMatchPatchFor(oldText: string, newText: string): string {
      return stringifyPatches(makePatches(makeDiff(oldText, newText)))
    }

    // The collaborator's emission for the un-bold, verbatim shape of what
    // `decorator.toggle` produces on their editor.
    const collaboratorPatches: Array<Patch> = [
      {
        type: 'set',
        path: [{_key: blockKey}, 'children', {_key: barKey}, 'marks'],
        value: [],
        origin: 'remote',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
        value: diffMatchPatchFor('foo', 'foobar'),
        origin: 'remote',
      },
      {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: barKey}],
        origin: 'remote',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
        value: diffMatchPatchFor('foobar', 'foobarbaz'),
        origin: 'remote',
      },
      {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: bazKey}],
        origin: 'remote',
      },
    ]

    // What the document holds once the collaborator's transaction lands.
    const documentValue = applyAll(
      editor.getSnapshot().context.value,
      collaboratorPatches,
    )
    expect(documentValue).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: fooKey, text: 'foobarbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    // Deliver the marks change in its own event, then the rest.
    editor.send({
      type: 'patches',
      patches: [collaboratorPatches[0]!],
      snapshot: undefined,
    })

    // The interleave window: the marks change has landed, the merge
    // fallout has not. All three spans are still present and unmerged.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: []},
            {_type: 'span', _key: bazKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: collaboratorPatches.slice(1),
      snapshot: undefined,
    })

    // The receiver converges to the document byte-identically, without
    // having normalized anything itself.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(documentValue)
    })

    // Everything the receiver emitted while converging: patches relay
    // synchronously off the same apply cycle that produced the value
    // above, so this is already final for that cycle. The receiver
    // normalized nothing itself, so there is no echo to emit.
    const patchEventsFromRemoteConvergence = patchEvents.map(
      (event) => event.patch,
    )
    expect(patchEventsFromRemoteConvergence).toEqual([])

    // The document survives: applying the receiver's emissions (asserted
    // empty above) leaves it untouched. Before the fix the echo's
    // `diffMatchPatch`es re-inserted "bar" and "baz" here.
    const documentAfterEcho = applyAll(
      documentValue,
      patchEventsFromRemoteConvergence,
    )
    expect(documentAfterEcho).toEqual(documentValue)

    // The empty snapshot above pins the apply cycle; this edit pins later
    // ticks, since an echo must surface no later than the edit's own emission.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 9,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 9,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patchEvents.map((event) => event.patch)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
          value: diffMatchPatchFor('foobarbaz', 'foobarbaz!'),
          origin: 'local',
        },
      ])
    })
  })

  test('`update value` keeps adjacent same-mark spans as-is', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'otherSpan', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Adopted structure is kept byte-for-byte: cosmetic canonicalization
    // runs only as fallout of locally authored edits, on every adoption
    // path. The engine's value must track the document exactly for
    // diffed-value patches to target live keys.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'otherSpan', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

/**
 * Adopted structure is kept as the document has it, so adjacent same-mark
 * siblings persist until a local edit touches their block. Mark and
 * annotation logic must compute correctly over that structure, and the
 * first local touch canonicalizes it as fallout of the edit.
 */
describe('adoption and remote patches skip markDef and annotation cleanup', () => {
  test('a remote marks change does not prune the markDef it leaves unused', async () => {
    // The interleave hazard: a collaborator removes an annotation as two
    // patches (clear the mark, unset the definition). Between them the
    // definition is unused, and a receiver pruning it would race the
    // collaborator's own unset.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({annotations: [{name: 'link'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: ['m0']},
          ],
          markDefs: [{_key: 'm0', _type: 'link'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [{_key: 'm0', _type: 'link'}],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patchEvents.map((event) => event.patch)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
          origin: 'local',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(mutationEvents.flatMap((event) => event.patches)).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
          origin: 'local',
        },
      ])
    })
  })

  test('`update value` keeps duplicate markDefs as-is', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({annotations: [{name: 'link'}]}),
    })

    const storedValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: ['m0']}],
        markDefs: [
          {_key: 'm0', _type: 'link'},
          {_key: 'm0', _type: 'link'},
        ],
        style: 'normal',
      },
    ]

    editor.send({type: 'update value', value: storedValue})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(storedValue)
    })
  })

  test('an empty annotated span arriving via `initialValue` keeps its marks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const emptyKey = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: emptyKey, text: '', marks: ['m0']},
        ],
        markDefs: [{_key: 'm0', _type: 'link'}],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({annotations: [{name: 'link'}]}),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('the untidy block re-canonicalizes on its next local edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const emptyKey = keyGenerator()
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({annotations: [{name: 'link'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: emptyKey, text: '', marks: ['m0']},
          ],
          markDefs: [
            {_key: 'm0', _type: 'link'},
            {_key: 'm0', _type: 'link'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      // The local edit runs all three cleanup rules as its fallout: the empty
      // span loses its annotation and merges away, the duplicate def
      // dedupes, and the now-unused def prunes.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo!', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(mutationEvents.length).toBeGreaterThan(0)
    })
  })
})

describe('mark state over adopted same-mark siblings', () => {
  test('caret at the boundary sees the shared decorator and typing continues it', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 'a', text: 'foo', marks: ['strong']},
            {_type: 'span', _key: 'b', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
      },
    })
    expect(getMarkState(editor.getSnapshot())).toEqual({
      state: 'unchanged',
      marks: ['strong'],
    })
    expect(isActiveDecorator('strong')(editor.getSnapshot())).toBe(true)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'b'}], offset: 0},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'b'}], offset: 0},
      },
    })
    expect(getMarkState(editor.getSnapshot())).toEqual({
      state: 'changed',
      previousMarks: ['strong'],
      marks: ['strong'],
    })

    // Typing at the boundary continues the decorator, and the edit
    // canonicalizes the block: the siblings merge as local fallout.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: 'X'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 'a', text: 'fooXbar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('a selection across the siblings reports the decorator and toggling strips both', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 'a', text: 'foo', marks: ['strong']},
            {_type: 'span', _key: 'b', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 0},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'b'}], offset: 3},
      },
    })
    expect(getMarkState(editor.getSnapshot())).toEqual({
      state: 'unchanged',
      marks: ['strong'],
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 'a', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('siblings sharing an annotation stay one annotation and merge on touch', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 'a', text: 'foo', marks: ['m1']},
            {_type: 'span', _key: 'b', text: 'bar', marks: ['m1']},
          ],
          markDefs: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'a'}], offset: 3},
      },
    })
    expect(getMarkState(editor.getSnapshot())).toEqual({
      state: 'unchanged',
      marks: ['m1'],
    })
    expect(isActiveAnnotation('link')(editor.getSnapshot())).toBe(true)

    editor.send({type: 'insert.text', text: 'Y'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 'a', text: 'fooYbar', marks: ['m1']},
          ],
          markDefs: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
    })
  })
})
