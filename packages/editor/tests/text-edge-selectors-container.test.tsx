import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {getCaretWordSelection} from '../src/selectors/selector.get-caret-word-selection'
import {getSelectionText} from '../src/selectors/selector.get-selection-text'
import {getBlockTextAfter} from '../src/selectors/selector.get-text-after'
import {getBlockTextBefore} from '../src/selectors/selector.get-text-before'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

describe('text-edge selectors — container awareness', () => {
  test('getBlockTextBefore and getBlockTextAfter read text in the container line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const midPoint = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: spanKey},
      ],
      offset: 6,
    }

    editor.send({
      type: 'select',
      at: {anchor: midPoint, focus: midPoint},
    })

    const snapshot = editor.getSnapshot()

    expect(getBlockTextBefore(snapshot)).toEqual('hello ')
    expect(getBlockTextAfter(snapshot)).toEqual('world')
  })

  test('getSelectionText returns text of a selection spanning container lines', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'world', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const anchor = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 2,
    }
    const focus = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 3,
    }

    editor.send({
      type: 'select',
      at: {anchor, focus},
    })

    const snapshot = editor.getSnapshot()

    expect(getSelectionText(snapshot)).toEqual('llowor')
  })

  test('getCaretWordSelection finds the word under the caret inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'the quick brown',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const caretInQuick = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: spanKey},
      ],
      offset: 6,
    }

    editor.send({
      type: 'select',
      at: {anchor: caretInQuick, focus: caretInQuick},
    })

    const snapshot = editor.getSnapshot()

    const wordSelection = getCaretWordSelection(snapshot)

    expect(wordSelection).toEqual({
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: spanKey},
        ],
        offset: 4,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: spanKey},
        ],
        offset: 9,
      },
    })
  })
})
