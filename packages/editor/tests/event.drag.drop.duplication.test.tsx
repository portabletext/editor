import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getInternalState} from '../src/editor/internal-state'
import {createTestEditor} from '../src/test/vitest'

/**
 * Reproduces the duplication observed in Sanity Studio when dragging block
 * objects between each other.
 *
 * Mechanism: `internalDrag.origin` is set by the editor machine in response
 * to `dragstart` events. The machine only assigns `internalDrag.origin`
 * while in the `idle` state, and returns to `idle` only when the document
 * sees a `drop` or `dragend`. In some browsers — and consistently in
 * Sanity Studio under specific layouts — `dragend` does not fire on the
 * document after a successful drop. The machine stays in
 * `dragging internally`, the next `dragstart` is ignored by the machine,
 * and `internalDrag.origin` keeps pointing at the PREVIOUS drag's source.
 *
 * On the next drop, `Editable.tsx` reads `dragOrigin` from the stale
 * `internalDrag.origin` while `dataTransfer` carries the new drag's
 * freshly-serialized content. The drop handler trusts both inputs and
 * deletes the old block while inserting the new — duplicating the second
 * block and losing the first.
 */
describe('event.drag.drop: stale internalDrag.origin', () => {
  test("Scenario: a second dragstart updates internalDrag.origin even when the machine hasn't returned to idle", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageAKey = keyGenerator()
    const imageBKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: imageAKey,
          _type: 'image',
          src: 'https://example.com/image-a.jpg',
        },
        {
          _key: imageBKey,
          _type: 'image',
          src: 'https://example.com/image-b.jpg',
        },
      ],
    })

    await userEvent.click(locator)

    const imageAOrigin = {
      selection: {
        anchor: {path: [{_key: imageAKey}], offset: 0},
        focus: {path: [{_key: imageAKey}], offset: 0},
      },
    }
    const imageBOrigin = {
      selection: {
        anchor: {path: [{_key: imageBKey}], offset: 0},
        focus: {path: [{_key: imageBKey}], offset: 0},
      },
    }

    const {editorActor} = getInternalState(editor)

    // Given a first drag of image A starts (entering "dragging internally")
    editorActor.send({type: 'dragstart', origin: imageAOrigin})
    await vi.waitFor(() => {
      expect(editorActor.getSnapshot().context.internalDrag?.origin).toEqual(
        imageAOrigin,
      )
    })

    // When a second drag of image B starts WITHOUT an intervening dragend
    // (mirroring the browser behavior we observe in Studio: after a
    // successful drop, dragend does not always fire on the document)
    editorActor.send({type: 'dragstart', origin: imageBOrigin})

    // Then internalDrag.origin should track the latest dragstart, not the
    // stale first one. The bug: it stays at imageAOrigin because the
    // machine ignores dragstart while in "dragging internally".
    await vi.waitFor(() => {
      expect(editorActor.getSnapshot().context.internalDrag?.origin).toEqual(
        imageBOrigin,
      )
    })
  })
})
