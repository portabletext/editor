import {page, userEvent, type Locator} from '@vitest/browser/context'
import {Given, Then, When} from 'racejar'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getValueText,
} from '../gherkin-tests/gherkin-step-helpers'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorSelection,
  type PortableTextBlock,
} from '../src'
import {parseBlock, parseBlocks} from '../src/internal-utils/parse-blocks'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'
import type {Parameter} from './gherkin-parameter-types'

type Context = {
  editor: {
    ref: React.RefObject<Editor>
    locator: Locator
    value: () => Array<PortableTextBlock>
    selection: () => EditorSelection
  }
}

export const stepDefinitions = [
  Given('one editor', async (context: Context) => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator('e0-')
    const initialValue = [
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_key: keyGenerator(), _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    render(
      <EditorProvider
        initialConfig={{
          schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
          keyGenerator,
          initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    context.editor = {
      ref: editorRef as React.RefObject<Editor>,
      locator,
      value: () => editorRef.current?.getSnapshot().context.value ?? [],
      selection: () =>
        editorRef.current?.getSnapshot().context.selection ?? null,
    }

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  }),

  Given('the text {string}', async (context: Context, text: string) => {
    await userEvent.type(context.editor.locator, text)
  }),

  When('{string} is typed', async (context: Context, text: string) => {
    await userEvent.type(context.editor.locator, text)
  }),

  When(
    '{button} is pressed',
    async (_: Context, button: Parameter['button']) => {
      await userEvent.keyboard(`{${button}}`)
    },
  ),

  When(
    'the caret is put before {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionBeforeText(context.editor.value(), text)
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          selection: getSelectionBeforeText(context.editor.value(), text),
        })
      })
    },
  ),

  When(
    'the caret is put after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(context.editor.value(), text)
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          selection: getSelectionAfterText(context.editor.value(), text),
        })
      })
    },
  ),

  When(
    'a block is inserted {placement}',
    (context: Context, placement: Parameter['placement'], block: string) => {
      context.editor.ref.current.send({
        type: 'insert.block',
        block: parseBlock({
          context: {
            schema: context.editor.ref.current.getSnapshot().context.schema,
            keyGenerator:
              context.editor.ref.current.getSnapshot().context.keyGenerator,
          },
          block: JSON.parse(block),
          options: {refreshKeys: false},
        })!,
        placement,
      })
    },
  ),

  When(
    'blocks are inserted {placement}',
    (context: Context, placement: Parameter['placement'], blocks: string) => {
      context.editor.ref.current.send({
        type: 'insert.blocks',
        blocks: parseBlocks({
          context: {
            schema: context.editor.ref.current.getSnapshot().context.schema,
            keyGenerator:
              context.editor.ref.current.getSnapshot().context.keyGenerator,
          },
          blocks: JSON.parse(blocks),
          options: {refreshKeys: false},
        }),
        placement,
      })
    },
  ),

  Then(
    'the text is {text}',
    async (context: Context, text: Parameter['text']) => {
      await vi.waitFor(() => {
        expect(
          getValueText(context.editor.value()),
          'Unexpected editor text',
        ).toEqual(text)
      })
    },
  ),
]
