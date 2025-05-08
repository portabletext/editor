import {page, userEvent, type Locator} from '@vitest/browser/context'
import {Given, Then, When} from 'racejar'
import React from 'react'
import {assert, expect, vi} from 'vitest'
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
import type {EditorActor} from '../src/editor/editor-machine'
import {getEditorSelection} from '../src/internal-utils/editor-selection'
import {getSelectionAfterInlineObject} from '../src/internal-utils/inline-object-selection'
import {parseBlock, parseBlocks} from '../src/internal-utils/parse-blocks'
import {getSelectionBlockKeys} from '../src/internal-utils/selection-block-keys'
import {getSelectionText} from '../src/internal-utils/selection-text'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {getTextMarks} from '../src/internal-utils/text-marks'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {getValueAnnotations} from '../src/internal-utils/value-annotations'
import {EditorRefPlugin} from '../src/plugins'
import {InternalEditorAfterRefPlugin} from '../src/plugins/plugin.internal.editor-actor-ref'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import type {PortableTextSlateEditor} from '../src/types/editor'
import {
  reverseSelection,
  selectionPointToBlockOffset,
  spanSelectionPointToBlockOffset,
} from '../src/utils'
import type {Parameter} from './gherkin-parameter-types'

type Context = {
  editor: {
    ref: React.RefObject<Editor>
    actorRef: React.RefObject<EditorActor>
    slateRef: React.RefObject<PortableTextSlateEditor>
    locator: Locator
    value: () => Array<PortableTextBlock>
    selection: () => EditorSelection
    snapshot: () => EditorSnapshot
  }
  keyMap?: Map<string, string>
}

export const stepDefinitions = [
  Given('one editor', async (context: Context) => {
    const editorActorRef = React.createRef<EditorActor>()
    const slateRef = React.createRef<PortableTextSlateEditor>()
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
            annotations: [{name: 'comment'}, {name: 'link'}],
            decorators: [{name: 'em'}, {name: 'strong'}],
            blockObjects: [{name: 'image'}, {name: 'break'}],
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          keyGenerator,
          initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />

        <InternalEditorAfterRefPlugin ref={editorActorRef} />
        <InternalSlateEditorRefPlugin ref={slateRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')

    context.editor = {
      ref: editorRef as React.RefObject<Editor>,
      actorRef: editorActorRef as React.RefObject<EditorActor>,
      slateRef: slateRef as React.RefObject<PortableTextSlateEditor>,
      locator,
      value: () => editorRef.current?.getSnapshot().context.value ?? [],
      snapshot: () => editorRef.current!.getSnapshot(),
      selection: () =>
        editorRef.current?.getSnapshot().context.selection ?? null,
    }

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  }),

  Given('a global keymap', (context: Context) => {
    context.keyMap = new Map()
  }),

  Given('the editor is focused', async (context: Context) => {
    await userEvent.click(context.editor.locator)

    await vi.waitFor(() => {
      const selection = context.editor.selection()
      expect(selection).not.toBeNull()
    })
  }),

  Given('the text {string}', async (context: Context, text: string) => {
    if (text.length > 0) {
      await userEvent.type(context.editor.locator, text)
    }
  }),

  /**
   * Block steps
   */
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
          options: {refreshKeys: false, validateFields: true},
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
          options: {refreshKeys: false, validateFields: true},
        })!,
        placement,
        select: selectPosition,
      })
    },
  ),

  /**
   * Inline object steps
   */
  Given(
    'a(n) {inline-object}',
    (context: Context, inlineObject: Parameter['inlineObject']) => {
      context.editor.ref.current.send({
        type: 'insert.inline object',
        inlineObject: {
          name: inlineObject,
          value: {},
        },
      })
    },
  ),

  /**
   * Text steps
   */
  When('{string} is typed', async (context: Context, text: string) => {
    await userEvent.type(context.editor.locator, text)
  }),

  /**
   * Button steps
   */
  When(
    '{button} is pressed',
    async (_: Context, button: Parameter['button']) => {
      await userEvent.keyboard(`{${button}}`)
    },
  ),
  When(
    '{button} is pressed {int} times',
    async (_: Context, button: Parameter['button'], times: number) => {
      for (let i = 0; i < times; i++) {
        await userEvent.keyboard(`{${button}}`)
      }
    },
  ),

  /**
   * Selection steps
   */
  When(
    'the caret is put before {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionBeforeText(context.editor.value(), text)
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: getSelectionBeforeText(context.editor.value(), text),
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
    async (context: Context, text: string | '[stock-ticker]') => {
      await vi.waitFor(() => {
        if (text === '[stock-ticker]') {
          const selection = getSelectionAfterInlineObject(
            context.editor.value(),
            text.replace('[', '').replace(']', ''),
          )
          expect(selection).not.toBeNull()

          context.editor.ref.current.send({
            type: 'select',
            at: selection,
          })

          return
        }

        const selection = getSelectionAfterText(context.editor.value(), text)
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: getSelectionAfterText(context.editor.value(), text),
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
  When('everything is selected', (context: Context) => {
    const editorSelection = getEditorSelection(context.editor.value())

    context.editor.ref.current.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('everything is selected backwards', (context: Context) => {
    const editorSelection = reverseSelection(
      getEditorSelection(context.editor.value()),
    )

    context.editor.ref.current.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('{string} is selected', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const selection = getTextSelection(context.editor.value(), text)
      expect(selection).not.toBeNull()

      context.editor.ref.current.send({
        type: 'select',
        at: selection,
      })
    })
  }),
  When(
    '{string} is selected backwards',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = reverseSelection(
          getTextSelection(context.editor.value(), text),
        )
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: selection,
        })
      })
    },
  ),
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
  Then('{text} is selected', (context: Context, text: Array<string>) => {
    const value = context.editor.value()
    const selection = context.editor.selection()

    expect(getSelectionText(value, selection), 'Unexpected selection').toEqual(
      text,
    )
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
          options: {refreshKeys: false, validateFields: true},
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
          options: {refreshKeys: false, validateFields: true},
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
          options: {refreshKeys: false, validateFields: true},
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

  /**
   * Annotation steps
   */
  Given(
    'a(n) {annotation} {keyKeys} around {string}',
    async (
      context: Context,
      annotation: Parameter['annotation'],
      keyKeys: Array<string>,
      text: string,
    ) => {
      await vi.waitFor(() => {
        const value = context.editor.value()
        const selection = getTextSelection(value, text)
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: selection,
        })
      })

      const value = context.editor.value()
      const priorAnnotationKeys = getValueAnnotations(value)

      context.editor.ref.current.send({
        type: 'annotation.toggle',
        annotation: {
          name: annotation,
          value: {},
        },
      })

      let newAnnotationKeys: Array<string> = []

      await vi.waitFor(() => {
        const newValue = context.editor.value()

        expect(priorAnnotationKeys).not.toEqual(getValueAnnotations(newValue))

        newAnnotationKeys = getValueAnnotations(newValue).filter(
          (newAnnotationKey) => !priorAnnotationKeys.includes(newAnnotationKey),
        )
      })

      if (newAnnotationKeys.length !== keyKeys.length) {
        assert.fail(
          `Expected ${keyKeys.length} new annotation keys, but got ${newAnnotationKeys.length}`,
        )
      }

      keyKeys.forEach((keyKey, index) => {
        context.keyMap?.set(keyKey, newAnnotationKeys[index])
      })
    },
  ),
  When(
    '{annotation} is toggled',
    (context: Context, annotation: Parameter['annotation']) => {
      context.editor.ref.current.send({
        type: 'annotation.toggle',
        annotation: {
          name: annotation,
          value: {},
        },
      })
    },
  ),
  When(
    '{annotation} {keyKeys} is toggled',
    async (
      context: Context,
      annotation: Parameter['annotation'],
      keyKeys: Array<string>,
    ) => {
      const value = context.editor.value()
      const priorAnnotationKeys = getValueAnnotations(value)

      context.editor.ref.current.send({
        type: 'annotation.toggle',
        annotation: {
          name: annotation,
          value: {},
        },
      })

      let newAnnotationKeys: Array<string> = []

      await vi.waitFor(() => {
        const newValue = context.editor.value()

        expect(priorAnnotationKeys).not.toEqual(getValueAnnotations(newValue))

        newAnnotationKeys = getValueAnnotations(newValue).filter(
          (newAnnotationKey) => !priorAnnotationKeys.includes(newAnnotationKey),
        )
      })

      if (newAnnotationKeys.length !== keyKeys.length) {
        assert.fail(
          `Expected ${keyKeys.length} new annotation keys, but got ${newAnnotationKeys.length}`,
        )
      }

      keyKeys.forEach((keyKey, index) => {
        context.keyMap?.set(keyKey, newAnnotationKeys[index])
      })
    },
  ),
  Then(
    '{string} has an annotation different than {key}',
    (context: Context, text: string, key: string) => {
      const marks = getTextMarks(context.editor.value(), text)
      const expectedMarks = [context.keyMap?.get(key) ?? key]

      expect(marks).not.toEqual(expectedMarks)
    },
  ),

  /**
   * Decorator steps
   */
  Given(
    '{decorator} around {string}',
    async (
      context: Context,
      decorator: Parameter['decorator'],
      text: string,
    ) => {
      await vi.waitFor(() => {
        const selection = getTextSelection(context.editor.value(), text)
        const anchorOffset = selection
          ? selectionPointToBlockOffset({
              context: {
                schema: context.editor.ref.current.getSnapshot().context.schema,
                value: context.editor.value(),
              },
              selectionPoint: selection.anchor,
            })
          : undefined
        const focusOffset = selection
          ? selectionPointToBlockOffset({
              context: {
                schema: context.editor.ref.current.getSnapshot().context.schema,
                value: context.editor.value(),
              },
              selectionPoint: selection.focus,
            })
          : undefined
        expect(anchorOffset).toBeDefined()
        expect(focusOffset).toBeDefined()

        context.editor.ref.current.send({
          type: 'decorator.toggle',
          decorator,
          at: {
            anchor: anchorOffset!,
            focus: focusOffset!,
          },
        })
      })
    },
  ),
  When(
    '{decorator} is toggled',
    async (context: Context, decorator: Parameter['decorator']) => {
      await vi.waitFor(() => {
        context.editor.ref.current.send({
          type: 'decorator.toggle',
          decorator,
        })
      })
    },
  ),
  When(
    '{text} is marked with {decorator}',
    async (
      context: Context,
      text: string,
      decorator: Parameter['decorator'],
    ) => {
      await vi.waitFor(() => {
        const selection = getTextSelection(context.editor.value(), text)
        const anchorOffset = selection
          ? spanSelectionPointToBlockOffset({
              context: {
                schema: context.editor.ref.current.getSnapshot().context.schema,
                value: context.editor.value(),
              },
              selectionPoint: selection.anchor,
            })
          : undefined
        const focusOffset = selection
          ? spanSelectionPointToBlockOffset({
              context: {
                schema: context.editor.ref.current.getSnapshot().context.schema,
                value: context.editor.value(),
              },
              selectionPoint: selection.focus,
            })
          : undefined

        expect(anchorOffset).toBeDefined()
        expect(focusOffset).toBeDefined()

        context.editor.ref.current.send({
          type: 'decorator.toggle',
          decorator,
          at: {
            anchor: anchorOffset!,
            focus: focusOffset!,
          },
        })
      })
    },
  ),

  /**
   * Mark steps
   */
  Then(
    '{string} has marks {marks}',
    async (context: Context, text: string, marks: Parameter['marks']) => {
      await vi.waitFor(() => {
        const actualMarks = getTextMarks(context.editor.value(), text) ?? []
        const expectedMarks = marks.map(
          (mark) => context.keyMap?.get(mark) ?? mark,
        )

        expect(actualMarks).toEqual(expectedMarks)
      })
    },
  ),
  Then('{string} has no marks', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const textMarks = getTextMarks(context.editor.value(), text)
      expect(textMarks).toEqual([])
    })
  }),
  Then(
    '{string} and {string} have the same marks',
    (context: Context, textA: string, textB: string) => {
      const marksA = getTextMarks(context.editor.value(), textA)
      const marksB = getTextMarks(context.editor.value(), textB)

      expect(
        marksA,
        `Expected "${textA}" and "${textB}" to have the same marks`,
      ).toEqual(marksB)
    },
  ),

  /**
   * Clipboard steps
   */
  When('x-portable-text is pasted', (context: Context, blocks: string) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('application/x-portable-text', blocks)
    dataTransfer.setData('application/json', blocks)

    // This is a slight hack since Vitest doesn't allow us to populate the
    // DataTransfer object as we paste
    context.editor.actorRef.current.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'clipboard.paste',
        originEvent: {
          dataTransfer,
        },
        position: {
          selection: context.editor.snapshot().context.selection!,
        },
      },
      editor: context.editor.slateRef.current,
    })
  }),
  When(
    'data is pasted',
    (context: Context, dataTable: Array<[mime: string, data: string]>) => {
      const dataTransfer = new DataTransfer()

      for (const data of dataTable) {
        dataTransfer.setData(data[0], data[1])
      }

      // This is a slight hack since Vitest doesn't allow us to populate the
      // DataTransfer object as we paste
      context.editor.actorRef.current.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'clipboard.paste',
          originEvent: {
            dataTransfer,
          },
          position: {
            selection: context.editor.snapshot().context.selection!,
          },
        },
        editor: context.editor.slateRef.current,
      })
    },
  ),
]
