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
  test('ArrowDown at end of last line of only-root code-block does not produce orphan text', async () => {
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
    await userEvent.keyboard('x')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: codeBlockKey,
        _type: 'code-block',
        lines: [
          {
            _key: lineKey,
            _type: 'block',
            children: [
              {_key: lineSpanKey, _type: 'span', marks: [], text: 'foox'},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('ArrowUp at start of first line of only-root code-block does not produce orphan text', async () => {
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
    await userEvent.keyboard('x')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: codeBlockKey,
        _type: 'code-block',
        lines: [
          {
            _key: lineKey,
            _type: 'block',
            children: [
              {_key: lineSpanKey, _type: 'span', marks: [], text: 'xfoo'},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })
})
