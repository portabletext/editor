import {defineSchema} from '@portabletext/schema'
import {getTersePt, parseTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {Given, Then, When} from 'racejar'
import {assert, expect, vi} from 'vitest'
import {getEditorSelection} from '../../internal-utils/editor-selection'
import {
  parseBlocks,
  parseInlineObject,
  parseSpan,
} from '../../internal-utils/parse-blocks'
import {getSelectionText} from '../../internal-utils/selection-text'
import {getTextBlockKey} from '../../internal-utils/text-block-key'
import {getTextMarks} from '../../internal-utils/text-marks'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from '../../internal-utils/text-selection'
import {getValueAnnotations} from '../../internal-utils/value-annotations'
import {createTestEditor} from '../../test/vitest'
import {
  reverseSelection,
  selectionPointToBlockOffset,
  spanSelectionPointToBlockOffset,
} from '../../utils'
import type {Parameter} from '../gherkin-parameter-types'
import type {Context} from './step-context'

/**
 * @internal
 */
export const stepDefinitions = [
  Given('one editor', async (context: Context) => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        annotations: [{name: 'comment'}, {name: 'link'}],
        decorators: [{name: 'em'}, {name: 'strong'}],
        blockObjects: [{name: 'image'}, {name: 'break'}],
        inlineObjects: [{name: 'stock-ticker'}],
        lists: [{name: 'bullet'}, {name: 'number'}],
        styles: [
          {name: 'normal'},
          {name: 'h1'},
          {name: 'h2'},
          {name: 'h3'},
          {name: 'h4'},
          {name: 'h5'},
          {name: 'h6'},
          {name: 'blockquote'},
        ],
      }),
    })

    context.locator = locator
    context.editor = editor
  }),

  Given('a global keymap', (context: Context) => {
    context.keyMap = new Map()
  }),

  Given('the editor is focused', async (context: Context) => {
    await userEvent.click(context.locator)
  }),

  Given(
    'the text {terse-pt}',
    (context: Context, tersePt: Parameter['tersePt']) => {
      const blocks = parseTersePt(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        tersePt,
      )

      context.editor.send({
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
      context.editor.send({
        type: 'insert.blocks',
        blocks: parseBlocks({
          context: {
            schema: context.editor.getSnapshot().context.schema,
            keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          },
          blocks: JSON.parse(blocks),
          options: {
            removeUnusedMarkDefs: false,
            validateFields: true,
          },
        }),
        placement,
      })
    },
  ),

  /**
   * Child steps
   */
  When('a child is inserted', (context: Context, child: string) => {
    const parsedChild =
      parseSpan({
        context: {
          schema: context.editor.getSnapshot().context.schema,
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
        },
        span: JSON.parse(child),
        markDefKeyMap: new Map(),
        options: {validateFields: true},
      }) ??
      parseInlineObject({
        context: {
          schema: context.editor.getSnapshot().context.schema,
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
        },
        inlineObject: JSON.parse(child),
        options: {validateFields: true},
      })

    if (!parsedChild) {
      throw new Error(`Unable to parse child ${child}`)
    }

    context.editor.send({
      type: 'insert.child',
      child: parsedChild,
    })
  }),
  When(
    'a(n) {inline-object} is inserted',
    (context: Context, inlineObject: Parameter['inlineObject']) => {
      context.editor.send({
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
      context.editor.send({
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
    await userEvent.type(context.locator, text)
  }),
  When('{string} is inserted', (context: Context, text: string) => {
    context.editor.send({type: 'insert.text', text})
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

      expect(
        getTextBlockKey(context.editor.getSnapshot().context, string),
      ).toBe(key)
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
          context.editor.getSnapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.send({
          type: 'select',
          at: selection,
        })
      })
    },
  ),
  Then(
    'the caret is before {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionBeforeText(
          context.editor.getSnapshot().context,
          text,
        )
        expect(selection).not.toBeNull()
        expect(context.editor.getSnapshot().context.selection).toEqual(
          selection,
        )
      })
    },
  ),
  When(
    'the caret is put after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(
          context.editor.getSnapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.send({
          type: 'select',
          at: getSelectionAfterText(context.editor.getSnapshot().context, text),
        })
      })
    },
  ),
  Then(
    'the caret is after {string}',
    async (context: Context, text: string) => {
      await vi.waitFor(() => {
        const selection = getSelectionAfterText(
          context.editor.getSnapshot().context,
          text,
        )
        expect(selection).not.toBeNull()
        expect(context.editor.getSnapshot().context.selection).toEqual(
          selection,
        )
      })
    },
  ),
  Then('nothing is selected', async (context: Context) => {
    await vi.waitFor(() => {
      expect(context.editor.getSnapshot().context.selection).toBeNull()
    })
  }),
  When('everything is selected', (context: Context) => {
    const editorSelection = getEditorSelection(
      context.editor.getSnapshot().context,
    )

    context.editor.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('everything is selected backwards', (context: Context) => {
    const editorSelection = reverseSelection(
      getEditorSelection(context.editor.getSnapshot().context),
    )

    context.editor.send({
      type: 'select',
      at: editorSelection,
    })
  }),
  When('{string} is selected', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const selection = getTextSelection(
        context.editor.getSnapshot().context,
        text,
      )
      expect(selection).not.toBeNull()

      context.editor.send({
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
          getTextSelection(context.editor.getSnapshot().context, text),
        )
        expect(selection).not.toBeNull()

        context.editor.send({
          type: 'select',
          at: selection,
        })
      })
    },
  ),
  Then(
    '{terse-pt} is selected',
    async (context: Context, text: Array<string>) => {
      await vi.waitFor(() => {
        expect(
          getSelectionText(context.editor.getSnapshot().context),
          'Unexpected selection',
        ).toEqual(text)
      })
    },
  ),

  When(
    '{terse-pt} is inserted at {placement}',
    (
      context: Context,
      tersePt: Parameter['tersePt'],
      placement: Parameter['placement'],
    ) => {
      const blocks = parseTersePt(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        tersePt,
      )

      context.editor.send({
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
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        tersePt,
      )

      context.editor.send({
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
      context.editor.send({
        type: 'insert.blocks',
        blocks: parseBlocks({
          context: {
            schema: context.editor.getSnapshot().context.schema,
            keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          },
          blocks: JSON.parse(blocks),
          options: {
            removeUnusedMarkDefs: false,
            validateFields: true,
          },
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
          getTersePt(context.editor.getSnapshot().context),
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
          context.editor.getSnapshot().context,
          text,
        )
        expect(selection).not.toBeNull()

        context.editor.send({
          type: 'select',
          at: selection,
        })
      })

      const value = context.editor.getSnapshot().context.value
      const priorAnnotationKeys = getValueAnnotations(
        context.editor.getSnapshot().context.schema,
        value,
      )

      context.editor.send({
        type: 'annotation.toggle',
        annotation: {
          name: annotation,
          value: {},
        },
      })

      let newAnnotationKeys: Array<string> = []

      await vi.waitFor(() => {
        const newValue = context.editor.getSnapshot().context.value

        expect(priorAnnotationKeys).not.toEqual(
          getValueAnnotations(
            context.editor.getSnapshot().context.schema,
            newValue,
          ),
        )

        newAnnotationKeys = getValueAnnotations(
          context.editor.getSnapshot().context.schema,
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
      context.editor.send({
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
      const value = context.editor.getSnapshot().context.value
      const priorAnnotationKeys = getValueAnnotations(
        context.editor.getSnapshot().context.schema,
        value,
      )

      context.editor.send({
        type: 'annotation.toggle',
        annotation: {
          name: annotation,
          value: {},
        },
      })

      let newAnnotationKeys: Array<string> = []

      await vi.waitFor(() => {
        const newValue = context.editor.getSnapshot().context.value

        expect(priorAnnotationKeys).not.toEqual(
          getValueAnnotations(
            context.editor.getSnapshot().context.schema,
            newValue,
          ),
        )

        newAnnotationKeys = getValueAnnotations(
          context.editor.getSnapshot().context.schema,
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
      const marks = getTextMarks(context.editor.getSnapshot().context, text)
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
          context.editor.getSnapshot().context,
          text,
        )
        const anchorOffset = selection
          ? selectionPointToBlockOffset({
              context: {
                schema: context.editor.getSnapshot().context.schema,
                value: context.editor.getSnapshot().context.value,
              },
              selectionPoint: selection.anchor,
            })
          : undefined
        const focusOffset = selection
          ? selectionPointToBlockOffset({
              context: {
                schema: context.editor.getSnapshot().context.schema,
                value: context.editor.getSnapshot().context.value,
              },
              selectionPoint: selection.focus,
            })
          : undefined
        expect(anchorOffset).toBeDefined()
        expect(focusOffset).toBeDefined()

        context.editor.send({
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
        context.editor.send({
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
          context.editor.getSnapshot().context,
          text,
        )
        const anchorOffset = selection
          ? spanSelectionPointToBlockOffset({
              context: {
                schema: context.editor.getSnapshot().context.schema,
                value: context.editor.getSnapshot().context.value,
              },
              selectionPoint: selection.anchor,
            })
          : undefined
        const focusOffset = selection
          ? spanSelectionPointToBlockOffset({
              context: {
                schema: context.editor.getSnapshot().context.schema,
                value: context.editor.getSnapshot().context.value,
              },
              selectionPoint: selection.focus,
            })
          : undefined

        expect(anchorOffset).toBeDefined()
        expect(focusOffset).toBeDefined()

        context.editor.send({
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
          getTextMarks(context.editor.getSnapshot().context, text) ?? []
        const expectedMarks = marks.map(
          (mark) => context.keyMap?.get(mark) ?? mark,
        )

        expect(actualMarks).toEqual(expectedMarks)
      })
    },
  ),
  Then('{string} has no marks', async (context: Context, text: string) => {
    await vi.waitFor(() => {
      const textMarks = getTextMarks(context.editor.getSnapshot().context, text)
      expect(textMarks).toEqual([])
    })
  }),
  Then(
    '{string} and {string} have the same marks',
    (context: Context, textA: string, textB: string) => {
      const marksA = getTextMarks(context.editor.getSnapshot().context, textA)
      const marksB = getTextMarks(context.editor.getSnapshot().context, textB)

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
    context.editor.send({type: 'style.toggle', style})
  }),

  /**
   * Clipboard steps
   */
  When('x-portable-text is pasted', (context: Context, blocks: string) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('application/x-portable-text', blocks)
    dataTransfer.setData('application/json', blocks)

    context.editor.send({
      type: 'clipboard.paste',
      originEvent: {
        dataTransfer,
      },
      position: {
        selection: context.editor.getSnapshot().context.selection!,
      },
    })
  }),
  When(
    'data is pasted',
    (context: Context, dataTable: Array<[mime: string, data: string]>) => {
      const dataTransfer = new DataTransfer()

      for (const data of dataTable) {
        dataTransfer.setData(data[0], data[1])
      }

      context.editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: context.editor.getSnapshot().context.selection!,
        },
      })
    },
  ),

  /**
   * Undo/Redo steps
   */
  When('undo is performed', (context: Context) => {
    context.editor.send({type: 'history.undo'})
  }),
  When('redo is performed', (context: Context) => {
    context.editor.send({type: 'history.redo'})
  }),
]
