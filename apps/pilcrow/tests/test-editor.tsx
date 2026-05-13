import {
  EditorProvider,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PilcrowEditor} from '../src/editor'
import {schemaDefinition} from '../src/schema'

/**
 * Mounts a Pilcrow editor with all plugins and the Pilcrow schema for
 * gherkin / scenario tests. Returns the editor ref and the render
 * locator so step definitions can drive the editable.
 */
export async function createPilcrowTestEditor(
  options: {
    initialValue?: Array<PortableTextBlock>
    keyGenerator?: () => string
  } = {},
) {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator()
  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition,
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PilcrowEditor />
    </EditorProvider>,
  )
  const locator = result.locator.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  if (!editorRef.current) {
    throw new Error('Pilcrow editor ref not set after render')
  }
  return {
    editor: editorRef.current,
    locator,
  }
}
