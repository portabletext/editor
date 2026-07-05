import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

describe('root chunks against real engine editing', () => {
  test('Scenario: `flatten(rootChunks)` equals the value through a mixed editing session', async () => {
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor, locator} = await createTestEditor({
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })
    const value = () => editor.getSnapshot().context.value

    async function expectChunksMatchValue(label: string) {
      // The actor-side value can settle before the engine finishes
      // applying a burst of ops, so the invariant is asserted with a
      // retry.
      await vi.waitFor(() => {
        const flattened = engineRef.current!.rootChunks.flatMap(
          (chunk) => chunk.blocks,
        )
        // Reference equality per block: the chunks must hold the
        // value's actual block objects, not stale copies.
        expect(flattened.length, label).toBe(value().length)
        flattened.forEach((block, index) => {
          expect(block, `${label}: block ${index}`).toBe(value()[index])
        })
      })
    }

    // Programmatic bulk insert (a paste-sized batch crossing chunk
    // boundaries).
    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      blocks: Array.from({length: 250}, (_, index) => ({
        _type: 'block',
        _key: `b${index}`,
        children: [
          {_type: 'span', _key: `s${index}`, text: `block ${index}`, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })),
    })
    await vi.waitFor(() => expect(value().length).toBe(250))
    await expectChunksMatchValue('after bulk insert')

    // Real typing, splitting, and merging at a chunk-interior position.
    await userEvent.click(locator.getByText('block 125'))
    await userEvent.keyboard('typed{Enter}split{Enter}')
    await vi.waitFor(() => expect(value().length).toBe(252))
    await expectChunksMatchValue('after typing and splits')

    await userEvent.keyboard(
      '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}',
    )
    await vi.waitFor(() => expect(value().length).toBe(251))
    await expectChunksMatchValue('after backspace merges')

    // Undo the typing session step by step (bounded so the bulk insert
    // itself stays).
    for (let undoStep = 0; undoStep < 5; undoStep++) {
      editor.send({type: 'history.undo'})
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    await expectChunksMatchValue('after undos')

    // Select-all delete across every chunk.
    const blockCountBeforeDelete = value().length
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
        focus: {
          path: [{_key: 'b249'}, 'children', {_key: 's249'}],
          offset: 'block 249'.length,
        },
      },
    })
    editor.send({type: 'delete'})
    await vi.waitFor(() => expect(value().length).toBe(1))
    await expectChunksMatchValue('after select-all delete')

    editor.send({type: 'history.undo'})
    await vi.waitFor(() => expect(value().length).toBe(blockCountBeforeDelete))
    await expectChunksMatchValue('after undoing the delete')
  }, 120000)
})
