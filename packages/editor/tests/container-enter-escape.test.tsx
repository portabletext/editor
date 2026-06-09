import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const codeBlockSchema = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const codeBlockContainer = defineContainer({
  type: 'code-block',
  arrayField: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

const calloutSchema = defineSchema({
  lists: [{name: 'bullet'}, {name: 'number'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({children}) => <>{children}</>,
})

describe('container Enter escape', () => {
  test('Scenario: Enter on empty last line with empty previous sibling escapes to editor root', async () => {
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
      schemaDefinition: codeBlockSchema,
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
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line3Key},
            'children',
            {_key: line3SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line3Key},
            'children',
            {_key: line3SpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
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
          ],
        },
        {
          _type: 'block',
          _key: 'k9',
          children: [{_type: 'span', _key: 'k10', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Enter on empty last line with non-empty previous sibling does NOT escape', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: codeBlockSchema,
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
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
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
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Enter on empty trailing list item clears the list marker before container-escape kicks in', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const item1Key = keyGenerator()
    const span1Key = keyGenerator()
    const item2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: item1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'First item', marks: []},
              ],
              markDefs: [],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: item2Key,
              children: [{_type: 'span', _key: span2Key, text: '', marks: []}],
              markDefs: [],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: item2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: item2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: item1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'First item', marks: []},
              ],
              markDefs: [],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: item2Key,
              children: [{_type: 'span', _key: span2Key, text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: item1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'First item', marks: []},
              ],
              markDefs: [],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k9',
          children: [{_type: 'span', _key: 'k10', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
