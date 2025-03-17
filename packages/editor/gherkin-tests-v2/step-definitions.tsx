import {page, userEvent, type Locator} from '@vitest/browser/context'
import {Given, Then, When} from 'racejar'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorSelection,
  type EditorSnapshot,
  type PortableTextBlock,
} from '../src'
import {parseBlock, parseBlocks} from '../src/internal-utils/parse-blocks'
import {getSelectionBlockKeys} from '../src/internal-utils/selection-block-keys'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../src/internal-utils/text-selection'
import {EditorRefPlugin} from '../src/plugins'
import type {Parameter} from './gherkin-parameter-types'

type Context = {
  editor: {
    ref: React.RefObject<Editor>
    locator: Locator
    value: () => Array<PortableTextBlock>
    selection: () => EditorSelection
    snapshot: () => EditorSnapshot
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
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}, {name: 'break'}],
            inlineObjects: [{name: 'stock-ticker'}],
          }),
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
      snapshot: () => editorRef.current!.getSnapshot(),
      selection: () =>
        editorRef.current?.getSnapshot().context.selection ?? null,
    }

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  }),

  Given('the text {string}', async (context: Context, text: string) => {
    await userEvent.type(context.editor.locator, text)
  }),

  Given(
    'a block {placement}',
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
        select: 'none',
      })
    },
  ),

  Given(
    'a block at {placement} selected at the {select-position}',
    (
      context: Context,
      placement: Parameter['placement'],
      selectPosition: Parameter['selectPosition'],
      block: string,
    ) => {
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
        select: selectPosition,
      })
    },
  ),

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

  Then(
    'the caret is before {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionBeforeText(context.editor.value(), text)
        expect(selection).not.toBeNull()
        expect(context.editor.selection()).toEqual(selection)
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

  Then(
    'the caret is after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(context.editor.value(), text)
        expect(selection).not.toBeNull()
        expect(context.editor.selection()).toEqual(selection)
      })
    },
  ),

  Then('nothing is selected', async (context: Context) => {
    await vi.waitFor(() => {
      expect(context.editor.selection()).toBeNull()
    })
  }),

  Then('block {string} is selected', async (context: Context, key: string) => {
    const selectionBlockKeys = getSelectionBlockKeys(context.editor.selection())

    await vi.waitFor(() => {
      expect(
        selectionBlockKeys?.anchor,
        'Unexpected selection anchor block key',
      ).toBe(key)
      expect(
        selectionBlockKeys?.focus,
        'Unexpected selection focus block key',
      ).toBe(key)
    })
  }),

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
    'a block is inserted {placement} and selected at the {select-position}',
    (
      context: Context,
      placement: Parameter['placement'],
      selectPosition: Parameter['selectPosition'],
      block: string,
    ) => {
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
        select: selectPosition,
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
          getTersePt(context.editor.value()),
          'Unexpected editor text',
        ).toEqual(text)
      })
    },
  ),
]
