import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {useEditor, useEditorSelector} from '../src'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

describe(useEditorSelector.name, () => {
  test('Scenario: a large undo re-runs a selector a constant number of times, not once per re-inserted block', async () => {
    const blockCount = 400
    let selectorRuns = 0
    let settledLength = -1

    function BlockCountProbe() {
      const editor = useEditor()
      settledLength = useEditorSelector(editor, (snapshot) => {
        selectorRuns += 1
        return snapshot.context.value.length
      })
      return null
    }

    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      children: (
        <>
          <InternalEditorEngineRefPlugin ref={engineRef} />
          <BlockCountProbe />
        </>
      ),
    })

    editor.send({
      type: 'insert.blocks',
      blocks: Array.from({length: blockCount}, (_, index) =>
        block(`b${index}`, `s${index}`),
      ),
      placement: 'auto',
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(blockCount),
    )

    // Drop the insert from history so undo's only step is the delete, whose
    // inverse re-inserts every block one operation at a time.
    engineRef.current!.history.undos = []
    engineRef.current!.history.redos = []

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
        focus: {
          path: [
            {_key: `b${blockCount - 1}`},
            'children',
            {_key: `s${blockCount - 1}`},
          ],
          offset: `b${blockCount - 1}`.length,
        },
      },
    })
    editor.send({type: 'delete'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(1),
    )
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Count only the runs the undo itself causes.
    selectorRuns = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(blockCount),
    )
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Undo emits once per re-inserted block (~blockCount times). `editor.subscribe`
    // coalesces the burst, so the selector re-runs a small constant number of
    // times, not ~blockCount. A loose bound rather than a literal count, so the
    // assertion absorbs unrelated React re-renders instead of coupling to its
    // scheduling.
    expect(selectorRuns).toBeLessThan(20)
    // It still lands on the settled value.
    expect(settledLength).toBe(blockCount)
  })
})

function block(blockKey: string, spanKey: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text: blockKey, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}
