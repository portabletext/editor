import type {Patch} from '@portabletext/patches'
import {insert} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

/**
 * Normalization fallout of remote patch application must stay local.
 *
 * When a collaborator's formatting toggle splits a span, the receiving
 * editor's normalizer merges the resulting adjacent same-mark spans back
 * together, which is correct local hygiene. But if those merge operations
 * are emitted as local patches, every receiving client pushes its own
 * competing "cleanup" of the same structure back to the server, and the
 * interleaved merges corrupt the shared document (fragments unset after
 * their text moved elsewhere, text applied twice). Field signature:
 * formatting appears to work, then the formatted region's text is
 * duplicated at the end of the block and the marks are gone.
 */
describe('remote patch application does not emit normalization patches', () => {
  test('merging adjacent same-mark spans created by remote patches stays local', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const emittedPatches: Patch[] = []
    const patchSubscription = editor.on('patch', (event) => {
      if ('patch' in event) {
        emittedPatches.push(event.patch)
      }
    })
    const emittedMutations: Patch[][] = []
    const mutationSubscription = editor.on('mutation', (event) => {
      emittedMutations.push(event.patches)
    })

    // A collaborator's split arrives: a second span with identical (empty)
    // marks lands next to the existing one. The local normalizer merges the
    // two spans into one.
    editor.send({
      type: 'patches',
      patches: [
        insert(
          [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
          'after',
          [{_key: b1}, 'children', {_key: s1}],
        ),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as {
        children: {text: string}[]
      }
      // normalized: the spans merged into one
      expect(block.children).toHaveLength(1)
      expect(block.children[0]!.text).toBe('foobar')
    })

    // The merge itself must not be broadcast: no local patches, no mutation.
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(emittedPatches).toEqual([])
    expect(emittedMutations).toEqual([])

    patchSubscription.unsubscribe()
    mutationSubscription.unsubscribe()
  })

  test('genuine local edits still emit patches after remote application', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        insert(
          [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
          'after',
          [{_key: b1}, 'children', {_key: s1}],
        ),
      ],
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value[0] as {
        children: {text: string}[]
      }
      expect(block.children[0]!.text).toBe('foobar')
    })

    const emittedPatches: Patch[] = []
    const subscription = editor.on('patch', (event) => {
      if ('patch' in event) {
        emittedPatches.push(event.patch)
      }
    })

    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(emittedPatches.length).toBeGreaterThan(0)
    })

    subscription.unsubscribe()
  })
})
