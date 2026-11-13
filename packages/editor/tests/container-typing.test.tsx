import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
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
  render: ({attributes, children}) => (
    <div data-testid="callout" {...attributes}>
      {children}
    </div>
  ),
})

const childrenFieldSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {name: 'title', type: 'string'},
        {name: 'children', type: 'array', of: [{type: 'block'}]},
      ],
    },
  ],
})

const childrenFieldNodes = [
  defineContainer({
    type: 'callout',
    arrayField: 'children',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('typing inside containers', () => {
  test('Scenario: Multi-character keyboard input inside a container lands in the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    const calloutElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="callout"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(calloutElement)
    await userEvent.keyboard('hello')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'hello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Typing in a children container emits only its nested text diff', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()

    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const nestedPath1 = [
      {_key: calloutKey},
      'children',
      {_key: innerBlockKey},
      'children',
      {_key: innerSpanKey},
    ]

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      callout(calloutKey, innerBlockKey, innerSpanKey, 'inside'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <>
          <NodePlugin nodes={childrenFieldNodes} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooinsidebar')
    })
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: nestedPath1, offset: 3},
        focus: {path: nestedPath1, offset: 3},
      },
    })
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(applyAll(initialValue, patches)).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          title: 'T',
          children: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'insxide', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [
            {_key: calloutKey},
            'children',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
            'text',
          ],
          value: '@@ -1,6 +1,7 @@\n ins\n+x\n ide\n',
        },
      ])
    })
  })
})

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function callout(key: string, blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'callout',
    _key: key,
    title: 'T',
    children: [textBlock(blockKey, spanKey, text)],
  }
}
