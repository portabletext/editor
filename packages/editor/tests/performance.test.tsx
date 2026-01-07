import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextSlateEditor} from '../src/types/slate-editor'

describe('Performance', () => {
  test('onChange is batched', async () => {
    const slateEditorRef = React.createRef<PortableTextSlateEditor>()
    let onChangeCount = 0

    const {editor} = await createTestEditor({
      children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
    })

    const originalOnChange = slateEditorRef.current!.onChange

    slateEditorRef.current!.onChange = () => {
      onChangeCount++

      originalOnChange()
    }

    editor.send({
      type: 'insert.blocks',
      blocks: Array.from({length: 10}, (_, i) => ({
        _key: `k${i}`,
        _type: 'block',
        children: [
          {_key: `s${i}`, _type: 'span', text: `Block ${i}`, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })),
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(10)
    })

    // We expect 2 calls:
    // 1. From performEvent (our batched call at the end of top-level event processing)
    // 2. From Slate-React's internal change detection
    expect(onChangeCount).toBe(2)
  })
})
