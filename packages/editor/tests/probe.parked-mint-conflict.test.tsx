import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import type {MutationEvent, PatchEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

/**
 * EDEX-1910 probe, not a regression test. Sequence under investigation:
 *
 * 1. A remote insert delivers a keyless span; normalization mints a
 *    `_key` for it, and on a pristine editor the mint's emission parks.
 * 2. A conflicting remote patch rewrites the block's children (keyed
 *    path). `discard conflicting pending patches` runs; the hypothesis
 *    is that the numeric-path mint survives because `pathContains`
 *    never matches numeric segments against keyed ones.
 * 3. A local edit flushes the queue; the stale mint emits and its
 *    numeric-index write targets whatever now sits at that index.
 */
test('probe: does a parked key mint survive a conflicting children rewrite and re-key a foreign node?', async () => {
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
    schemaDefinition: defineSchema({}),
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

  // Step 1: remote insert of a KEYLESS span after the existing one.
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        position: 'after',
        // @ts-expect-error deliberately keyless: the probe needs the mint
        items: [{_type: 'span', text: 'keyless', marks: []}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })

  await vi.waitFor(() => {
    const children = editor.getSnapshot().context.value.at(0)?.children
    expect(children).toHaveLength(2)
    // Normalization minted a key for the keyless span.
    expect(children?.at(1)?._key).toBeDefined()
  })
  const mintedKey = editor
    .getSnapshot()
    .context.value.at(0)
    ?.children.at(1)?._key

  // Escape-moment check: did the mint already emit before any conflicting
  // patch or local edit?
  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log(
    'patches emitted after step 1 alone:',
    JSON.stringify(patchEvents.map((event) => event.patch)),
  )

  // Step 2: conflicting remote rewrite of the same block's children
  // (keyed path), replacing everything with one collaborator span.
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'set',
        path: [{_key: blockKey}, 'children'],
        value: [{_type: 'span', _key: 'collabSpan', text: 'theirs', marks: []}],
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
          {_type: 'span', _key: 'collabSpan', text: 'theirs', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  // Step 3: local edit flushes the parked queue.
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: 'collabSpan'}],
        offset: 6,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: 'collabSpan'}],
        offset: 6,
      },
    },
  })
  editor.send({type: 'insert.text', text: '!'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value.at(0)?.children.at(0)?.text).toBe(
      'theirs!',
    )
  })

  // Give the mutation batcher time to flush everything.
  await vi.waitFor(() => {
    expect(mutationEvents.length).toBeGreaterThan(0)
  })

  // Evidence dump: every patch that ever emitted, plus the minted key,
  // so the failure shape (or its absence) is readable from the output.
  console.log('mintedKey:', mintedKey)
  console.log(
    'emitted patches:',
    JSON.stringify(
      patchEvents.map((event) => event.patch),
      null,
      2,
    ),
  )

  // The probe's question: did a stale `_key` set escape to the document?
  const keyWrites = patchEvents.filter(
    (event) => event.patch.type === 'set' && event.patch.path.at(-1) === '_key',
  )
  expect(keyWrites).toEqual([])
})
