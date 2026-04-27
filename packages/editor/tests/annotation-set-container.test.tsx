import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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

describe('annotation.set inside an editable container', () => {
  test('updating an annotation inside a container line applies the new props to that line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const linkedSpanKey = keyGenerator()
    const linkKey = 'link-1'
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
                  _key: linkedSpanKey,
                  text: 'clickme',
                  marks: [linkKey],
                },
              ],
              markDefs: [
                {_type: 'link', _key: linkKey, href: 'https://example.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    // Put the caret inside the linked span (so selectors can resolve it).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: linkedSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: linkedSpanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'annotation.set',
      at: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'markDefs',
        {_key: linkKey},
      ],
      props: {href: 'https://updated.example'},
    })

    const snapshot = editor.getSnapshot()

    expect(snapshot.context.value).toEqual([
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
                _key: linkedSpanKey,
                text: 'clickme',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_type: 'link', _key: linkKey, href: 'https://updated.example'},
            ],
            style: 'normal',
          },
        ],
      },
    ])
  })
})
