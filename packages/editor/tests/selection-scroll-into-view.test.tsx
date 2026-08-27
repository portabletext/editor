import {insert} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

/**
 * Selecting out-of-view content scrolls it into view with native-caret
 * semantics: the minimal delta to the nearest edge. The previous default
 * (inherited from `scroll-into-view-if-needed`'s `block: 'center'`) centered
 * the viewport on the focus, which made any programmatic `select` whose
 * focus was even slightly clipped, a row-handle click selecting into a
 * wide table's off-screen column, for example, yank the whole editor to
 * the middle of the screen.
 */

const schemaDefinition = defineSchema({})

const paragraph = (index: number) => ({
  _type: 'block',
  _key: `p${index}`,
  style: 'normal',
  markDefs: [],
  children: [
    {_type: 'span', _key: `s${index}`, text: `paragraph ${index}`, marks: []},
  ],
})

const fillerBlock = (key: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: `${key}s`, text: 'filler', marks: []}],
})

describe('Feature: Scrolling the Selection Into View', () => {
  test('Scenario: an off-screen selection lands at the nearest edge, not the center', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: Array.from({length: 120}, (_, index) => paragraph(index)),
    })
    editor.send({type: 'focus'})
    window.scrollTo(0, 0)

    // A caret far below the fold.
    const point = {
      path: [{_key: 'p100'}, 'children', {_key: 's100'}],
      offset: 0,
    }
    editor.send({type: 'select', at: {anchor: point, focus: point}})

    await vi.waitFor(() => {
      const block = document.querySelector('[data-block-key="p100"]')
      if (!block) {
        throw new Error('block not rendered')
      }
      const rect = block.getBoundingClientRect()
      // The minimal scroll delta parks the block's bottom at the viewport's
      // bottom edge (within sub-pixel rounding). A centering scroll would
      // leave it around the viewport's middle.
      const distanceFromBottom = window.innerHeight - rect.bottom
      expect(rect.top).toBeGreaterThanOrEqual(0)
      expect(distanceFromBottom).toBeGreaterThanOrEqual(-2)
      expect(distanceFromBottom).toBeLessThan(window.innerHeight * 0.2)
    })
  })

  test('Scenario: a selection already in view does not scroll', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: Array.from({length: 120}, (_, index) => paragraph(index)),
    })
    editor.send({type: 'focus'})
    window.scrollTo(0, 0)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // The first paragraph is visible at scroll 0; selecting it must not
    // move the viewport at all.
    const point = {path: [{_key: 'p1'}, 'children', {_key: 's1'}], offset: 0}
    editor.send({type: 'select', at: {anchor: point, focus: point}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })
    expect(window.scrollY).toBe(0)
  })

  test('Scenario: pressing Enter at the start of a block scrolls it back into view as it moves below the fold', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: Array.from({length: 3}, (_, index) => paragraph(index)),
    })
    editor.send({type: 'focus'})
    window.scrollTo(0, 0)

    // A caret at the very start of a block that starts on-screen.
    const point = {path: [{_key: 'p2'}, 'children', {_key: 's2'}], offset: 0}
    editor.send({type: 'select', at: {anchor: point, focus: point}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })

    for (let index = 0; index < 60; index++) {
      editor.send({type: 'insert.break'})
    }

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-pt-block="text"]').length).toBe(
        63,
      )
    })

    await vi.waitFor(() => {
      const block = document.querySelector(
        `[data-pt-path="${CSS.escape('[_key=="p2"]')}"]`,
      )
      if (!block) {
        throw new Error('block not rendered')
      }
      const rect = block.getBoundingClientRect()
      expect(rect.top).toBeGreaterThanOrEqual(0)
      expect(rect.top).toBeLessThan(window.innerHeight)
    })
  })

  test('Scenario: a remote content change around an unchanged selection does not scroll', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: Array.from({length: 3}, (_, index) => paragraph(index)),
    })
    editor.send({type: 'focus'})
    window.scrollTo(0, 0)

    const point = {path: [{_key: 'p2'}, 'children', {_key: 's2'}], offset: 0}
    editor.send({type: 'select', at: {anchor: point, focus: point}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })

    const insertedKeys = Array.from({length: 60}, () => keyGenerator())
    editor.send({
      type: 'patches',
      patches: [
        insert(
          insertedKeys.map((key) => fillerBlock(key)),
          'before',
          [{_key: 'p2'}],
        ),
      ],
      snapshot: undefined,
    })

    const lastInsertedKey = insertedKeys[insertedKeys.length - 1]
    await vi.waitFor(() => {
      const block = document.querySelector(
        `[data-pt-path="${CSS.escape(`[_key=="${lastInsertedKey}"]`)}"]`,
      )
      if (!block) {
        throw new Error('block not rendered')
      }
    })

    const block = document.querySelector(
      `[data-pt-path="${CSS.escape('[_key=="p2"]')}"]`,
    )
    if (!block) {
      throw new Error('block not rendered')
    }
    // Without this, a remote change that never affected the viewport would
    // make the `scrollY` assertion below meaningless.
    expect(block.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      window.innerHeight,
    )
    expect(window.scrollY).toBe(0)
  })
})
