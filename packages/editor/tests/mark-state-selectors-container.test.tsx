import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {getActiveAnnotations} from '../src/selectors/selector.get-active-annotations'
import {getActiveDecorators} from '../src/selectors/selector.get-active-decorators'
import {getMarkState} from '../src/selectors/selector.get-mark-state'
import {isActiveAnnotation} from '../src/selectors/selector.is-active-annotation'
import {isActiveDecorator} from '../src/selectors/selector.is-active-decorator'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
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

describe('mark-state selectors — container awareness', () => {
  test('getMarkState reports decorator marks of the focused span inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const plainSpanKey = keyGenerator()
    const strongSpanKey = keyGenerator()
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
                {
                  _type: 'span',
                  _key: plainSpanKey,
                  text: 'plain ',
                  marks: [],
                },
                {
                  _type: 'span',
                  _key: strongSpanKey,
                  text: 'bold',
                  marks: ['strong'],
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

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const insideStrong = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: strongSpanKey},
      ],
      offset: 2,
    }

    editor.send({
      type: 'select',
      at: {anchor: insideStrong, focus: insideStrong},
    })

    const snapshot = editor.getSnapshot()

    expect(getMarkState(snapshot)).toEqual({
      state: 'unchanged',
      marks: ['strong'],
    })
    expect(getActiveDecorators(snapshot)).toEqual(['strong'])
    expect(isActiveDecorator('strong')(snapshot)).toEqual(true)
    expect(isActiveDecorator('em')(snapshot)).toEqual(false)
  })

  test('getActiveAnnotations and isActiveAnnotation see annotations inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const linkedSpanKey = keyGenerator()
    const linkKey = 'link-1'
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

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const insideLink = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: linkedSpanKey},
      ],
      offset: 3,
    }

    editor.send({
      type: 'select',
      at: {anchor: insideLink, focus: insideLink},
    })

    const snapshot = editor.getSnapshot()

    expect(getActiveAnnotations(snapshot)).toEqual([
      {_type: 'link', _key: linkKey, href: 'https://example.com'},
    ])
    expect(isActiveAnnotation('link')(snapshot)).toEqual(true)
  })
})
