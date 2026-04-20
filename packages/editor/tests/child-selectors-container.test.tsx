import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {getAnchorChild} from '../src/selectors/selector.get-anchor-child'
import {getAnchorSpan} from '../src/selectors/selector.get-anchor-span'
import {getFocusChild} from '../src/selectors/selector.get-focus-child'
import {getFocusInlineObject} from '../src/selectors/selector.get-focus-inline-object'
import {getFocusSpan} from '../src/selectors/selector.get-focus-span'
import {getNextSpan} from '../src/selectors/selector.get-next-span'
import {getPreviousSpan} from '../src/selectors/selector.get-previous-span'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
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

describe('child and span selectors — container awareness', () => {
  test('getFocusChild, getFocusSpan, and getAnchorChild resolve at depth', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const {editor} = await createTestEditor({
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
                {_type: 'span', _key: span1Key, text: 'foo', marks: ['strong']},
                {_type: 'span', _key: span2Key, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const span2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: span2Key},
      ],
      offset: 1,
    }

    editor.send({
      type: 'select',
      at: {anchor: span2Point, focus: span2Point},
    })

    const snapshot = editor.getSnapshot()

    const focusChild = getFocusChild(snapshot)
    expect(focusChild?.node._key).toEqual(span2Key)
    expect(focusChild?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: span2Key},
    ])

    const focusSpan = getFocusSpan(snapshot)
    expect(focusSpan?.node._key).toEqual(span2Key)

    const anchorChild = getAnchorChild(snapshot)
    expect(anchorChild?.node._key).toEqual(span2Key)

    const anchorSpan = getAnchorSpan(snapshot)
    expect(anchorSpan?.node._key).toEqual(span2Key)
  })

  test('getFocusInlineObject resolves an inline object inside a container line', async () => {
    const inlineSchemaDefinition = defineSchema({
      inlineObjects: [{name: 'stock-ticker'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    })

    const inlineContainer = defineContainer<typeof inlineSchemaDefinition>({
      scope: '$..code-block',
      field: 'lines',
      render: ({attributes, children}) => (
        <pre data-testid="code-block" {...attributes}>
          {children}
        </pre>
      ),
    })

    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const tickerKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: inlineSchemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
                {_type: 'stock-ticker', _key: tickerKey},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[inlineContainer]} />,
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const tickerPoint = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: tickerKey},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: tickerPoint, focus: tickerPoint},
    })

    const snapshot = editor.getSnapshot()

    const inlineObject = getFocusInlineObject(snapshot)
    expect(inlineObject?.node._key).toEqual(tickerKey)
    expect(inlineObject?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: tickerKey},
    ])
  })

  test('getNextSpan and getPreviousSpan walk within the focus text block at depth', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const span3Key = keyGenerator()
    const {editor} = await createTestEditor({
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
                {_type: 'span', _key: span1Key, text: 'a', marks: []},
                {_type: 'span', _key: span2Key, text: 'b', marks: ['strong']},
                {_type: 'span', _key: span3Key, text: 'c', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const span2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: span2Key},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: span2Point, focus: span2Point},
    })

    const snapshot = editor.getSnapshot()

    const next = getNextSpan(snapshot)
    expect(next?.node._key).toEqual(span3Key)
    expect(next?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: span3Key},
    ])

    const previous = getPreviousSpan(snapshot)
    expect(previous?.node._key).toEqual(span1Key)
    expect(previous?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: span1Key},
    ])
  })
})
