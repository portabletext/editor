import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {EditorProvider, PortableTextEditable, type Editor} from '..'
import {defineSchema} from '../editor/editor-schema-definition'
import {getTersePt} from '../internal-utils/terse-pt'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import {EditorRefPlugin} from './plugin.editor-ref'
import {AutoCloseBracketsPlugin} from './plugin.internal.auto-close-brackets'

describe(AutoCloseBracketsPlugin.name, () => {
  test('One-character text insertion', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <AutoCloseBracketsPlugin />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await userEvent.click(locator)

    editorRef.current?.send({type: 'insert.text', text: '('})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['()'])
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['(foo)'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['()'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['('])
    })
  })

  test('Two-character text insertion', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <AutoCloseBracketsPlugin />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await userEvent.click(locator)

    editorRef.current?.send({type: 'insert.text', text: '(f'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['(f)'])
    })

    await userEvent.type(locator, 'oo')

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['(foo)'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['(f)'])
    })

    editorRef.current?.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['(f'])
    })
  })
})
