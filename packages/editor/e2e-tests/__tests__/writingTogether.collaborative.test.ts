/** @jest-environment ./setup/collaborative.jest.env.ts */
import '../setup/globals.jest'
import {describe, expect, it} from '@jest/globals'
import type {PortableTextBlock} from '@sanity/types'

const initialValue: PortableTextBlock[] = [
  {
    _key: 'randomKey0',
    _type: 'block',
    markDefs: [],
    style: 'normal',
    children: [{_key: 'randomKey1', _type: 'span', text: 'Hello', marks: []}],
  },
]

describe('collaborate editing', () => {
  it('will have the same start value for editor A and B', async () => {
    await setDocumentValue(initialValue)
    const editors = await getEditors()
    const valA = await editors[0].getValue()
    const valB = await editors[1].getValue()
    expect(valA).toEqual(initialValue)
    expect(valB).toEqual(initialValue)
  })

  it('will update value in editor B when editor A writes something', async () => {
    await setDocumentValue(initialValue)
    const [editorA, editorB] = await getEditors()
    await editorA.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
    })
    await editorA.insertText(' world')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world',
            marks: [],
          },
        ],
      },
    ])
    const selectionA = await editorA.getSelection()
    const selectionB = await editorB.getSelection()
    expect(selectionA).toEqual({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      backward: false,
    })
    expect(selectionB).toEqual({
      anchor: {
        offset: 0,
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
      },
      focus: {
        offset: 0,
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
      },
      backward: false,
    })
  })

  it('should not remove content for both users if one user backspaces into a block that starts with a mark.', async () => {
    const exampleValue = [
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: ['strong'],
            text: 'Example Text: ',
          },
          {
            _type: 'span',
            marks: [],
            text: "This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent. This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent. This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent.",
            _key: 'randomKey2',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    await setDocumentValue(exampleValue)
    const [editorA, editorB] = await getEditors()
    await editorA.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey2'}],
        offset: 542,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey2'}],
        offset: 542,
      },
    })
    await editorA.pressKey('Enter')
    await editorA.pressKey('Backspace')

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: ['strong'],
            text: 'Example Text: ',
          },
          {
            _type: 'span',
            marks: [],
            text: "This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent. This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent. This is a very long example text that will completely disappear later on. It's kind of a bad magic trick, really. Just writing more text so the disappearance becomes more apparent.",
            _key: 'randomKey2',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  it('will reset the value when someone deletes everything, and when they start to type again, they will produce their own respective blocks.', async () => {
    await setDocumentValue(initialValue)
    const [editorA, editorB] = await getEditors()
    await editorA.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
    })
    await editorA.insertText(' world')
    let valA = await editorA.getValue()
    let valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world',
            marks: [],
          },
        ],
      },
    ])
    await editorA.pressKey('Backspace', 11)
    valA = await editorA.getValue()
    valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valA).toBe(undefined)
    await editorB.pressKey('1')
    valA = await editorA.getValue()
    valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valA).toMatchInlineSnapshot(`
      [
        {
          "_key": "B-9",
          "_type": "block",
          "children": [
            {
              "_key": "B-8",
              "_type": "span",
              "marks": [],
              "text": "1",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
    await editorA.pressKey('2')
    valA = await editorA.getValue()
    valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toMatchInlineSnapshot(`
      [
        {
          "_key": "B-9",
          "_type": "block",
          "children": [
            {
              "_key": "B-8",
              "_type": "span",
              "marks": [],
              "text": "12",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
  })

  it('will update value in editor A when editor B writes something', async () => {
    await setDocumentValue([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world',
            marks: [],
          },
        ],
      },
    ])
    const [editorA, editorB] = await getEditors()
    const desiredSelectionA = {
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
      backward: false,
    }
    await editorA.setSelection(desiredSelectionA)
    await editorB.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
    })
    await editorB.insertText(' there!')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world there!',
            marks: [],
          },
        ],
      },
    ])
    const selectionA = await editorA.getSelection()
    expect(selectionA).toEqual(desiredSelectionA)
    const selectionB = await editorB.getSelection()
    expect(selectionB).toEqual({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
      backward: false,
    })
  })

  it('will let editor A stay at the current position on line 1 while editor B inserts a new line below', async () => {
    await setDocumentValue([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world there!',
            marks: [],
          },
        ],
      },
    ])
    const [editorA, editorB] = await getEditors()
    const desiredSelectionA = {
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      backward: false,
    }
    await editorB.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 18,
      },
    })
    await editorA.setSelection(desiredSelectionA)
    await editorB.pressKey('Enter')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valB).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world there!',
            marks: [],
          },
        ],
      },
      {
        _key: 'B-6',
        _type: 'block',
        children: [
          {
            _key: 'B-5',
            _type: 'span',
            marks: [],
            text: '',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const selectionA = await editorA.getSelection()
    const selectionB = await editorB.getSelection()
    expect(selectionA).toEqual(desiredSelectionA)
    expect(selectionB).toEqual({
      anchor: {offset: 0, path: [{_key: 'B-6'}, 'children', {_key: 'B-5'}]},
      focus: {offset: 0, path: [{_key: 'B-6'}, 'children', {_key: 'B-5'}]},
      backward: false,
    })
  })

  it('will update value in editor A when editor B writes something while A stays on current line and position', async () => {
    await setDocumentValue([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world there!',
            marks: [],
          },
        ],
      },
      {
        _key: 'B-3',
        _type: 'block',
        children: [
          {
            _key: 'B-2',
            _type: 'span',
            marks: [],
            text: '',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const [editorA, editorB] = await getEditors()
    await editorA.setSelection({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
    })
    await editorB.setSelection({
      anchor: {offset: 0, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 0, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
    })
    await editorB.insertText("I'm writing here")
    await editorB.pressKey('!')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()

    expect(Array.isArray(valB)).toBe(true)
    if (!Array.isArray(valB)) {
      throw new Error('Editor value did not return an array') // For typescript, should throw from assertion above
    }

    expect(valA).toEqual(valB)
    expect(valB && valB[1]).toEqual({
      _key: 'B-3',
      _type: 'block',
      children: [
        {
          _key: 'B-2',
          _type: 'span',
          marks: [],
          text: "I'm writing here!",
        },
      ],
      markDefs: [],
      style: 'normal',
    })
    const selectionA = await editorA.getSelection()
    const selectionB = await editorB.getSelection()
    expect(selectionA).toEqual({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      backward: false,
    })
    expect(selectionB).toEqual({
      anchor: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      backward: false,
    })
  })

  it('will update value in editor B when editor A writes something while B stays on current line and position', async () => {
    await setDocumentValue([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world there!',
            marks: [],
          },
        ],
      },
      {
        _key: 'B-3',
        _type: 'block',
        children: [
          {
            _key: 'B-2',
            _type: 'span',
            marks: [],
            text: "I'm writing here!",
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const [editorA, editorB] = await getEditors()
    const startSelectionA = {
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 11,
      },
      backward: false,
    }
    await editorA.setSelection(startSelectionA)
    await editorB.setSelection({
      anchor: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
    })
    const selectionABefore = await editorA.getSelection()
    expect(selectionABefore).toEqual(startSelectionA)
    await editorA.insertText('<- I left off here. And you wrote that ->')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)

    if (!Array.isArray(valA)) {
      throw new Error('Editor value did not return an array') // For typescript, shouldn't happen
    }

    expect(valA[0]).toEqual({
      _key: 'randomKey0',
      _type: 'block',
      markDefs: [],
      style: 'normal',
      children: [
        {
          _key: 'randomKey1',
          _type: 'span',
          text: 'Hello world<- I left off here. And you wrote that -> there!',
          marks: [],
        },
      ],
    })
    const selectionA = await editorA.getSelection()
    const selectionB = await editorB.getSelection()
    expect(selectionA).toEqual({
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 52,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 52,
      },
      backward: false,
    })
    expect(selectionB).toEqual({
      anchor: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      backward: false,
    })
  })

  it('will let B stay on same line when A inserts a new line above', async () => {
    await setDocumentValue([
      {
        _key: 'randomKey0',
        _type: 'block',
        markDefs: [],
        style: 'normal',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello world<- I left off here. And you wrote that -> there!',
            marks: [],
          },
        ],
      },
      {
        _key: 'B-3',
        _type: 'block',
        children: [
          {
            _key: 'B-2',
            _type: 'span',
            marks: [],
            text: "I'm writing here!",
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const [editorA, editorB] = await getEditors()
    const valAa = await editorA.getValue()
    const valBb = await editorB.getValue()
    expect(valAa).toEqual(valBb)
    const newExpectedSelA = {
      anchor: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 52,
      },
      focus: {
        path: [{_key: 'randomKey0'}, 'children', {_key: 'randomKey1'}],
        offset: 52,
      },
      backward: false,
    }
    await editorA.setSelection(newExpectedSelA)
    const newSelA = await editorA.getSelection()
    expect(newExpectedSelA).toEqual(newSelA)
    await editorB.setSelection({
      anchor: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
    })
    await editorA.pressKey('Enter')
    const valA = await editorA.getValue()
    const valB = await editorB.getValue()
    expect(valA).toEqual(valB)
    expect(valA).toMatchInlineSnapshot(`
      [
        {
          "_key": "randomKey0",
          "_type": "block",
          "children": [
            {
              "_key": "randomKey1",
              "_type": "span",
              "marks": [],
              "text": "Hello world<- I left off here. And you wrote that ->",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
        {
          "_key": "A-6",
          "_type": "block",
          "children": [
            {
              "_key": "A-5",
              "_type": "span",
              "marks": [],
              "text": " there!",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
        {
          "_key": "B-3",
          "_type": "block",
          "children": [
            {
              "_key": "B-2",
              "_type": "span",
              "marks": [],
              "text": "I'm writing here!",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
    expect(await editorA.getSelection()).toMatchInlineSnapshot(`
      {
        "anchor": {
          "offset": 0,
          "path": [
            {
              "_key": "A-6",
            },
            "children",
            {
              "_key": "A-5",
            },
          ],
        },
        "backward": false,
        "focus": {
          "offset": 0,
          "path": [
            {
              "_key": "A-6",
            },
            "children",
            {
              "_key": "A-5",
            },
          ],
        },
      }
    `)
    await editorA.pressKey('Enter')
    const valAAfterSecondEnter = await editorA.getValue()
    expect(valAAfterSecondEnter).toMatchInlineSnapshot(`
      [
        {
          "_key": "randomKey0",
          "_type": "block",
          "children": [
            {
              "_key": "randomKey1",
              "_type": "span",
              "marks": [],
              "text": "Hello world<- I left off here. And you wrote that ->",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
        {
          "_key": "A-9",
          "_type": "block",
          "children": [
            {
              "_key": "A-8",
              "_type": "span",
              "marks": [],
              "text": "",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
        {
          "_key": "A-6",
          "_type": "block",
          "children": [
            {
              "_key": "A-5",
              "_type": "span",
              "marks": [],
              "text": " there!",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
        {
          "_key": "B-3",
          "_type": "block",
          "children": [
            {
              "_key": "B-2",
              "_type": "span",
              "marks": [],
              "text": "I'm writing here!",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
    const selectionA = await editorA.getSelection()
    expect(selectionA).toEqual({
      anchor: {path: [{_key: 'A-6'}, 'children', {_key: 'A-5'}], offset: 0},
      focus: {path: [{_key: 'A-6'}, 'children', {_key: 'A-5'}], offset: 0},
      backward: false,
    })
    const selectionB = await editorB.getSelection()
    expect(selectionB).toEqual({
      anchor: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      focus: {offset: 17, path: [{_key: 'B-3'}, 'children', {_key: 'B-2'}]},
      backward: false,
    })
  })

  it('diffMatchPatch works as expected', async () => {
    await setDocumentValue([
      {
        _key: '26901064a3c9',
        _type: 'block',
        children: [
          {
            _key: 'b629e8140c25',
            _type: 'span',
            marks: [],
            text: 'pweoirrporiwpweporiwproi wer',
          },
          {
            _key: 'ef4627c1c11b',
            _type: 'span',
            marks: ['strong'],
            text: 'poiwyuXty45........ytutyy666uerpwer1',
          },
          {
            _key: '7d3c9bcc9c10',
            _type: 'span',
            marks: [],
            text: 'weuirwer werewopri',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const selectionA = {
      anchor: {
        path: [{_key: '26901064a3c9'}, 'children', {_key: 'ef4627c1c11b'}],
        offset: 15,
      },
      focus: {
        path: [{_key: '26901064a3c9'}, 'children', {_key: 'ef4627c1c11b'}],
        offset: 15,
      },
    }
    const [editorA, editorB] = await getEditors()
    await editorA.setSelection(selectionA)
    await editorA.insertText('!')
    const valueB = await editorB.getValue()
    expect(valueB).toMatchInlineSnapshot(`
      [
        {
          "_key": "26901064a3c9",
          "_type": "block",
          "children": [
            {
              "_key": "b629e8140c25",
              "_type": "span",
              "marks": [],
              "text": "pweoirrporiwpweporiwproi wer",
            },
            {
              "_key": "ef4627c1c11b",
              "_type": "span",
              "marks": [
                "strong",
              ],
              "text": "poiwyuXty45....!....ytutyy666uerpwer1",
            },
            {
              "_key": "7d3c9bcc9c10",
              "_type": "span",
              "marks": [],
              "text": "weuirwer werewopri",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
    const valueA = await editorA.getValue()
    expect(valueA).toEqual(valueB)
    const newSelectionA = await editorA.getSelection()
    expect(newSelectionA).toEqual({
      anchor: {
        path: [{_key: '26901064a3c9'}, 'children', {_key: 'ef4627c1c11b'}],
        offset: 16,
      },
      focus: {
        path: [{_key: '26901064a3c9'}, 'children', {_key: 'ef4627c1c11b'}],
        offset: 16,
      },
      backward: false,
    })
  })
  it('will not result in duplicate keys when overwriting some partial bold text line, as the only content in the editor', async () => {
    const [editorA, editorB] = await getEditors()
    await editorA.insertText('Hey')
    await editorA.toggleDecoratorUsingKeyboard('strong')
    await editorA.insertText('there')
    const valA = await editorA.getValue()
    if (!valA || !Array.isArray(valA[0].children)) {
      throw new Error('Unexpected value')
    }
    await editorA.setSelection({
      anchor: {
        path: [
          {_key: valA[0]._key},
          'children',
          {_key: valA[0].children[0]._key},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: valA[0]._key},
          'children',
          {_key: valA[0].children[1]._key},
        ],
        offset: 5,
      },
    })
    await editorA.insertText('1')
    const newValA = await editorA.getValue()
    expect(newValA).toMatchInlineSnapshot(`
      [
        {
          "_key": "A-4",
          "_type": "block",
          "children": [
            {
              "_key": "A-3",
              "_type": "span",
              "marks": [],
              "text": "1",
            },
          ],
          "markDefs": [],
          "style": "normal",
        },
      ]
    `)
    const valB = await editorB.getValue()
    expect(newValA).toEqual(valB)
  })
})
