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
 * Pins the cosmetic-normalization contract of
 * `isCosmeticNormalizationSkipped` (`engine/core/normalize-node.ts`): a
 * collaborator's span structure arrives untouched, nothing is emitted for
 * it, and it canonicalizes on the block's next local edit or via `update
 * value`.
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

    // Negative assert: the sleep gives a would-be echo time to surface.
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(patchEvents).toEqual([])
    expect(mutationEvents).toEqual([])
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

    // Negative assert: the old behavior pushed the merge back as a
    // mutation. The sleep gives a would-be emission time to surface.
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(patchEvents).toEqual([])
    expect(mutationEvents).toEqual([])
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

    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(patchEvents).toEqual([])
    expect(mutationEvents).toEqual([])
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
    await new Promise((resolve) => setTimeout(resolve, 100))
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

    // Negative assert: the sleep gives a would-be echo time to surface.
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(patchEvents).toEqual([])

    // And therefore the document survives: applying the receiver's
    // emissions (none) leaves it untouched. Before the fix the echo's
    // `diffMatchPatch`es re-inserted "bar" and "baz" here.
    const documentAfterEcho = applyAll(
      documentValue,
      patchEvents.map((event) => ({...event.patch})),
    )
    expect(documentAfterEcho).toEqual(documentValue)
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
