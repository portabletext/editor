import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {useState} from 'react'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {cdp, server, userEvent} from 'vitest/browser'
import type {Decorator} from '../src/renderers/renderer.types'

const isChromium = server.browser === 'chromium'
const originalUserAgent = navigator.userAgent

if (isChromium) {
  // `IS_ANDROID` is read from `navigator.userAgent` when the engine module
  // loads, so the override has to land before the editor is imported.
  await cdp().send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  })
}

const {defineContainer, defineDecorator} = await import('../src')
const {NodePlugin} = await import('../src/plugins/plugin.node')
const {createTestEditor} = await import('../src/test/vitest')

afterAll(async () => {
  if (isChromium) {
    await cdp().send('Emulation.setUserAgentOverride', {
      userAgent: originalUserAgent,
    })
  }
})

const errors: Array<string> = []
const recordWindowError = (event: ErrorEvent) => {
  errors.push(`window.error: ${String(event.error ?? event.message)}`)
}

beforeEach(() => {
  errors.length = 0
  window.addEventListener('error', recordWindowError)
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(`console.error: ${args.map(String).join(' ')}`)
  })
})

afterEach(() => {
  window.removeEventListener('error', recordWindowError)
  vi.restoreAllMocks()
})

describe.skipIf(!isChromium)(
  'Engine re-renders that commit between restores on Android',
  () => {
    test('Scenario: The placeholder that appears after deleting the last character', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        editableProps: {
          renderPlaceholder: () => <span data-placeholder="">foo</span>,
        },
      })
      await userEvent.click(locator)

      await cdp().send('Input.insertText', {text: 'b'})
      await vi.waitFor(() => {
        expect(locator.element().querySelector('[data-placeholder]')).toEqual(
          null,
        )
      })

      await userEvent.keyboard('{Backspace}')
      await vi.waitFor(() => {
        expect(
          locator.element().querySelector('[data-placeholder]')?.textContent,
        ).toEqual('foo')
      })

      await cdp().send('Input.insertText', {text: 'b'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'b', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('b')
      })
      expect(locator.element().querySelector('[data-placeholder]')).toEqual(
        null,
      )
      expect(errors).toEqual([])
    })

    test('Scenario: A decorator render that adds a node when the caret moves into it', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const strongDecorator = defineDecorator({
        type: 'strong',
        render: ({children, focused}) => (
          <strong>
            {children}
            {focused ? (
              <span data-focused-badge="" contentEditable={false}>
                *
              </span>
            ) : null}
          </strong>
        ),
      })
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: ['strong']},
              {_key: barKey, _type: 'span', text: ' bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <NodePlugin nodes={[strongDecorator]} />,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 2,
          },
        },
      })
      await vi.waitFor(() => {
        expect(locator.element().querySelector('[data-focused-badge]')).toEqual(
          null,
        )
      })

      openUserInputWindow(locator.element())
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(
          locator.element().querySelector('[data-focused-badge]')?.textContent,
        ).toEqual('*')
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'fXoo', marks: ['strong']},
              {_key: barKey, _type: 'span', text: ' bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(
          Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
            (element) => element.textContent,
          ),
        ).toEqual(['fXoo', ' bar'])
      })
      expect(
        locator.element().querySelector('[data-focused-badge]')?.textContent,
      ).toEqual('*')
      expect(errors).toEqual([])
    })

    test('Scenario: A decorator render that adds a node when the caret moves into it in a container whose text blocks have their own sub-schema', async () => {
      const keyGenerator = createTestKeyGenerator()
      const noteKey = keyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const emDecorator = defineDecorator({
        type: 'em',
        render: ({children, focused}) => (
          <em>
            {children}
            {focused ? (
              <span data-focused-badge="" contentEditable={false}>
                *
              </span>
            ) : null}
          </em>
        ),
      })
      const noteContainer = defineContainer({
        type: 'note',
        arrayField: 'content',
        render: ({attributes, children}) => (
          <div {...attributes}>{children}</div>
        ),
      })
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
          blockObjects: [
            {
              name: 'note',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [{name: 'normal'}, {name: 'h1'}],
                      decorators: [{name: 'em'}],
                      annotations: [{name: 'comment'}],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        initialValue: [
          {
            _key: noteKey,
            _type: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: fooKey, _type: 'span', text: 'foo', marks: ['em']},
                  {_key: barKey, _type: 'span', text: ' bar', marks: []},
                ],
                markDefs: [],
                style: 'h1',
              },
            ],
          },
        ],
        children: <NodePlugin nodes={[noteContainer, emDecorator]} />,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: noteKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: barKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: noteKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: barKey},
            ],
            offset: 2,
          },
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(2)
      })
      expect(locator.element().querySelector('[data-focused-badge]')).toEqual(
        null,
      )

      openUserInputWindow(locator.element())
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: noteKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: fooKey},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: noteKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: fooKey},
            ],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(
          locator.element().querySelector('[data-focused-badge]')?.textContent,
        ).toEqual('*')
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: noteKey,
            _type: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: fooKey, _type: 'span', text: 'fXoo', marks: ['em']},
                  {_key: barKey, _type: 'span', text: ' bar', marks: []},
                ],
                markDefs: [],
                style: 'h1',
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(
          Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
            (element) => element.textContent,
          ),
        ).toEqual(['fXoo', ' bar'])
      })
      expect(
        locator.element().querySelector('[data-focused-badge]')?.textContent,
      ).toEqual('*')
      expect(errors).toEqual([])
    })

    test('Scenario: Registering a decorator right after input', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const strongDecorator = defineDecorator({
        type: 'strong',
        render: ({children}) => <strong data-registered="">{children}</strong>,
      })
      let registerDecorators: (decorators: Array<Decorator>) => void = () => {}
      function DecoratorRegistrations() {
        'use no memo'
        const [decorators, setDecorators] = useState<Array<Decorator>>([])
        registerDecorators = setDecorators
        return <NodePlugin nodes={decorators} />
      }
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: ['strong']},
              {_key: barKey, _type: 'span', text: ' bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <DecoratorRegistrations />,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 2,
          },
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(2)
      })

      openUserInputWindow(locator.element())
      registerDecorators([strongDecorator])
      await vi.waitFor(() => {
        expect(
          locator.element().querySelector('[data-registered]')?.textContent,
        ).toEqual('foo')
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: ['strong']},
              {_key: barKey, _type: 'span', text: ' bXar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(
          Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
            (element) => element.textContent,
          ),
        ).toEqual(['foo', ' bXar'])
      })
      expect(
        locator.element().querySelector('[data-registered]')?.textContent,
      ).toEqual('foo')
      expect(errors).toEqual([])
    })
  },
)

// `restoreDOM` only buffers mutations that land within one animation frame
// of a `beforeinput`. An input type the editor does not handle opens that
// window without changing the value, so the next change is not typing.
function openUserInputWindow(element: Element) {
  element.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType: 'formatBold',
      bubbles: true,
      cancelable: true,
    }),
  )
}
