import {page, userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema-definition'
import {InternalChange$Plugin} from '../src/plugins/plugin.internal.change-ref'
import type {EditorChange} from '../src/types/editor'

describe('change$', () => {
  test('emits changes', async () => {
    const changes: Array<EditorChange> = []

    render(
      <EditorProvider
        initialConfig={{
          schemaDefinition: defineSchema({}),
        }}
      >
        <InternalChange$Plugin
          onChange={(change) => {
            changes.push(change)
          }}
        />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const editorLocator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(editorLocator).toBeInTheDocument())

    expect(changes).toEqual([{type: 'ready'}])

    await userEvent.type(editorLocator, 'f')

    expect(changes).toEqual([
      {type: 'ready'},
      expect.objectContaining({type: 'focus'}),
      expect.objectContaining({type: 'selection'}),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'setIfMissing'}),
      }),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'insert'}),
      }),
      expect.objectContaining({
        type: 'patch',
        patch: expect.objectContaining({type: 'diffMatchPatch'}),
      }),
      expect.objectContaining({type: 'selection'}),
    ])
  })
})
