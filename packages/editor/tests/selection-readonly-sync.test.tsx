import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

/**
 * Selection must keep syncing in read-only editors. The `selectionchange`
 * handler used to bail unless the editable was the document's active
 * element, and a read-only editable (`contenteditable="false"`, no tab stop)
 * can never be the active element, so the model selection froze: stale
 * selections stuck around and new selections never reached consumers
 * (selection-derived UI, `serialize` on copy). The editor machine already
 * whitelists `select` in read-only mode; the DOM side has to deliver it.
 */

const initialValue = [
  {
    _type: 'block',
    _key: 'blockA',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'spanA', text: 'first', marks: []}],
  },
  {
    _type: 'block',
    _key: 'blockB',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'spanB', text: 'second', marks: []}],
  },
]

describe('Feature: Read-Only Selection Sync', () => {
  test('Scenario: Selecting text in a read-only editor syncs the model selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    selectDomText('first', 1, 'second', 3)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
          offset: 1,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: A selection made before turning read-only keeps following the DOM', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 6,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(6)
    })

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    // The user moves the selection while read-only; the model must not stay
    // stuck on the pre-read-only range.
    selectDomText('second', 0, 'second', 2)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 2,
        },
        backward: false,
      })
    })
  })
})

function selectDomText(
  anchorText: string,
  anchorOffset: number,
  focusText: string,
  focusOffset: number,
) {
  const anchorNode = findTextNode(anchorText)
  const focusNode = findTextNode(focusText)
  window
    .getSelection()
    ?.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
}

function findTextNode(text: string): Text {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (walker.currentNode.textContent === text) {
      return walker.currentNode as Text
    }
  }
  throw new Error(`No text node with text "${text}"`)
}
