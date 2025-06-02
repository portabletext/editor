import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import {page} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {EditorProvider, PortableTextEditable, type Editor} from '../src'
import {defineSchema} from '../src/editor/editor-schema'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'

describe('event.patch', () => {
  test('Scenario: Inserting two text blocks where the first one is empty', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []

    render(
      <EditorProvider
        initialConfig={{
          indexedSelection: true,
          keyGenerator,
          schemaDefinition: defineSchema({
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const editorLocator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(editorLocator).toBeInTheDocument())

    editorRef.current?.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [0, 0],
          offset: 0,
        },
        focus: {
          path: [0, 0],
          offset: 0,
        },
      })
    })

    const emptyParagraph = {
      _type: 'block',
      _key: keyGenerator(),
      children: [{_type: 'span', _key: keyGenerator(), text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const h1 = {
      _type: 'block',
      _key: keyGenerator(),
      children: [{_type: 'span', _key: keyGenerator(), text: 'Foo', marks: []}],
      markDefs: [],
      style: 'h1',
    }

    editorRef.current?.send({
      type: 'insert.blocks',
      blocks: [emptyParagraph, h1],
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        emptyParagraph,
        h1,
      ])
    })

    expect(patches).toEqual(
      [
        // Initial setting up patch
        setIfMissing([], []),
        // Inserting placeholder block
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        // Inserting new empty paragraph before placeholder
        insert([emptyParagraph], 'before', [{_key: 'k0'}]),
        // Removing placeholder since placement is 'auto' and that means
        // "merging" into the existing text
        unset([{_key: 'k0'}]),
        // Unsetting everything since the editor is "empty"
        unset([]),
        // Initial setting up patch
        setIfMissing([], []),
        // Inserting the empty paragraph which can now be considered the placeholder
        insert([emptyParagraph], 'before', [0]),
        // Inserting the h1
        insert([h1], 'after', [{_key: emptyParagraph._key}]),
      ].map((patch) => ({...patch, origin: 'local'})),
    )
  })
})
