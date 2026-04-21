import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
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

describe('container arrow navigation', () => {
  test('ArrowDown at end of last code-block line moves caret to following root text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const afterBlockKey = keyGenerator()
    const afterSpanKey = keyGenerator()

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
                {_type: 'span', _key: lineSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: afterBlockKey,
          children: [
            {_type: 'span', _key: afterSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    // Position caret at end of the code-block line.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{ArrowDown}')

    const selection = editor.getSnapshot().context.selection
    expect(selection).toEqual({
      anchor: {
        path: [{_key: afterBlockKey}, 'children', {_key: afterSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: afterBlockKey}, 'children', {_key: afterSpanKey}],
        offset: 0,
      },
      backward: false,
    })
  })

  test('ArrowUp at start of first code-block line moves caret to preceding root text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const beforeBlockKey = keyGenerator()
    const beforeSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: beforeBlockKey,
          children: [
            {_type: 'span', _key: beforeSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'foo', marks: []},
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{ArrowUp}')

    const selection = editor.getSnapshot().context.selection
    expect(selection).toEqual({
      anchor: {
        path: [{_key: beforeBlockKey}, 'children', {_key: beforeSpanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: beforeBlockKey}, 'children', {_key: beforeSpanKey}],
        offset: 3,
      },
      backward: false,
    })
  })

  test('ArrowDown at end of last line when code-block is the only root block does nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

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
                {_type: 'span', _key: lineSpanKey, text: 'foo', marks: []},
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{ArrowDown}')

    // No new root block. Value unchanged (no orphan text node inserted).
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: lineSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('ArrowDown in the middle of a span inside a container is handled natively', async () => {
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

    // Caret on line 1 (not last line). ArrowDown should NOT be intercepted.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{ArrowDown}')

    // Browser handles natively → caret should land inside the container, not
    // at line 1 offset 0 (which would be the guard misfiring, overriding DOM).
    const selection = editor.getSnapshot().context.selection
    // The exact landing point depends on browser DOM line-geometry, but it
    // must NOT still be at offset 0 of line1 (that would be the misfire).
    expect(
      selection?.focus.path[0] &&
        typeof selection.focus.path[0] === 'object' &&
        '_key' in selection.focus.path[0]
        ? selection.focus.path[0]._key === codeBlockKey &&
            selection.focus.offset === 0 &&
            (selection.focus.path[4] as {_key: string})._key === line1SpanKey
        : true,
    ).toEqual(false)
  })
})
