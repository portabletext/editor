import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PortableTextEditable, type Editor} from '..'
import {EditorProvider} from '../editor/editor-provider'
import {defineSchema} from '../editor/editor-schema-definition'
import {getTersePt} from '../internal-utils/terse-pt'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import {getTextMarks} from '../internal-utils/text-marks'
import {EditorRefPlugin} from './plugin.editor-ref'
import {MarkdownPlugin} from './plugin.markdown'

describe(MarkdownPlugin.name, () => {
  test('Scenario: Undoing bold shortcut', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <MarkdownPlugin
          config={{
            boldDecorator: () => 'strong',
          }}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, '**Hello world!**')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['Hello world!'])
    })

    await vi.waitFor(() => {
      expect(
        getTextMarks(
          editorRef.current!.getSnapshot().context.value,
          'Hello world!',
        ),
      ).toEqual(['strong'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['**Hello world!**'])
    })
  })
})
