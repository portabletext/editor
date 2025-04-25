import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {Editor, EditorProvider} from '../src'
import {defineSchema} from '../src/editor/editor-schema'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'

describe('event.delete', () => {
  test('Scenario: Deleting selection ending on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: 'foo'}],
            },
            {
              _key: 'k2',
              _type: 'image',
            },
            {
              _key: 'k3',
              _type: 'block',
              children: [{_key: 'k4', _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '|', '[image]', '|', 'bar'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['', '|', 'bar'])
    })
  })
})
