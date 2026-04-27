import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {getAnchorBlock} from '../src/selectors/selector.get-anchor-block'
import {getAnchorTextBlock} from '../src/selectors/selector.get-anchor-text-block'
import {getFirstBlock} from '../src/selectors/selector.get-first-block'
import {getFocusBlock} from '../src/selectors/selector.get-focus-block'
import {getFocusBlockObject} from '../src/selectors/selector.get-focus-block-object'
import {getFocusTextBlock} from '../src/selectors/selector.get-focus-text-block'
import {getLastBlock} from '../src/selectors/selector.get-last-block'
import {getNextBlock} from '../src/selectors/selector.get-next-block'
import {getPreviousBlock} from '../src/selectors/selector.get-previous-block'
import {getSelectionEndBlock} from '../src/selectors/selector.get-selection-end-block'
import {getSelectionStartBlock} from '../src/selectors/selector.get-selection-start-block'
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

describe('block selectors — container awareness', () => {
  test('getFocusBlock returns the innermost block when focus is inside a container', async () => {
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
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
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

    const line2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 1,
    }

    editor.send({
      type: 'select',
      at: {anchor: line2Point, focus: line2Point},
    })

    const snapshot = editor.getSnapshot()
    const block = getFocusBlock(snapshot)

    expect(block?.node._key).toEqual(line2Key)
    expect(block?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line2Key},
    ])

    const textBlock = getFocusTextBlock(snapshot)
    expect(textBlock?.node._key).toEqual(line2Key)
    expect(textBlock?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line2Key},
    ])

    const blockObject = getFocusBlockObject(snapshot)
    expect(blockObject).toEqual(undefined)
  })

  test('getAnchorBlock and getAnchorTextBlock resolve at depth', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
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
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const line1Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 2,
    }

    editor.send({
      type: 'select',
      at: {anchor: line1Point, focus: line1Point},
    })

    const snapshot = editor.getSnapshot()

    const anchorBlock = getAnchorBlock(snapshot)
    expect(anchorBlock?.node._key).toEqual(line1Key)
    expect(anchorBlock?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line1Key},
    ])

    const anchorTextBlock = getAnchorTextBlock(snapshot)
    expect(anchorTextBlock?.node._key).toEqual(line1Key)

    const startBlock = getSelectionStartBlock(snapshot)
    expect(startBlock?.node._key).toEqual(line1Key)

    const endBlock = getSelectionEndBlock(snapshot)
    expect(endBlock?.node._key).toEqual(line1Key)
  })

  test('getNextBlock and getPreviousBlock walk container siblings and stay within scope', async () => {
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
                {_type: 'span', _key: line1SpanKey, text: 'a', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'b', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: 'c', marks: []},
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

    const line2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: line2Point, focus: line2Point},
    })

    const snapshot = editor.getSnapshot()

    const next = getNextBlock(snapshot)
    expect(next?.node._key).toEqual(line3Key)
    expect(next?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line3Key},
    ])

    const previous = getPreviousBlock(snapshot)
    expect(previous?.node._key).toEqual(line1Key)
    expect(previous?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line1Key},
    ])
  })

  test('getNextBlock returns undefined at the last line of a container (does not cross boundary)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()
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
                {_type: 'span', _key: lineSpanKey, text: 'only', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: trailingBlockKey,
          children: [
            {_type: 'span', _key: trailingSpanKey, text: 'after', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const linePoint = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: lineSpanKey},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: linePoint, focus: linePoint},
    })

    const snapshot = editor.getSnapshot()

    expect(getNextBlock(snapshot)).toEqual(undefined)
    expect(getPreviousBlock(snapshot)).toEqual(undefined)
  })

  test('getFirstBlock and getLastBlock return the first/last block of the enclosing container', async () => {
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
                {_type: 'span', _key: line1SpanKey, text: 'a', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'b', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: 'c', marks: []},
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

    const line2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: line2Point, focus: line2Point},
    })

    const snapshot = editor.getSnapshot()

    const first = getFirstBlock(snapshot)
    expect(first?.node._key).toEqual(line1Key)
    expect(first?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line1Key},
    ])

    const last = getLastBlock(snapshot)
    expect(last?.node._key).toEqual(line3Key)
    expect(last?.path).toEqual([
      {_key: codeBlockKey},
      'lines',
      {_key: line3Key},
    ])
  })

  test('getFirstBlock and getLastBlock fall back to document scope when focus is at root', async () => {
    const rootSchemaDefinition = defineSchema({})
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: rootSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
      },
    })

    const snapshot = editor.getSnapshot()

    const first = getFirstBlock(snapshot)
    expect(first?.node._key).toEqual(block1Key)
    expect(first?.path).toEqual([{_key: block1Key}])

    const last = getLastBlock(snapshot)
    expect(last?.node._key).toEqual(block2Key)
    expect(last?.path).toEqual([{_key: block2Key}])
  })
})
