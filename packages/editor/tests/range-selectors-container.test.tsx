import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {getSelectedBlocks} from '../src/selectors/selector.get-selected-blocks'
import {getSelectedChildren} from '../src/selectors/selector.get-selected-children'
import {getSelectedSpans} from '../src/selectors/selector.get-selected-spans'
import {getSelectedTextBlocks} from '../src/selectors/selector.get-selected-text-blocks'
import {getSelectedValue} from '../src/selectors/selector.get-selected-value'
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

describe('range selectors — container awareness', () => {
  test('range selectors resolve at correct depth when selection is inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line3Key = keyGenerator()
    const line3SpanKey = keyGenerator()
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
                {_type: 'span', _key: line1SpanKey, text: 'aaa', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bbb', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: 'ccc', marks: []},
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
      offset: 1,
    }
    const focus = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line3Key},
        'children',
        {_key: line3SpanKey},
      ],
      offset: 2,
    }

    editor.send({
      type: 'select',
      at: {anchor, focus},
    })

    const snapshot = editor.getSnapshot()

    const blocks = getSelectedBlocks(snapshot)
    expect(blocks.map((b) => b.node._key)).toEqual([codeBlockKey])
    expect(blocks[0]?.path).toEqual([{_key: codeBlockKey}])

    const textBlocks = getSelectedTextBlocks(snapshot)
    expect(textBlocks.map((b) => b.node._key)).toEqual([
      line1Key,
      line2Key,
      line3Key,
    ])

    const spans = getSelectedSpans(snapshot)
    expect(spans.map((s) => s.node._key)).toEqual([
      line1SpanKey,
      line2SpanKey,
      line3SpanKey,
    ])
    expect(spans[0]?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line1Key},
      'children',
      {_key: line1SpanKey},
    ])

    const children = getSelectedChildren()(snapshot)
    expect(children.map((c) => c.node._key)).toEqual([
      line1SpanKey,
      line2SpanKey,
      line3SpanKey,
    ])
  })

  test('getSelectedValue preserves the container when the selection is wholly inside it', async () => {
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

    const value = getSelectedValue(snapshot)
    expect(value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: line1Key,
            children: [
              {_type: 'span', _key: line1SpanKey, text: 'llo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: line2Key,
            children: [
              {_type: 'span', _key: line2SpanKey, text: 'wor', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })
})
