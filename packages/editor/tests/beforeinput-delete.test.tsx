import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type PortableTextEditableProps} from '../src'
import type {BehaviorEvent} from '../src/behaviors'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('beforeinput delete with a collapsed selection', () => {
  test('Scenario: a deleteContentBackward beforeinput deletes the character before the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteContentBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo ba| baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.backward', unit: 'character'},
        {type: 'delete', direction: 'backward', unit: 'character'},
      ])
    })
  })

  test('Scenario: a deleteContentForward beforeinput deletes the character after the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteContentForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.forward', unit: 'character'},
        {type: 'delete', direction: 'forward', unit: 'character'},
      ])
    })
  })

  test('Scenario: a deleteContent beforeinput deletes the character after the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteContent')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.forward', unit: 'character'},
        {type: 'delete', direction: 'forward', unit: 'character'},
      ])
    })
  })

  test('Scenario: a deleteByCut beforeinput deletes forward from the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteByCut')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete', direction: 'forward'}])
    })
  })

  test('Scenario: a deleteByDrag beforeinput deletes forward from the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteByDrag')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete', direction: 'forward'}])
    })
  })

  test('Scenario: a deleteByComposition beforeinput deletes forward from the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteByComposition')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete', direction: 'forward'}])
    })
  })

  test('Scenario: a deleteWordBackward beforeinput deletes the word before the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteWordBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.backward', unit: 'word'},
        {type: 'delete', direction: 'backward', unit: 'word'},
      ])
    })
  })

  test('Scenario: a deleteWordForward beforeinput deletes the word after the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteWordForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar| qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.forward', unit: 'word'},
        {type: 'delete', direction: 'forward', unit: 'word'},
      ])
    })
  })

  test('Scenario: a deleteSoftLineBackward beforeinput deletes the line before the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteSoftLineBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.backward', unit: 'line'},
        {type: 'delete', direction: 'backward', unit: 'line'},
      ])
    })
  })

  test('Scenario: a deleteSoftLineForward beforeinput deletes the line after the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteSoftLineForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.forward', unit: 'line'},
        {type: 'delete', direction: 'forward', unit: 'line'},
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput deletes the whole line', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: |\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 15},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput in a wrapped block deletes only the visual line around the caret', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 5,
        focusOffset: 5,
        middleText: 'foobarbaz',
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foob|z\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 8},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput at a soft wrap deletes the line after the wrap', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 4,
        focusOffset: 4,
        middleText: 'foobarbaz',
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foob|z\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 8},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput before the last character of a wrapped block deletes only the last line', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 8,
        focusOffset: 8,
        middleText: 'foobarbaz',
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foobarba|\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 8},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 9},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput at the end of a span that ends at a soft wrap deletes the line after the wrap', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 4,
        focusOffset: 4,
        middleSpans: [
          {text: 'foob', marks: ['strong']},
          {text: 'arbaz', marks: []},
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: [strong:foob|]z\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k4'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k4'}], offset: 4},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput at the start of a span that starts at a soft wrap deletes the line after the wrap', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 0,
        focusOffset: 0,
        spanIndex: 1,
        middleSpans: [
          {text: 'foob', marks: ['strong']},
          {text: 'arbaz', marks: []},
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: [strong:foob]|z\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k4'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k4'}], offset: 4},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput directly before a newline deletes the line before the newline', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 3,
        focusOffset: 3,
        middleText: 'foo\nbar',
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: |\nbar\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput directly after a newline deletes the line after the newline', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 4,
        focusOffset: 4,
        middleText: 'foo\nbar',
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo\n|\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 7},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteEntireSoftLine beforeinput inside the line after a newline deletes that line', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({
        anchorOffset: 5,
        focusOffset: 5,
        middleText: 'foo\nbar',
      })

    dispatchBeforeInput('deleteEntireSoftLine')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo\n|\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 7},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteHardLineBackward beforeinput deletes to the start of the block', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteHardLineBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          direction: 'backward',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 7},
          },
        },
      ])
    })
  })

  test('Scenario: a deleteHardLineBackward beforeinput at the start of the block merges it into the block before', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 0, focusOffset: 0})

    dispatchBeforeInput('deleteHardLineBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo|foo bar baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.backward', unit: 'character'},
        {type: 'delete', direction: 'backward', unit: 'character'},
        {type: 'delete.block', at: [{_key: 'k2'}]},
        {
          type: 'delete',
          unit: 'block',
          at: {
            anchor: {path: [{_key: 'k2'}], offset: 0},
            focus: {path: [{_key: 'k2'}], offset: 0},
          },
        },
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
          },
        },
        {
          type: 'insert.block',
          block: {
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                marks: [],
                text: 'foo bar baz qux',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          placement: 'auto',
          select: 'start',
        },
      ])
    })
  })

  test('Scenario: a deleteHardLineForward beforeinput deletes to the end of the block', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 7, focusOffset: 7})

    dispatchBeforeInput('deleteHardLineForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar|\nB: baz',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          direction: 'forward',
          at: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 7},
            focus: {
              path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
              offset: 15,
            },
          },
        },
      ])
    })
  })

  test('Scenario: a deleteHardLineForward beforeinput at the end of the block merges the block after into it', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 15, focusOffset: 15})

    dispatchBeforeInput('deleteHardLineForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo bar baz qux|baz',
      )
      expect(behaviorEvents).toEqual([
        {type: 'delete.forward', unit: 'character'},
        {type: 'delete', direction: 'forward', unit: 'character'},
        {type: 'delete.block', at: [{_key: 'k4'}]},
        {
          type: 'delete',
          unit: 'block',
          at: {
            anchor: {path: [{_key: 'k4'}], offset: 0},
            focus: {path: [{_key: 'k4'}], offset: 0},
          },
        },
        {
          type: 'insert.block',
          block: {
            _key: 'k4',
            _type: 'block',
            children: [{_key: 'k5', _type: 'span', marks: [], text: 'baz'}],
            markDefs: [],
            style: 'normal',
          },
          placement: 'auto',
          select: 'none',
        },
      ])
    })
  })
})

describe('beforeinput delete with an expanded selection', () => {
  test('Scenario: a backward delete beforeinput deletes the selection backward', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 4, focusOffset: 7})

    dispatchBeforeInput('deleteWordBackward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete', direction: 'backward'}])
    })
  })

  test('Scenario: a forward delete beforeinput deletes the selection forward', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 4, focusOffset: 7})

    dispatchBeforeInput('deleteHardLineForward')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete', direction: 'forward'}])
    })
  })

  test('Scenario: a deleteByCut beforeinput deletes the selection without a direction', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 4, focusOffset: 7})

    dispatchBeforeInput('deleteByCut')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete'}])
    })
  })

  test('Scenario: a deleteByDrag beforeinput deletes the selection without a direction', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 4, focusOffset: 7})

    dispatchBeforeInput('deleteByDrag')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete'}])
    })
  })

  test('Scenario: a deleteByComposition beforeinput deletes the selection without a direction', async () => {
    const {editor, behaviorEvents, dispatchBeforeInput} =
      await createEditorWithDomSelection({anchorOffset: 4, focusOffset: 7})

    dispatchBeforeInput('deleteByComposition')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: foo | baz qux\nB: baz',
      )
      expect(behaviorEvents).toEqual([{type: 'delete'}])
    })
  })
})

async function createEditorWithDomSelection({
  anchorOffset,
  focusOffset,
  middleText = 'foo bar baz qux',
  middleSpans = [{text: middleText, marks: []}],
  spanIndex = 0,
  editableProps,
}: {
  anchorOffset: number
  focusOffset: number
  middleText?: string
  middleSpans?: Array<{text: string; marks: Array<string>}>
  spanIndex?: number
  editableProps?: PortableTextEditableProps
}) {
  const keyGenerator = createTestKeyGenerator()
  const behaviorEvents: Array<BehaviorEvent> = []

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    editableProps,
    initialValue: [
      textBlock(keyGenerator, [{text: 'foo', marks: []}]),
      textBlock(keyGenerator, middleSpans),
      textBlock(keyGenerator, [{text: 'baz', marks: []}]),
    ],
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: '*',
            actions: [
              ({event}) => [
                effect(() => {
                  behaviorEvents.push(event)
                }),
                forward(event),
              ],
            ],
          }),
        ]}
      />
    ),
  })

  await userEvent.click(locator)

  const editableElement = locator.element()
  const textNode =
    editableElement.querySelectorAll('[data-pt-text]')[1 + spanIndex]
      ?.firstChild

  if (!textNode) {
    throw new Error('Could not find the middle block text node')
  }

  const range = document.createRange()
  range.setStart(textNode, anchorOffset)
  range.setEnd(textNode, focusOffset)
  window.getSelection()?.removeAllRanges()
  window.getSelection()?.addRange(range)

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.anchor.offset).toBe(
      anchorOffset,
    )
    expect(editor.getSnapshot().context.selection?.focus.offset).toBe(
      focusOffset,
    )
  })

  behaviorEvents.length = 0

  function dispatchBeforeInput(inputType: string) {
    const event = new InputEvent('beforeinput', {
      inputType,
      bubbles: true,
      cancelable: true,
    })

    if (event.inputType !== inputType) {
      // Chromium's `InputEvent` constructor resets an `inputType` outside the
      // set it fires itself (`deleteByComposition`, `deleteContent`,
      // `deleteEntireSoftLine`) to an empty string.
      Object.defineProperty(event, 'inputType', {value: inputType})
    }

    editableElement.dispatchEvent(event)
  }

  return {editor, behaviorEvents, dispatchBeforeInput}
}

function textBlock(
  keyGenerator: () => string,
  spans: Array<{text: string; marks: Array<string>}>,
) {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: spans.map((span) => ({
      _type: 'span',
      _key: keyGenerator(),
      text: span.text,
      marks: span.marks,
    })),
    markDefs: [],
    style: 'normal',
  }
}
