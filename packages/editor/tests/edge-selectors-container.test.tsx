import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {isOverlappingSelection} from '../src/selectors/selector.is-overlapping-selection'
import {isPointAfterSelection} from '../src/selectors/selector.is-point-after-selection'
import {isPointBeforeSelection} from '../src/selectors/selector.is-point-before-selection'
import {createTestEditor} from '../src/test/vitest'
import {comparePoints} from '../src/utils/util.compare-points'

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

describe('edge selectors — container awareness', () => {
  test('comparePoints resolves document order across container lines', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
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
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const snapshot = editor.getSnapshot()

    const line1Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 1,
    }
    const line2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 2,
    }
    const line1PointEnd = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 3,
    }

    expect(comparePoints(snapshot, line1Point, line2Point)).toEqual(-1)
    expect(comparePoints(snapshot, line2Point, line1Point)).toEqual(1)
    expect(comparePoints(snapshot, line1Point, line1Point)).toEqual(0)
    expect(comparePoints(snapshot, line1Point, line1PointEnd)).toEqual(-1)
  })

  test('isPointBeforeSelection and isPointAfterSelection work across container lines', async () => {
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

    const line1Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 0,
    }
    const line3Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line3Key},
        'children',
        {_key: line3SpanKey},
      ],
      offset: 1,
    }

    expect(isPointBeforeSelection(line1Point)(snapshot)).toEqual(true)
    expect(isPointAfterSelection(line1Point)(snapshot)).toEqual(false)
    expect(isPointBeforeSelection(line3Point)(snapshot)).toEqual(false)
    expect(isPointAfterSelection(line3Point)(snapshot)).toEqual(true)
  })

  test('isOverlappingSelection detects overlap inside a container', async () => {
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
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const editorAnchor = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 1,
    }
    const editorFocus = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 2,
    }

    editor.send({
      type: 'select',
      at: {anchor: editorAnchor, focus: editorFocus},
    })

    const snapshot = editor.getSnapshot()

    const overlappingSelection = {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 2,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 1,
      },
    }

    const nonOverlappingSelection = {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 1,
      },
    }

    expect(isOverlappingSelection(overlappingSelection)(snapshot)).toEqual(true)
    expect(isOverlappingSelection(nonOverlappingSelection)(snapshot)).toEqual(
      false,
    )
  })
})
