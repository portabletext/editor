import {defineSchema, type SchemaDefinition} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {page} from '@vitest/browser/context'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../../editor'
import {
  PortableTextEditable,
  type PortableTextEditableProps,
} from '../../editor/Editable'
import {EditorProvider} from '../../editor/editor-provider'
import {EditorRefPlugin} from '../../plugins/plugin.editor-ref'
import type {Context} from './step-context'

type CreateTestEditorOptions = {
  initialValue?: Array<PortableTextBlock>
  keyGenerator?: () => string
  schemaDefinition?: SchemaDefinition
  children?: React.ReactNode
  editableProps?: PortableTextEditableProps
}

/**
 * @internal
 */
export async function createTestEditor(
  options: CreateTestEditorOptions = {},
): Promise<
  Pick<Context, 'editor' | 'locator'> & {
    rerender: (options?: CreateTestEditorOptions) => void
  }
> {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator()

  const renderResult = render(
    <EditorProvider
      initialConfig={{
        keyGenerator: keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable {...options.editableProps} />
      {options.children}
    </EditorProvider>,
  )

  function rerender(newOptions?: CreateTestEditorOptions) {
    newOptions
      ? renderResult.rerender(
          <EditorProvider
            initialConfig={{
              keyGenerator: keyGenerator,
              schemaDefinition: newOptions.schemaDefinition ?? defineSchema({}),
              initialValue: newOptions.initialValue,
            }}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...newOptions.editableProps} />
            {newOptions.children}
          </EditorProvider>,
        )
      : renderResult.rerender(
          <EditorProvider
            initialConfig={{
              keyGenerator: keyGenerator,
              schemaDefinition: options.schemaDefinition ?? defineSchema({}),
              initialValue: options.initialValue,
            }}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...options.editableProps} />
            {options.children}
          </EditorProvider>,
        )
  }

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    rerender,
  }
}
