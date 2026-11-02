import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  createRef,
  Fragment,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
} from 'react'
import {flushSync} from 'react-dom'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {render} from 'vitest-browser-react'
import {cdp, page, server, userEvent} from 'vitest/browser'
import type {
  Container,
  DecorationRenderProps,
  Editor,
  EditorSnapshot,
  Path,
  RangeDecoration,
} from '../src'

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

const {
  EditorProvider,
  PortableTextEditable,
  defineContainer,
  useEditor,
  useEditorSelector,
} = await import('../src')
const {EditorRefPlugin} = await import('../src/plugins/plugin.editor-ref')
const {NodePlugin} = await import('../src/plugins/plugin.node')
const {getNodes} = await import('../src/traversal/get-nodes')
const {blockOffsetsToSelection, getTextBlockText, isTextBlock} =
  await import('../src/utils')

afterAll(async () => {
  if (isChromium) {
    await cdp().send('Emulation.setUserAgentOverride', {
      userAgent: originalUserAgent,
    })
  }
})

const calloutSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
  ],
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

const noteSchemaDefinition = defineSchema({
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
})

const noteContainer = defineContainer({
  type: 'note',
  arrayField: 'content',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
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
  'Range decorations that change while composing on Android',
  () => {
    test('Scenario: A decoration on the composing word and on the text before it appears mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) =>
          text.includes('きょう')
            ? ['foo', 'きょう', '今日']
            : ['きょう', '今日'],
      })
      await placeCaret(editor, blockKey, spanKey, 4)

      const composingNode = await compose(locator, 'foo きょう')

      expect(composingNode.isConnected).toEqual(true)
      expect(window.getSelection()?.anchorNode).toBe(composingNode)
      expect(decorated(locator)).toEqual([])

      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['今日'])
      })
      expect(locator.element().textContent).toEqual('foo 今日')
      expect(errors).toEqual([])
    })

    test('Scenario: A decoration in another span of the block appears mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const barKey = keyGenerator()
      const fooKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: barKey, _type: 'span', text: 'bar ', marks: ['strong']},
              {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) =>
          text.includes('きょう')
            ? ['bar', 'きょう', '今日']
            : ['きょう', '今日'],
      })
      await placeCaret(editor, blockKey, fooKey, 4)

      const composingNode = await compose(locator, 'bar foo きょう')

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['bar'])
      })
      expect(composingNode.isConnected).toEqual(true)
      expect(window.getSelection()?.anchorNode).toBe(composingNode)

      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: barKey, _type: 'span', text: 'bar ', marks: ['strong']},
              {_key: fooKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['今日'])
      })
      expect(locator.element().textContent).toEqual('bar foo 今日')
      expect(errors).toEqual([])
    })
  },
)

describe.skipIf(!isChromium)(
  'Range decorations that change while composing in nested text blocks on Android',
  () => {
    test('Scenario: A decoration on the composing word and on the text before it appears mid-composition in a text block inside a container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        containers: [calloutContainer],
        initialValue: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'foo ', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        decoratedWords: (text) =>
          text.includes('きょう')
            ? ['foo', 'きょう', '今日']
            : ['きょう', '今日'],
      })
      await placeCaretAt(
        editor,
        [
          {_key: calloutKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        4,
      )

      const composingNode = await compose(locator, 'foo きょう')

      expect(composingNode.isConnected).toEqual(true)
      expect(window.getSelection()?.anchorNode).toBe(composingNode)
      expect(decorated(locator)).toEqual([])

      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['今日'])
      })
      expect(locator.element().textContent).toEqual('foo 今日')
      expect(errors).toEqual([])
    })

    test('Scenario: A decoration on the composing word and on the text before it appears mid-composition in a text block inside a container inside a container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const outerCalloutKey = keyGenerator()
      const innerCalloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        containers: [calloutContainer],
        initialValue: [
          {
            _key: outerCalloutKey,
            _type: 'callout',
            content: [
              {
                _key: innerCalloutKey,
                _type: 'callout',
                content: [
                  {
                    _key: blockKey,
                    _type: 'block',
                    children: [
                      {_key: spanKey, _type: 'span', text: 'foo ', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
        decoratedWords: (text) =>
          text.includes('きょう')
            ? ['foo', 'きょう', '今日']
            : ['きょう', '今日'],
      })
      await placeCaretAt(
        editor,
        [
          {_key: outerCalloutKey},
          'content',
          {_key: innerCalloutKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        4,
      )

      const composingNode = await compose(locator, 'foo きょう')

      expect(composingNode.isConnected).toEqual(true)
      expect(window.getSelection()?.anchorNode).toBe(composingNode)
      expect(decorated(locator)).toEqual([])

      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: outerCalloutKey,
            _type: 'callout',
            content: [
              {
                _key: innerCalloutKey,
                _type: 'callout',
                content: [
                  {
                    _key: blockKey,
                    _type: 'block',
                    children: [
                      {
                        _key: spanKey,
                        _type: 'span',
                        text: 'foo 今日',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['今日'])
      })
      expect(locator.element().textContent).toEqual('foo 今日')
      expect(errors).toEqual([])
    })

    test('Scenario: A decoration in another span appears mid-composition in a container whose text blocks have their own sub-schema', async () => {
      const keyGenerator = createTestKeyGenerator()
      const noteKey = keyGenerator()
      const blockKey = keyGenerator()
      const barKey = keyGenerator()
      const fooKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        schemaDefinition: noteSchemaDefinition,
        containers: [noteContainer],
        initialValue: [
          {
            _key: noteKey,
            _type: 'note',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: barKey, _type: 'span', text: 'bar ', marks: ['em']},
                  {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
                ],
                markDefs: [],
                style: 'h1',
              },
            ],
          },
        ],
        decoratedWords: (text) =>
          text.includes('きょう')
            ? ['bar', 'きょう', '今日']
            : ['きょう', '今日'],
      })
      await placeCaretAt(
        editor,
        [
          {_key: noteKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: fooKey},
        ],
        4,
      )

      const composingNode = await compose(locator, 'bar foo きょう')

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['bar'])
      })
      expect(composingNode.isConnected).toEqual(true)
      expect(window.getSelection()?.anchorNode).toBe(composingNode)

      await cdp().send('Input.insertText', {text: '今日'})

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
                  {_key: barKey, _type: 'span', text: 'bar ', marks: ['em']},
                  {_key: fooKey, _type: 'span', text: 'foo 今日', marks: []},
                ],
                markDefs: [],
                style: 'h1',
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['今日'])
      })
      expect(locator.element().textContent).toEqual('bar foo 今日')
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit inserts a character before the composing leaf in a text block inside a container inside a container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const outerCalloutKey = keyGenerator()
      const innerCalloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [
        {_key: outerCalloutKey},
        'content',
        {_key: innerCalloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        containers: [calloutContainer],
        initialValue: [
          {
            _key: outerCalloutKey,
            _type: 'callout',
            content: [
              {
                _key: innerCalloutKey,
                _type: 'callout',
                content: [
                  {
                    _key: blockKey,
                    _type: 'block',
                    children: [
                      {
                        _key: spanKey,
                        _type: 'span',
                        text: 'foo bar ',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
        decoratedWords: () => ['foo'],
      })
      await placeCaretAt(editor, spanPath, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', 'xfoo bar き', [
              ...spanPath,
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo bar き')
      })

      await continueComposition(locator, 'xfoo bar きょ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: outerCalloutKey,
            _type: 'callout',
            content: [
              {
                _key: innerCalloutKey,
                _type: 'callout',
                content: [
                  {
                    _key: blockKey,
                    _type: 'block',
                    children: [
                      {
                        _key: spanKey,
                        _type: 'span',
                        text: 'xfoo bar 今日',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo bar 今日')
      })
      expect(decorated(locator)).toEqual(['foo'])
      expect(errors).toEqual([])
    })
  },
)

describe.skipIf(!isChromium)(
  'The composing leaf renders its current decorations once the composition ends on Android',
  () => {
    test('Scenario: Blurring the editor mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('き') ? ['foo'] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      ;(locator.element() as HTMLElement).blur()

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('foo き')
      expect(errors).toEqual([])
    })

    test('Scenario: Blurring the editor mid-composition inside a host that stops compositionend', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('き') ? ['foo'] : []),
        host: (props) => (
          <div onCompositionEnd={(event) => event.stopPropagation()}>
            {props.children}
          </div>
        ),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      ;(locator.element() as HTMLElement).blur()

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('foo き')
      expect(errors).toEqual([])
    })

    test('Scenario: Cancelling the composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      let composed = false
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => {
          composed ||= text.includes('き')
          return composed ? ['foo'] : []
        },
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      // Chromium ends a cancelled composition with an empty
      // `compositionupdate`, a `deleteContentBackward` input and
      // `compositionend`.
      await cdp().send('Input.imeSetComposition', {
        text: '',
        selectionStart: 0,
        selectionEnd: 0,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(locator.element().textContent).toEqual('foo ')
      expect(errors).toEqual([])
    })

    test('Scenario: Switching the keyboard mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('き') ? ['foo'] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      // Android finishes the composing text when the keyboard switches, and
      // Chromium then fires a lone `compositionend` with the composed text
      // and keeps focus. Desktop Chromium has no trigger for that short of
      // blurring.
      locator
        .element()
        .dispatchEvent(
          new CompositionEvent('compositionend', {data: 'き', bubbles: true}),
        )

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('foo き')
      expect(document.activeElement).toBe(locator.element())
      expect(errors).toEqual([])
    })

    test('Scenario: A keydown that is not composing after a dropped compositionend', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('き') ? ['foo'] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      // A browser that drops `compositionend` still reports the next key as
      // not composing.
      locator.element().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Shift',
          bubbles: true,
          cancelable: true,
          isComposing: false,
        }),
      )

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(locator.element().textContent).toEqual('foo き')
      expect(errors).toEqual([])
    })

    test('Scenario: A keydown that is not composing after a dropped compositionend inside a host that stops keydown', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('き') ? ['foo'] : []),
        host: (props) => (
          <div
            role="presentation"
            onKeyDown={(event) => event.stopPropagation()}
          >
            {props.children}
          </div>
        ),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      locator.element().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Shift',
          bubbles: true,
          cancelable: true,
          isComposing: false,
        }),
      )

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(locator.element().textContent).toEqual('foo き')
      expect(errors).toEqual([])
    })

    test('Scenario: A new composition starts right after the previous one ends', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['か'],
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await compose(locator, 'foo か')

      await Promise.all([
        session.send('Input.insertText', {text: 'か'}),
        session.send('Input.imeSetComposition', {
          text: 'な',
          selectionStart: 1,
          selectionEnd: 1,
        }),
      ])
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo かな')
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['かな'])
      })

      await session.send('Input.insertText', {text: 'な'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo かな', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      expect(locator.element().textContent).toEqual('foo かな')
      expect(decorated(locator)).toEqual(['か'])
      expect(errors).toEqual([])
    })

    test('Scenario: Unmounting the editable mid-composition and mounting it again', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editorRef = createRef<Editor>()
      const initialConfig = {
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }
      const decoratedWords = (text: string) =>
        text.includes('き') ? ['foo'] : []
      const {rerender} = await render(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      const locator = page.getByRole('textbox')
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      expect(decorated(locator)).toEqual([])

      await rerender(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
        </EditorProvider>,
      )
      await expect.element(locator).not.toBeInTheDocument()
      await rerender(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 5)

      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(editorRef.current!.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(errors).toEqual([])
    })

    test('Scenario: The host remounts the editable when a composition ends and a new composition starts right after', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editorRef = createRef<Editor>()
      const decoratedWords = (text: string) =>
        text.includes('な') ? ['foo'] : []
      await render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'foo ', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <RemountOnCompositionEnd decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      const locator = page.getByRole('textbox')
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 4)
      const session = cdp()
      await compose(locator, 'foo か')
      const compositionEndTimers = holdCompositionEndTimers()

      await Promise.all([
        session.send('Input.insertText', {text: 'か'}),
        session.send('Input.imeSetComposition', {
          text: 'な',
          selectionStart: 1,
          selectionEnd: 1,
        }),
      ])
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo かな')
      })
      expect(decorated(locator)).toEqual([])

      compositionEndTimers.runPending()
      await session.send('Input.imeSetComposition', {
        text: 'なに',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo かなに')
      })
      expect(decorated(locator)).toEqual([])

      compositionEndTimers.restore()
      await session.send('Input.insertText', {text: 'なに'})

      await vi.waitFor(() => {
        expect(editorRef.current!.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo かなに', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      expect(locator.element().textContent).toEqual('foo かなに')
      expect(errors).toEqual([])
    })

    test('Scenario: A composition whose compositionstart a host stops starts within 25 ms of the previous compositionend', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.includes('な') ? ['き'] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await compose(locator, 'foo き')
      const compositionEndTimers = holdCompositionEndTimers()
      await session.send('Input.insertText', {text: 'き'})
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo き', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      locator
        .element()
        .addEventListener(
          'compositionstart',
          (event) => event.stopImmediatePropagation(),
          {capture: true, once: true},
        )
      await session.send('Input.imeSetComposition', {
        text: 'な',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きな')
      })
      expect(decorated(locator)).toEqual([])

      compositionEndTimers.runPending()
      await session.send('Input.imeSetComposition', {
        text: 'なに',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きなに')
      })
      expect(decorated(locator)).toEqual([])

      compositionEndTimers.restore()
      await session.send('Input.insertText', {text: 'なに'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo きなに', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['き'])
      })
      expect(locator.element().textContent).toEqual('foo きなに')
      expect(errors).toEqual([])
    })

    test('Scenario: A composition-end timer of an unmounted editable comes due during a new composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editorRef = createRef<Editor>()
      const initialConfig = {
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }
      const decoratedWords = (text: string) =>
        text.includes('な') ? ['foo', 'き'] : text.includes('き') ? ['foo'] : []
      const {rerender} = await render(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      const locator = page.getByRole('textbox')
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      const compositionEndTimers = holdCompositionEndTimers()

      ;(locator.element() as HTMLElement).blur()
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo'])
      })
      await rerender(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
        </EditorProvider>,
      )
      await expect.element(locator).not.toBeInTheDocument()
      await rerender(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 5)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'な',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きな')
      })
      expect(decorated(locator)).toEqual(['foo'])

      compositionEndTimers.runPending()
      await session.send('Input.imeSetComposition', {
        text: 'なに',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きなに')
      })
      expect(decorated(locator)).toEqual(['foo'])

      compositionEndTimers.restore()
      await session.send('Input.insertText', {text: 'なに'})

      await vi.waitFor(() => {
        expect(editorRef.current!.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo きなに', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo', 'き'])
      })
      expect(errors).toEqual([])
    })

    test('Scenario: A composition-end timer of a replaced editable is run inside the input event of a new composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editorRef = createRef<Editor>()
      const initialConfig = {
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }
      const decoratedWords = (text: string) =>
        text.includes('な') ? ['foo', 'き'] : ['foo']
      const {rerender} = await render(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable key="first" decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      const locator = page.getByRole('textbox')
      await expect.element(locator).toBeInTheDocument()
      await placeCaret(editorRef.current!, blockKey, spanKey, 4)
      await compose(locator, 'foo き')
      const compositionEndTimers = holdCompositionEndTimers()
      await cdp().send('Input.insertText', {text: 'き'})
      await rerender(
        <EditorProvider initialConfig={initialConfig}>
          <EditorRefPlugin ref={editorRef} />
          <WordDecoratedEditable key="second" decoratedWords={decoratedWords} />
        </EditorProvider>,
      )
      await placeCaret(editorRef.current!, blockKey, spanKey, 5)

      // Forces the old manager's callback to run while the new editable has
      // input pending, so its flush renders before the next update. This is
      // a chosen interleaving, not the browser's own timer scheduling.
      let delivered = false
      locator.element().addEventListener(
        'input',
        () => {
          delivered = true
          compositionEndTimers.runPending()
        },
        {capture: true, once: true},
      )
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'な',
        selectionStart: 1,
        selectionEnd: 1,
      })
      expect(delivered).toEqual(true)
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きな')
      })
      await session.send('Input.imeSetComposition', {
        text: 'なに',
        selectionStart: 2,
        selectionEnd: 2,
      })
      compositionEndTimers.restore()
      await session.send('Input.insertText', {text: 'なに'})

      await vi.waitFor(() => {
        expect(editorRef.current!.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo きなに', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きなに')
      })
      expect(decorated(locator)).toEqual(['foo', 'き'])
      expect(errors).toEqual([])
    })
  },
)

describe.skipIf(!isChromium)(
  'The composing leaf next to a collapsed decoration on Android',
  () => {
    test('Scenario: A collapsed decoration appears at the start of the composing leaf mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [0] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['\uFEFF'])
      })

      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('\uFEFFfoo きょ')
      })
      await session.send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo 今日')
      })
      expect(decorated(locator)).toEqual([])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration sits at the start of the composing leaf before the composition starts', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: () => [0],
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('\uFEFFfoo き')
      })

      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('\uFEFFfoo きょ')
      })
      await session.send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      expect(locator.element().textContent).toEqual('\uFEFFfoo 今日')
      expect(decorated(locator)).toEqual(['\uFEFF'])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration sits at the start of an empty span the composition starts in', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: () => [0],
      })
      await placeCaret(editor, blockKey, spanKey, 0)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'き', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await session.send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: '今日', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('\uFEFF今日')
      })
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration appears at the end of the composing leaf mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [text.length] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['\uFEFF'])
      })

      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo きょ\uFEFF')
      })
      await session.send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo 今日')
      })
      expect(decorated(locator)).toEqual([])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration appears at the start of a composing leaf that follows a decorated leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo'],
        collapsedAt: (text) => (text.includes('き') ? [3] : []),
      })
      await placeCaret(editor, blockKey, spanKey, 4)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await vi.waitFor(() => {
        expect(decorated(locator)).toEqual(['foo', '\uFEFF', '\uFEFF'])
      })

      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo\uFEFF きょ')
      })
      await session.send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo 今日')
      })
      expect(decorated(locator)).toEqual(['foo'])
      expect(errors).toEqual([])
    })
  },
)

describe.skipIf(!isChromium)(
  'A decoration fragment held next to a collapsed decoration on Android',
  () => {
    test('Scenario: A collapsed decoration appears at the start of a decoration whose only fragment is the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [4] : []),
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isFirst ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([['first last', 'bar ']])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo \uFEFFbarき ')
      expect(decorated(locator)).toEqual(['\uFEFF'])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'foo \uFEFFbarきょ ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar今日 ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar今日 ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'bar今日 ']])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration appears at the end of a decoration whose only fragment is the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [text.length] : []),
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isLast ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([['first last', 'bar ']])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo barき \uFEFF')
      expect(decorated(locator)).toEqual(['\uFEFF'])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'foo barきょ \uFEFF')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar今日 ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar今日 ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'bar今日 ']])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration that took the first fragment of the decoration the composing leaf is in disappears mid-composition', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [] : [4]),
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isFirst ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([
          ['first', '\uFEFF'],
          ['last', 'bar '],
        ])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo barき ')
      expect(decorated(locator)).toEqual([])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['last', 'barき ']])

      await continueComposition(locator, 'foo barきょ ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar今日 ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo \uFEFFbar今日 ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([
        ['first', '\uFEFF'],
        ['last', 'bar今日 '],
      ])
      expect(errors).toEqual([])
    })

    test('Scenario: A collapsed decoration appears at the start of the composing leaf, an interior fragment of a decoration', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
        collapsedAt: (text) => (text.includes('き') ? [4] : []),
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'foo bar baz',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 0},
              focus: {path: spanPath, offset: 11},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isFirst ? (
                  <strong>{props.children}</strong>
                ) : props.isLast ? (
                  <em>{props.children}</em>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-inner-fragment={fragment(props)}>
                {props.children}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([
          ['first', 'foo '],
          ['interior', 'bar '],
          ['last', 'baz'],
        ])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo \uFEFFbarき baz')
      expect(decorated(locator)).toEqual(['\uFEFF'])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([
        ['first', 'foo '],
        ['interior', '\uFEFF'],
        ['interior', 'barき '],
        ['last', 'baz'],
      ])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-inner-fragment]'),
          (element) => [
            element.getAttribute('data-inner-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'foo \uFEFFbarきょ baz')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'foo bar今日 baz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar今日 baz')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([
        ['first', 'foo '],
        ['interior', 'bar今日 '],
        ['last', 'baz'],
      ])
      expect(errors).toEqual([])
    })
  },
)

describe.skipIf(!isChromium)(
  'The composing leaf under remote edits on Android',
  () => {
    test('Scenario: A remote edit deletes a character before the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: (text) => (text.startsWith('foo') ? ['foo'] : ['oo']),
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', 'oo bar き', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('oo bar き')
      })

      await continueComposition(locator, 'oo bar きょ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'oo bar 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('oo bar 今日')
      })
      expect(decorated(locator)).toEqual(['oo'])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit inserts a character before the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', 'xfoo bar き', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo bar き')
      })

      await continueComposition(locator, 'xfoo bar きょ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'xfoo bar 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo bar 今日')
      })
      expect(decorated(locator)).toEqual(['foo'])
      expect(errors).toEqual([])
    })

    test.fails('Scenario: A remote edit inserts a character at the start of the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', 'foox bar き', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foox bar き')
      })

      await continueComposition(locator, 'foox bar きょ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'foox bar 今日',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foox bar 今日')
      })
      expect(decorated(locator)).toEqual(['foo'])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit inserts text after the composing leaf in the same span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo', 'baz'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await composeAt(locator, 'き', 'foo bar きbaz')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar きbaz', 'foo bar きbaz baz', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar きbaz baz')
      })

      await composeAt(locator, 'きょ', 'foo bar きょbaz baz')
      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'foo bar 今日baz baz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar 今日baz baz')
      })
      expect(decorated(locator)).toEqual(['foo', 'baz', 'baz'])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit changes another block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const otherBlockKey = keyGenerator()
      const otherSpanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: otherBlockKey,
            _type: 'block',
            children: [
              {_key: otherSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo', 'az'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await composeAt(locator, 'き', 'foo bar きbaz')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('baz', 'az', [
              {_key: otherBlockKey},
              'children',
              {_key: otherSpanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar きaz')
      })

      await continueComposition(locator, 'foo bar きょaz')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: otherBlockKey,
            _type: 'block',
            children: [
              {_key: otherSpanKey, _type: 'span', text: 'az', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('foo bar 今日az')
      })
      expect(decorated(locator)).toEqual(['foo', 'az'])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit removes all of the text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', '', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('')
      })

      await cdp().send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await cdp().send('Input.insertText', {text: '今日'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: '今日', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('今日')
      })
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit inserts text before a decoration whose first fragment is the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isFirst ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([['first last', 'bar ']])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo barき ')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo barき ', 'xfoo barき ', [
              ...spanPath,
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo barき ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'xfoo barきょ ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'xfoo bar今日 ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('xfoo bar今日 ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'bar今日 ']])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit deletes text before a decoration whose last fragment is the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isLast ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([['first last', 'bar ']])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo barき ')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo barき ', 'o barき ', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('o barき ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'o barきょ ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'o bar今日 ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('o bar今日 ')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'bar今日 ']])
      expect(errors).toEqual([])
    })

    test('Scenario: A remote edit removes the first fragment of a decoration whose interior fragment is the composing leaf', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => [],
      })
      editor.registerDecorations({
        decorations: [
          {
            id: 'foo bar baz',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 0},
              focus: {path: spanPath, offset: 11},
            },
            render: (props) => (
              <span data-fragment={fragment(props)}>
                {props.isFirst ? (
                  <strong>{props.children}</strong>
                ) : (
                  props.children
                )}
              </span>
            ),
          },
          {
            id: 'bar',
            type: 'range',
            range: {
              anchor: {path: spanPath, offset: 4},
              focus: {path: spanPath, offset: 8},
            },
            render: (props) => (
              <span data-inner-fragment={fragment(props)}>
                {props.children}
              </span>
            ),
          },
        ],
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-fragment]'),
            (element) => [
              element.getAttribute('data-fragment'),
              element.textContent,
            ],
          ),
        ).toEqual([
          ['first', 'foo '],
          ['interior', 'bar '],
          ['last', 'baz'],
        ])
      })
      await placeCaret(editor, blockKey, spanKey, 7)
      await composeAt(locator, 'き', 'foo barき baz')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo barき baz', 'barき baz', [
              ...spanPath,
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('barき baz')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([
        ['interior', 'barき '],
        ['last', 'baz'],
      ])
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-inner-fragment]'),
          (element) => [
            element.getAttribute('data-inner-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([['first last', 'barき ']])

      await continueComposition(locator, 'barきょ baz')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'bar今日 baz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('bar今日 baz')
      })
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-fragment]'),
          (element) => [
            element.getAttribute('data-fragment'),
            element.textContent,
          ],
        ),
      ).toEqual([
        ['first', 'bar今日 '],
        ['last', 'baz'],
      ])
      expect(errors).toEqual([])
    })

    test.fails('Scenario: A remote edit removes text the IME composes in', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await renderDecoratedEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'foo bar ', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        decoratedWords: () => ['foo'],
      })
      await placeCaret(editor, blockKey, spanKey, 8)
      await compose(locator, 'foo bar き')

      editor.send({
        type: 'patches',
        patches: [
          {
            ...diffMatchPatch('foo bar き', 'bar き', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('bar き')
      })

      await continueComposition(locator, 'bar きょ')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'bar 今日', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  },
)

async function renderDecoratedEditor(options: {
  keyGenerator: () => string
  schemaDefinition?: ReturnType<typeof defineSchema>
  initialValue: Array<PortableTextBlock>
  decoratedWords: (text: string) => Array<string>
  collapsedAt?: (text: string) => Array<number>
  host?: (props: PropsWithChildren) => ReactNode
  containers?: Array<Container>
}) {
  const editorRef = createRef<Editor>()
  const Host = options.host ?? Fragment
  await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: options.keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      {options.containers ? <NodePlugin nodes={options.containers} /> : null}
      <Host>
        <WordDecoratedEditable
          decoratedWords={options.decoratedWords}
          collapsedAt={options.collapsedAt}
        />
      </Host>
    </EditorProvider>,
  )
  const locator = page.getByRole('textbox')
  await expect.element(locator).toBeInTheDocument()
  return {editor: editorRef.current!, locator}
}

async function placeCaret(
  editor: Editor,
  blockKey: string,
  spanKey: string,
  offset: number,
) {
  await placeCaretAt(
    editor,
    [{_key: blockKey}, 'children', {_key: spanKey}],
    offset,
  )
}

async function placeCaretAt(editor: Editor, spanPath: Path, offset: number) {
  await userEvent.click(page.getByRole('textbox'))
  editor.send({
    type: 'select',
    at: {
      anchor: {path: spanPath, offset},
      focus: {path: spanPath, offset},
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.offset).toEqual(offset)
  })
}

async function compose(
  locator: ReturnType<typeof page.getByRole>,
  text: string,
) {
  const word = text.slice(text.lastIndexOf(' ') + 1)
  const session = cdp()
  let composingNode: Node | null | undefined
  for (let length = 1; length <= word.length; length++) {
    await session.send('Input.imeSetComposition', {
      text: word.slice(0, length),
      selectionStart: length,
      selectionEnd: length,
    })
    composingNode ??= window.getSelection()?.anchorNode
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual(
        text.slice(0, text.length - word.length + length),
      )
    })
  }
  return composingNode!
}

async function continueComposition(
  locator: ReturnType<typeof page.getByRole>,
  text: string,
) {
  await composeAt(locator, 'きょ', text)
  await cdp().send('Input.insertText', {text: '今日'})
}

async function composeAt(
  locator: ReturnType<typeof page.getByRole>,
  composition: string,
  text: string,
) {
  await cdp().send('Input.imeSetComposition', {
    text: composition,
    selectionStart: composition.length,
    selectionEnd: composition.length,
  })
  await vi.waitFor(() => {
    expect(locator.element().textContent).toEqual(text)
  })
}

// A held timer that is cleared is never delivered.
function holdCompositionEndTimers() {
  const pending = new Map<number, () => void>()
  const originalSetTimeout = window.setTimeout
  const originalClearTimeout = window.clearTimeout
  const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
    callback: () => void,
    delay?: number,
    ...args: Array<unknown>
  ) => {
    if (delay !== 25) {
      return originalSetTimeout(callback, delay, ...args)
    }
    const id = originalSetTimeout(() => {}, 2 ** 31 - 1)
    pending.set(id, callback)
    return id
  }) as typeof setTimeout)
  const clearTimeoutSpy = vi
    .spyOn(window, 'clearTimeout')
    .mockImplementation((id) => {
      if (typeof id === 'number') {
        pending.delete(id)
      }
      originalClearTimeout(id)
    })
  return {
    runPending() {
      for (const [id, callback] of pending) {
        pending.delete(id)
        originalClearTimeout(id)
        callback()
      }
    },
    restore() {
      for (const id of pending.keys()) {
        originalClearTimeout(id)
      }
      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    },
  }
}

function RemountOnCompositionEnd(props: {
  decoratedWords: (text: string) => Array<string>
}) {
  const [generation, setGeneration] = useState(0)
  return (
    <WordDecoratedEditable
      key={generation}
      decoratedWords={props.decoratedWords}
      editableRef={(element) => {
        if (element && generation > 0) {
          element.focus()
        }
      }}
      onCompositionEnd={() => {
        if (generation === 0) {
          flushSync(() => setGeneration(1))
        }
      }}
    />
  )
}

function decorated(locator: ReturnType<typeof page.getByRole>) {
  return Array.from(locator.element().querySelectorAll('[data-decorated]')).map(
    (element) => element.textContent,
  )
}

function fragment(props: DecorationRenderProps) {
  if (props.isFirst && props.isLast) {
    return 'first last'
  }
  return props.isFirst ? 'first' : props.isLast ? 'last' : 'interior'
}

function WordDecoratedEditable(props: {
  decoratedWords: (text: string) => Array<string>
  collapsedAt?: (text: string) => Array<number>
  editableRef?: Ref<HTMLDivElement>
  onCompositionEnd?: () => void
}) {
  // React Compiler would drop `value` from the deps since the memo body reads
  // the value through `getSnapshot`.
  'use no memo'
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const rangeDecorations = useMemo(
    () =>
      wordDecorations(
        editor.getSnapshot(),
        props.decoratedWords,
        props.collapsedAt,
      ),
    [editor, value, props.decoratedWords, props.collapsedAt],
  )
  return (
    <PortableTextEditable
      ref={props.editableRef}
      onCompositionEnd={props.onCompositionEnd}
      rangeDecorations={rangeDecorations}
    />
  )
}

function wordDecorations(
  snapshot: EditorSnapshot,
  decoratedWords: (text: string) => Array<string>,
  collapsedAt: (text: string) => Array<number> = () => [],
): Array<RangeDecoration> {
  const decorations: Array<RangeDecoration> = []
  for (const {node: block, path: blockPath} of getNodes(snapshot)) {
    if (!isTextBlock(snapshot.context, block)) {
      continue
    }
    const text = getTextBlockText(block)
    for (const word of decoratedWords(text)) {
      for (
        let offset = text.indexOf(word);
        offset !== -1;
        offset = text.indexOf(word, offset + word.length)
      ) {
        const selection = blockOffsetsToSelection({
          snapshot,
          offsets: {
            anchor: {path: blockPath, offset},
            focus: {path: blockPath, offset: offset + word.length},
          },
        })
        if (selection) {
          decorations.push({component: Decorated, selection})
        }
      }
    }
    for (const offset of collapsedAt(text)) {
      const selection = blockOffsetsToSelection({
        snapshot,
        offsets: {
          anchor: {path: blockPath, offset},
          focus: {path: blockPath, offset},
        },
      })
      if (selection) {
        decorations.push({component: Decorated, selection})
      }
    }
  }
  return decorations
}

function Decorated(props: PropsWithChildren) {
  return <span data-decorated="">{props.children}</span>
}
