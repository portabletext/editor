import type {Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

test.fails('Scenario: sibling traffic while a numeric repair is parked shifts its flush target', async () => {
  const patches: Array<Patch> = []
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            const {origin: _, ...patch} = event.patch
            patches.push(patch)
          }
        }}
      />
    ),
  })

  // A keyless span arrives and its mint parks at children[1].
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        position: 'after',
        items: [{_type: 'span', text: 'bar', marks: ['strong']}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value?.[0]?.children).toHaveLength(2)
  })

  // A collaborator inserts another span BEFORE it: indices shift, the
  // parked patch's `children[1]` now names this new span in the document.
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        position: 'before',
        items: [{_type: 'span', _key: 'remote-1', text: 'X', marks: []}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value?.[0]?.children).toHaveLength(3)
  })

  // First local edit flushes the parked mint.
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'a'})

  await vi.waitFor(() => {
    expect(patches.length).toBeGreaterThan(0)
  })
  // The document at this point holds [X, foo, bar]: the keyless span sits
  // at index 2, and the parked mint must address it there. Today the mint
  // flushes with the index frozen at park time (`children[1]`), which
  // document-side rekeys the collaborator's span X instead. The fix needs
  // a document-shaped shadow to re-anchor against; the engine's own value
  // is no oracle because local normalization fallout (span merges) changes
  // engine indices before the merge patches reach the document.
  expect(patches[0]).toEqual({
    type: 'set',
    path: [{_key: blockKey}, 'children', 2, '_key'],
    value: 'k4',
  })
})
