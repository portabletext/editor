import {getTersePt, parseTersePt} from '@portabletext/test'
import {page, userEvent} from '@vitest/browser/context'
import {Given, Then, When} from 'racejar'
import {assert, expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {getEditorSelection} from '../src/internal-utils/editor-selection'
import {parseBlocks} from '../src/internal-utils/parse-blocks'
import {getSelectionText} from '../src/internal-utils/selection-text'
import {getTextBlockKey} from '../src/internal-utils/text-block-key'
import {getTextMarks} from '../src/internal-utils/text-marks'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {getValueAnnotations} from '../src/internal-utils/value-annotations'
import {
  reverseSelection,
  selectionPointToBlockOffset,
  spanSelectionPointToBlockOffset,
} from '../src/utils'
import type {Parameter} from './gherkin-parameter-types'
import {RenderEditor} from './render-editor'
import type {Context} from './step-context'

export const stepDefinitions = [
  Given('one editor', async (context: Context) => {
    render(<RenderEditor page={page} context={context} />)

    await vi.waitFor(() =>
      expect.element(context.editor.locator).toBeInTheDocument(),
    )
  }),

  Given('a global keymap', (context: Context) => {
    context.keyMap = new Map()
  }),

  Given('the editor is focused', async (context: Context) => {
    context.editor.ref.current.send({
      type: 'focus',
    })

    await vi.waitFor(() => {
      const selection = context.editor.selection()
      expect(selection).not.toBeNull()
    })
  }),

  Given(
    'the text {terse-pt}',
    (context: Context, tersePt: Parameter['tersePt']) => {
      const blocks = parseTersePt(
        {
          keyGenerator: context.editor.snapshot().context.keyGenerator,
          schema: context.editor.snapshot().context.schema,
        },
        tersePt,
      )

      context.editor.ref.current.send({
        type: 'insert.blocks',
        blocks,
        placement: 'auto',
        select: 'end',
      })
    },
  ),

  /**
   * Block steps
   */
  Given(
    'blocks {placement}',
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
          options: {validateFields: true},
        }),
        placement,
      })
    },
  ),

  /**
   * Inline object steps
   */
  When(
    'a(n) {inline-object} is inserted',
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
  Given(
    'a block {key} with text {text}',
    (context: Context, key: string, text: Parameter['text']) => {
      context.editor.ref.current.send({
        type: 'insert.block',
        block: {
          _key: key,
          _type: 'block',
          children: [{_type: 'span', text, marks: []}],
        },
        placement: 'auto',
        select: 'end',
      })
    },
  ),
  When('{string} is typed', async (context: Context, text: string) => {
    await userEvent.type(context.editor.locator, text)
  }),
  Then(
    '{terse-pt} is in block {key}',
    (context: Context, text: Array<string>, key: string) => {
      const string = text.at(0)

      if (string === undefined) {
        assert.fail('Expected at least one text string')
      }

      if (text.length > 1) {
        assert.fail('Expected at most one text string')
      }

      expect(getTextBlockKey(context.editor.snapshot().context, string)).toBe(
        key,
      )
    },
  ),

  /**
   * Button steps
   */
  When(
    '{button} is pressed',
    async (_: Context, button: Parameter['button']) => {
      await userEvent.keyboard(button)
    },
  ),
  When(
    '{button} is pressed {int} times',
    async (_: Context, button: Parameter['button'], times: number) => {
      for (let i = 0; i < times; i++) {
        await userEvent.keyboard(button)
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
        const selection = getSelectionBeforeText(
          context.editor.snapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: getSelectionBeforeText(context.editor.snapshot().context, text),
        })
      })
    },
  ),
  Then(
    'the caret is before {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionBeforeText(
          context.editor.snapshot().context,
          text,
        )
        expect(selection).not.toBeNull()
        expect(context.editor.selection()).toEqual(selection)
      })
    },
  ),
  When(
    'the caret is put after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(
          context.editor.snapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: getSelectionAfterText(context.editor.snapshot().context, text),
        })
      })
    },
  ),
  Then(
    'the caret is after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(
          context.editor.snapshot().context,
          text,
        )
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
    const editorSelection = getEditorSelection(
      context.editor.snapshot().context,
    )

    context.editor.ref.current.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('everything is selected backwards', (context: Context) => {
    const editorSelection = reverseSelection(
      getEditorSelection(context.editor.snapshot().context),
    )

    context.editor.ref.current.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('{string} is selected', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const selection = getTextSelection(
        context.editor.snapshot().context,
        text,
      )
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
          getTextSelection(context.editor.snapshot().context, text),
        )
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: selection,
        })
      })
    },
  ),
  Then('{terse-pt} is selected', (context: Context, text: Array<string>) => {
    expect(
      getSelectionText(context.editor.snapshot().context),
      'Unexpected selection',
    ).toEqual(text)
  }),

  When(
    '{terse-pt} is inserted at {placement}',
    (
      context: Context,
      tersePt: Parameter['tersePt'],
      placement: Parameter['placement'],
    ) => {
      const blocks = parseTersePt(
        {
          keyGenerator: context.editor.snapshot().context.keyGenerator,
          schema: context.editor.snapshot().context.schema,
        },
        tersePt,
      )

      context.editor.ref.current.send({
        type: 'insert.blocks',
        blocks,
        placement,
      })
    },
  ),
  When(
    '{terse-pt} is inserted at {placement} and selected at the {select-position}',
    (
      context: Context,
      tersePt: Parameter['tersePt'],
      placement: Parameter['placement'],
      selectPosition: Parameter['selectPosition'],
    ) => {
      const blocks = parseTersePt(
        {
          keyGenerator: context.editor.snapshot().context.keyGenerator,
          schema: context.editor.snapshot().context.schema,
        },
        tersePt,
      )

      context.editor.ref.current.send({
        type: 'insert.blocks',
        blocks,
        placement,
        select: selectPosition,
      })
    },
  ),
  When(
    'blocks are inserted at {placement} and selected at the {select-position}',
    (
      context: Context,
      placement: Parameter['placement'],
      selectPosition: Parameter['selectPosition'],
      blocks: string,
    ) => {
      context.editor.ref.current.send({
        type: 'insert.blocks',
        blocks: parseBlocks({
          context: {
            schema: context.editor.ref.current.getSnapshot().context.schema,
            keyGenerator:
              context.editor.ref.current.getSnapshot().context.keyGenerator,
          },
          blocks: JSON.parse(blocks),
          options: {validateFields: true},
        }),
        placement,
        select: selectPosition,
      })
    },
  ),

  Then(
    'the text is {terse-pt}',
    async (context: Context, tersePt: Parameter['tersePt']) => {
      await vi.waitFor(() => {
        expect(
          getTersePt(context.editor.snapshot().context),
          'Unexpected editor text',
        ).toEqual(tersePt)
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
        const selection = getTextSelection(
          context.editor.snapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.ref.current.send({
          type: 'select',
          at: selection,
        })
      })

      const value = context.editor.value()
      const priorAnnotationKeys = getValueAnnotations(
        context.editor.snapshot().context.schema,
        value,
      )

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

        expect(priorAnnotationKeys).not.toEqual(
          getValueAnnotations(
            context.editor.snapshot().context.schema,
            newValue,
          ),
        )

        newAnnotationKeys = getValueAnnotations(
          context.editor.snapshot().context.schema,
          newValue,
        ).filter(
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
      const priorAnnotationKeys = getValueAnnotations(
        context.editor.snapshot().context.schema,
        value,
      )

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

        expect(priorAnnotationKeys).not.toEqual(
          getValueAnnotations(
            context.editor.snapshot().context.schema,
            newValue,
          ),
        )

        newAnnotationKeys = getValueAnnotations(
          context.editor.snapshot().context.schema,
          newValue,
        ).filter(
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
      const marks = getTextMarks(context.editor.snapshot().context, text)
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
        const selection = getTextSelection(
          context.editor.snapshot().context,
          text,
        )
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
    '{string} is marked with {decorator}',
    async (
      context: Context,
      text: string,
      decorator: Parameter['decorator'],
    ) => {
      await vi.waitFor(() => {
        const selection = getTextSelection(
          context.editor.snapshot().context,
          text,
        )
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
        const actualMarks =
          getTextMarks(context.editor.snapshot().context, text) ?? []
        const expectedMarks = marks.map(
          (mark) => context.keyMap?.get(mark) ?? mark,
        )

        expect(actualMarks).toEqual(expectedMarks)
      })
    },
  ),
  Then('{string} has no marks', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const textMarks = getTextMarks(context.editor.snapshot().context, text)
      expect(textMarks).toEqual([])
    })
  }),
  Then(
    '{string} and {string} have the same marks',
    (context: Context, textA: string, textB: string) => {
      const marksA = getTextMarks(context.editor.snapshot().context, textA)
      const marksB = getTextMarks(context.editor.snapshot().context, textB)

      expect(
        marksA,
        `Expected "${textA}" and "${textB}" to have the same marks`,
      ).toEqual(marksB)
    },
  ),

  /**
   * Style steps
   */
  When('{style} is toggled', (context: Context, style: Parameter['style']) => {
    context.editor.ref.current.send({type: 'style.toggle', style})
  }),

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

  /**
   * Undo/Redo steps
   */
  When('undo is performed', (context: Context) => {
    context.editor.ref.current.send({type: 'history.undo'})
  }),
  When('redo is performed', (context: Context) => {
    context.editor.ref.current.send({type: 'history.redo'})
  }),
]
