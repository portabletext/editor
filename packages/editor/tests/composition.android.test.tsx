import type {PortableTextObject} from '@portabletext/schema'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {createRef, useState} from 'react'
import {afterAll, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {cdp, page, server, userEvent} from 'vitest/browser'
import type {Editor} from '../src/editor'
import type {Path} from '../src/engine/interfaces/path'
import {getNode} from '../src/traversal/get-node'

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

const {createTestEditor} = await import('../src/test/vitest')
const {EditorProvider, PortableTextEditable} = await import('../src')
const {EditorRefPlugin} = await import('../src/plugins/plugin.editor-ref')
const {defineContainer} = await import('../src/renderers/renderer.types')
const {defineTextBlock} = await import('../src/renderers/renderer.types')
const {NodePlugin} = await import('../src/plugins/plugin.node')
const {BehaviorPlugin} = await import('../src/plugins/plugin.behavior')
const {defineBehavior} =
  await import('../src/behaviors/behavior.types.behavior')
const {execute} = await import('../src/behaviors/behavior.types.action')

afterAll(async () => {
  if (isChromium) {
    await cdp().send('Emulation.setUserAgentOverride', {
      userAgent: originalUserAgent,
    })
  }
})

describe.skipIf(!isChromium)('Composition (IME) on Android', () => {
  test.each(['root', 'callout'])(
    'Scenario: Enter while composing keeps the word at %s',
    async (shape) => {
      const keyGenerator = createTestKeyGenerator()
      const block = {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_key: keyGenerator(), _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue:
          shape === 'root'
            ? [block]
            : [{_key: keyGenerator(), _type: 'callout', content: [block]}],
        children: (
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
        ),
      })
      await userEvent.click(locator)
      await cdp().send('Input.imeSetComposition', {
        text: 'foo',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await expect.element(locator).toHaveTextContent('foo')
      await userEvent.keyboard('{Enter}')
      await cdp().send('Input.imeSetComposition', {
        text: 'bar',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await cdp().send('Input.insertText', {text: 'bar'})
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          shape === 'root'
            ? 'B: foo\nB: bar|'
            : 'CALLOUT:\n  B: foo\n  B: bar|',
        )
        expect(locator.element().textContent).toEqual('foobar')
      })
    },
  )

  test('Scenario: A rangeless composition update uses the DOM caret after a ranged update', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
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
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    const events: Array<string> = []
    for (const type of ['blur', 'focus']) {
      locator.element().addEventListener(type, () => events.push(type))
    }
    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')!.firstChild!
    locator
      .element()
      .dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}))
    locator.element().dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'b',
        isComposing: true,
        targetRanges: [
          new StaticRange({
            startContainer: textNode,
            startOffset: 3,
            endContainer: textNode,
            endOffset: 3,
          }),
        ],
      }),
    )
    locator.element().dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'a',
        isComposing: true,
      }),
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'fooab', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(events).toEqual([])
    })
  })

  test.each(['insertText', 'setComposition'] as const)(
    'Scenario: Redrawing a whole-composition replacement via %s',
    async (variant) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      })
      await userEvent.click(locator)
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'teh',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'teh', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(locator.element().textContent).toEqual('teh')
      })
      if (variant === 'setComposition') {
        await session.send('Input.imeSetComposition', {
          text: 'the ',
          selectionStart: 4,
          selectionEnd: 4,
          replacementStart: 0,
          replacementEnd: 3,
        })
      }
      await session.send('Input.insertText', {text: 'the '})
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'the ', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(locator.element().textContent).toEqual('the ')
      })
      await userEvent.keyboard('X')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'the X', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(locator.element().textContent).toEqual('the X')
      })
    },
  )

  test('Scenario: Applying composition text before the browser mutates the DOM', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await userEvent.click(locator)
    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')!.firstChild!
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      inputType: 'insertCompositionText',
      data: 'bar',
      isComposing: true,
      targetRanges: [
        new StaticRange({
          startContainer: textNode,
          startOffset: 0,
          endContainer: textNode,
          endOffset: 3,
        }),
      ],
    })
    locator
      .element()
      .dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}))
    locator.element().dispatchEvent(event)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(event.defaultPrevented).toEqual(false)
    expect(textNode.isConnected).toEqual(true)
  })

  test('Scenario: Deleting the full Android beforeinput target range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await userEvent.click(locator)
    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')!.firstChild!
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentBackward',
      targetRanges: [
        new StaticRange({
          startContainer: textNode,
          startOffset: 3,
          endContainer: textNode,
          endOffset: 7,
        }),
      ],
    })
    locator.element().dispatchEvent(event)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(event.defaultPrevented).toEqual(true)
  })

  test('Scenario: Composing into an empty block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })
    const compositionEvents: Array<string> = []
    for (const type of ['compositionstart', 'compositionend']) {
      locator.element().addEventListener(type, (event) => {
        compositionEvents.push(event.type)
      })
    }

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    const composingNode = window.getSelection()?.anchorNode
    expect(composingNode?.nodeType).toEqual(Node.TEXT_NODE)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('き', {normalizeWhitespace: false})
    expect(composingNode?.isConnected).toEqual(true)
    expect(window.getSelection()?.anchorNode).toBe(composingNode)
    await session.send('Input.imeSetComposition', {
      text: 'きょ',
      selectionStart: 2,
      selectionEnd: 2,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'きょ', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('きょ', {normalizeWhitespace: false})
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'きょう', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('きょう', {normalizeWhitespace: false})
    expect(window.getSelection()?.anchorNode).toBe(composingNode)
    await session.send('Input.insertText', {text: '今日'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '今日', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(composingNode?.isConnected).toEqual(true)
    expect(compositionEvents).toEqual(['compositionstart', 'compositionend'])
  })

  test('Scenario: Composing into the empty block created by pressing Enter', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    const compositionEvents: Array<string> = []
    for (const type of ['compositionstart', 'compositionend']) {
      locator.element().addEventListener(type, (event) => {
        compositionEvents.push(event.type)
      })
    }

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_key: 'k5', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    const composingNode = window.getSelection()?.anchorNode
    expect(composingNode?.nodeType).toEqual(Node.TEXT_NODE)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_key: 'k5', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect.element(locator).toHaveTextContent('fooき', {
      normalizeWhitespace: false,
    })
    expect(window.getSelection()?.anchorNode).toBe(composingNode)
    await session.send('Input.imeSetComposition', {
      text: 'きょ',
      selectionStart: 2,
      selectionEnd: 2,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_key: 'k5', _type: 'span', text: 'きょ', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect.element(locator).toHaveTextContent('fooきょ', {
      normalizeWhitespace: false,
    })
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_key: 'k5', _type: 'span', text: 'きょう', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect.element(locator).toHaveTextContent('fooきょう', {
      normalizeWhitespace: false,
    })
    expect(window.getSelection()?.anchorNode).toBe(composingNode)
    await session.send('Input.insertText', {text: '今日'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'block',
          children: [{_key: 'k5', _type: 'span', text: '今日', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(composingNode?.isConnected).toEqual(true)
    expect(compositionEvents).toEqual(['compositionstart', 'compositionend'])
  })

  test('Scenario: Composing after existing text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    const compositionEvents: Array<string> = []
    for (const type of ['compositionstart', 'compositionend']) {
      locator.element().addEventListener(type, (event) => {
        compositionEvents.push(event.type)
      })
    }

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await expect.element(locator).toHaveTextContent('fooき')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'fooき', marks: []}],
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
    await expect.element(locator).toHaveTextContent('fooきょ')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'fooきょ', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await expect.element(locator).toHaveTextContent('fooきょう')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'fooきょう', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await session.send('Input.insertText', {text: '今日'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo今日', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compositionEvents).toEqual(['compositionstart', 'compositionend'])
  })

  test('Scenario: Composing twice in a row into an empty block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })
    const compositionEvents: Array<string> = []
    for (const type of ['compositionstart', 'compositionend']) {
      locator.element().addEventListener(type, (event) => {
        compositionEvents.push(event.type)
      })
    }

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'か',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await expect
      .element(locator)
      .toHaveTextContent('か', {normalizeWhitespace: false})
    await Promise.all([
      session.send('Input.insertText', {text: 'か'}),
      session.send('Input.imeSetComposition', {
        text: 'な',
        selectionStart: 1,
        selectionEnd: 1,
      }),
    ])
    await expect.element(locator).toHaveTextContent('かな')
    await session.send('Input.insertText', {text: 'な'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'かな', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compositionEvents).toEqual([
      'compositionstart',
      'compositionend',
      'compositionstart',
      'compositionend',
    ])
  })

  test('Scenario: Unmounting the editable while composing into an empty block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = createRef<Editor>()
    const initialConfig = {keyGenerator, schemaDefinition: defineSchema({})}
    const {rerender} = await render(
      <EditorProvider initialConfig={initialConfig}>
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )
    const locator = page.getByRole('textbox')
    await expect.element(locator).toBeInTheDocument()

    await userEvent.click(locator)
    await cdp().send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await expect
      .element(locator)
      .toHaveTextContent('き', {normalizeWhitespace: false})

    await rerender(
      <EditorProvider initialConfig={initialConfig}>
        <EditorRefPlugin ref={editorRef} />
      </EditorProvider>,
    )

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
  test('Scenario: Composing into an empty block with a placeholder', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      editableProps: {renderPlaceholder: () => <span>Write here</span>},
    })
    const compositionEvents: Array<string> = []
    for (const type of ['compositionstart', 'compositionend']) {
      locator.element().addEventListener(type, (event) => {
        compositionEvents.push(event.type)
      })
    }

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    const composingNode = window.getSelection()?.anchorNode
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('き', {normalizeWhitespace: false})
    expect(window.getSelection()?.anchorNode).toBe(composingNode)
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await session.send('Input.insertText', {text: '今日'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '今日', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(composingNode?.isConnected).toEqual(true)
    expect(compositionEvents).toEqual(['compositionstart', 'compositionend'])
  })

  test('Scenario: Deleting the last character empties the line, then composing again', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'か',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await session.send('Input.insertText', {text: 'か'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'か', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-pt-line-break]')?.innerHTML,
      ).toEqual('<br>')
    })

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await session.send('Input.insertText', {text: 'き'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('き', {normalizeWhitespace: false})
  })

  test('Scenario: Typing without composition into an empty block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.insertText', {text: 'K'})
    await session.send('Input.insertText', {text: 'y'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'Ky', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('Ky', {normalizeWhitespace: false})
  })
  test('Scenario: Cancelling a composition in an empty block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    const session = cdp()

    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'き', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await session.send('Input.imeSetComposition', {
      text: '',
      selectionStart: 0,
      selectionEnd: 0,
    })
    await session.send('Input.insertText', {text: ''})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-pt-line-break]')?.innerHTML,
      ).toEqual('<br>')
    })

    await session.send('Input.imeSetComposition', {
      text: 'か',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await session.send('Input.insertText', {text: 'か'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'か', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await expect
      .element(locator)
      .toHaveTextContent('か', {normalizeWhitespace: false})
  })
  test('Scenario: Preserving marks when composition replaces text across a mark boundary', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await userEvent.click(locator)
    const [fooText, barText] = Array.from(
      locator.element().querySelectorAll('[data-pt-text]'),
    ).map((element) => element.firstChild!)
    locator
      .element()
      .dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}))
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      inputType: 'insertCompositionText',
      data: 'fob',
      isComposing: true,
      targetRanges: [
        new StaticRange({
          startContainer: fooText!,
          startOffset: 0,
          endContainer: barText!,
          endOffset: 1,
        }),
      ],
    })
    locator.element().dispatchEvent(event)
    locator
      .element()
      .dispatchEvent(
        new CompositionEvent('compositionend', {bubbles: true, data: 'fob'}),
      )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'fob', marks: []},
            {_key: barKey, _type: 'span', text: 'ar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('fobar')
    })
  })

  test('Scenario: Aborting composition when a remote edit changes the composing span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await userEvent.click(locator)
    const events: Array<string> = []
    for (const type of ['blur', 'focus']) {
      locator.element().addEventListener(type, () => events.push(type))
    }
    await cdp().send('Input.imeSetComposition', {
      text: 'foo',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await expect.element(locator).toHaveTextContent('foo')
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: 'bar',
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(events).toEqual(['blur', 'focus'])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('bar')
      expect(window.getSelection()?.focusOffset).toEqual(
        editor.getSnapshot().context.selection?.focus.offset,
      )
    })
  })
  test('Scenario: Redrawing a rewritten composition and restoring the model caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text !== event.text.toUpperCase(),
              actions: [
                ({event}) => [
                  execute({
                    type: 'insert.text',
                    text: event.text.toUpperCase(),
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await cdp().send('Input.imeSetComposition', {
      text: 'bar',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await cdp().send('Input.insertText', {text: 'bar'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'fooBAR', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('fooBAR')
      expect(window.getSelection()?.focusOffset).toEqual(6)
      expect(window.getSelection()?.focusNode).toBe(
        locator.element().querySelector('[data-pt-text]')?.firstChild,
      )
    })
    await cdp().send('Input.insertText', {text: '!'})
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooBAR!')
    })
  })
  test('Scenario: Cancelling an empty composition preserves custom block mounts', async () => {
    const keyGenerator = createTestKeyGenerator()
    const mounts: Array<string> = []
    let nextMountId = 0
    function Counter(props: {children: React.ReactNode}) {
      const [id] = useState(() => {
        const value = `m${nextMountId++}`
        mounts.push(value)
        return value
      })
      return <div data-mount={id}>{props.children}</div>
    }
    const blockRenderer = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div {...attributes}>
          <Counter>{children}</Counter>
        </div>
      ),
    })
    const firstKey = keyGenerator()
    const firstSpan = keyGenerator()
    const secondKey = keyGenerator()
    const secondSpan = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: firstKey,
          _type: 'block',
          children: [{_key: firstSpan, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: secondKey,
          _type: 'block',
          children: [{_key: secondSpan, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[blockRenderer]} />,
    })
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: secondKey}, 'children', {_key: secondSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: secondKey}, 'children', {_key: secondSpan}],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(0)
      expect(
        window
          .getSelection()
          ?.focusNode?.parentElement?.hasAttribute('data-pt-line-break'),
      ).toEqual(true)
    })
    const session = cdp()
    await session.send('Input.imeSetComposition', {
      text: 'き',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await session.send('Input.imeSetComposition', {
      text: '',
      selectionStart: 0,
      selectionEnd: 0,
    })
    await session.send('Input.insertText', {text: ''})
    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-pt-line-break]')?.innerHTML,
      ).toEqual('<br>')
      expect(mounts).toEqual(['m0', 'm1', 'm2'])
      expect(window.getSelection()?.anchorNode?.isConnected).toEqual(true)
    })
  })
  test('Scenario: Applying a composition update without target ranges without aborting', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
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
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    const events: Array<string> = []
    for (const type of ['blur', 'focus']) {
      locator.element().addEventListener(type, () => events.push(type))
    }
    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')!.firstChild!
    locator
      .element()
      .dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}))
    locator.element().dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'b',
        isComposing: true,
        targetRanges: [
          new StaticRange({
            startContainer: textNode,
            startOffset: 3,
            endContainer: textNode,
            endOffset: 3,
          }),
        ],
      }),
    )
    locator.element().dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'a',
        isComposing: true,
      }),
    )
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'fooab', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    locator
      .element()
      .dispatchEvent(new CompositionEvent('compositionend', {bubbles: true}))
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooab')
      expect(events).toEqual([])
    })
  })

  test('Scenario: Ignoring a cancelable target range while the DOM node map is dirty', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar', marks: []},
          ],
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
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusOffset).toEqual(0)
    })
    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')!.firstChild!
    editor.send({type: 'insert.text', text: 'XX'})
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentBackward',
      targetRanges: [
        new StaticRange({
          startContainer: textNode,
          startOffset: 6,
          endContainer: textNode,
          endOffset: 7,
        }),
      ],
    })
    locator.element().dispatchEvent(event)
    expect(event.defaultPrevented).toEqual(false)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'XXfoo bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('XXfoo bar')
    })
  })
  test.each([
    ['a block after the composing block', 'root', 'after'],
    ['a block after the composing container', 'callout', 'container'],
    ['a block before the composing block at root', 'root', 'before'],
    ['a block before the composing block in a callout', 'callout', 'before'],
    ['a block before composition in table cells at depth 2', 'table', 'before'],
    ['an inline object beside the composing span', 'root', 'inline'],
    ['a span beside the composing span', 'root', 'span'],
    ['a style change on the composing block', 'root', 'style'],
    ['a bold marks change on the composing span', 'root', 'marks'],
    ['removing a sibling block', 'root', 'sibling'],
    ['removing the composing block', 'root', 'unset'],
    ['replacing the composing child array', 'root', 'children'],
    ['a code edit to the word at root', 'root', 'code'],
    ['a code edit to the word in a callout', 'callout', 'code'],
    ['a remote edit to the word in a callout', 'callout', 'remote'],
    ['numeric text set at root', 'root', 'numeric-text'],
    ['numeric text set in a callout', 'callout', 'numeric-text'],
    ['numeric children set at root', 'root', 'numeric-children'],
    ['numeric children set in a callout', 'callout', 'numeric-children'],
    ['numeric range unset of the composing span', 'root', 'numeric-range'],
    ['numeric text set on a sibling', 'root', 'numeric-sibling'],
  ])('Scenario: Composing through %s', async (_scenario, shape, change) => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanMarks: Array<string> = []
    const block = {
      _key: blockKey,
      _type: 'block',
      children: [{_key: spanKey, _type: 'span', text: 'foo', marks: spanMarks}],
      markDefs: [],
      style: 'normal',
    }
    let initialValue: Array<PortableTextObject> = [block]
    let blockPath: Path = [{_key: blockKey}]
    if (shape === 'callout') {
      const calloutKey = keyGenerator()
      initialValue = [{_key: calloutKey, _type: 'callout', content: [block]}]
      blockPath = [{_key: calloutKey}, 'content', ...blockPath]
    }
    if (shape === 'table') {
      for (let depth = 0; depth < 2; depth++) {
        const tableKey = keyGenerator()
        const rowKey = keyGenerator()
        const cellKey = keyGenerator()
        const cell = {_key: cellKey, _type: 'cell', content: initialValue}
        const row = {_key: rowKey, _type: 'row', cells: [cell]}
        initialValue = [{_key: tableKey, _type: 'table', rows: [row]}]
        blockPath = [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          ...blockPath,
        ]
      }
    }
    const siblingKey = keyGenerator()
    const siblingSpanKey = keyGenerator()
    const sibling = {
      _key: siblingKey,
      _type: 'block',
      children: [{_key: siblingSpanKey, _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    if (change === 'numeric-range') {
      block.children.push({
        _key: siblingSpanKey,
        _type: 'span',
        text: 'baz',
        marks: ['strong'],
      })
    }
    if (
      change === 'sibling' ||
      change === 'unset' ||
      change === 'numeric-sibling'
    ) {
      initialValue.push(sibling)
    }
    const spanPath: Path = [...blockPath, 'children', {_key: spanKey}]
    const contentField = {
      name: 'content',
      type: 'array',
      of: [{type: 'block'}, {type: 'table'}],
    } as const
    const cellsField = {
      name: 'cells',
      type: 'array',
      of: [{name: 'cell', type: 'object', fields: [contentField]}],
    } as const
    const rowsField = {
      name: 'rows',
      type: 'array',
      of: [{name: 'row', type: 'object', fields: [cellsField]}],
    } as const
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        inlineObjects: [{name: 'inline'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
          {name: 'table', fields: [rowsField]},
        ],
      }),
      initialValue,
      children: (
        <NodePlugin
          nodes={[
            defineContainer({type: 'callout', arrayField: 'content'}),
            defineContainer({type: 'table', arrayField: 'rows'}),
            defineContainer({type: 'row', arrayField: 'cells'}),
            defineContainer({type: 'cell', arrayField: 'content'}),
          ]}
        />
      ),
    })
    await expect.element(locator.getByText('foo')).toBeVisible()
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusOffset).toEqual(3),
    )
    const events: Array<string> = []
    editor.on('blurred', () => events.push('blurred'))
    editor.on('focused', () => events.push('focused'))
    await cdp().send('Input.imeSetComposition', {
      text: 'ba',
      selectionStart: 2,
      selectionEnd: 2,
    })
    await expect
      .element(locator)
      .toHaveTextContent(
        change === 'sibling' ||
          change === 'unset' ||
          change === 'numeric-sibling' ||
          change === 'numeric-range'
          ? 'foobabaz'
          : 'fooba',
      )
    if (change.startsWith('numeric-')) {
      const numericBlockPath: Path =
        shape === 'callout' ? [0, 'content', 0] : [0]
      editor.send({
        type: 'apply',
        patches:
          change === 'numeric-range'
            ? [{type: 'unset', path: [0, 'children', [0, 1]], origin: 'remote'}]
            : [
                {
                  type: 'set',
                  path:
                    change === 'numeric-sibling'
                      ? [1, 'children', 0, 'text']
                      : [
                          ...numericBlockPath,
                          'children',
                          ...(change === 'numeric-text' ? [0, 'text'] : []),
                        ],
                  value:
                    change === 'numeric-children'
                      ? [{_key: spanKey, _type: 'span', text: 'baz', marks: []}]
                      : 'bar',
                  origin: 'remote',
                },
              ],
      })
    } else if (change === 'code') {
      editor.send({type: 'insert.text', text: 'X'})
    } else if (change === 'unset' || change === 'sibling') {
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            path: change === 'unset' ? blockPath : [{_key: siblingKey}],
            origin: 'remote',
          },
        ],
      })
    } else if (['children', 'remote', 'style', 'marks'].includes(change)) {
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path:
              change === 'children'
                ? [...blockPath, 'children']
                : change === 'style'
                  ? [...blockPath, 'style']
                  : [...spanPath, change === 'marks' ? 'marks' : 'text'],
            value:
              change === 'children'
                ? [{_key: spanKey, _type: 'span', text: 'baz', marks: []}]
                : change === 'style'
                  ? 'h1'
                  : change === 'marks'
                    ? ['strong']
                    : 'baz',
            origin: 'remote',
          },
        ],
      })
    } else {
      const inlineKey = keyGenerator()
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path:
              change === 'container'
                ? blockPath.slice(0, 1)
                : change === 'inline' || change === 'span'
                  ? spanPath
                  : blockPath,
            position: change === 'before' ? 'before' : 'after',
            items:
              change === 'inline'
                ? [{_key: inlineKey, _type: 'inline'}]
                : change === 'span'
                  ? [
                      {
                        _key: inlineKey,
                        _type: 'span',
                        text: 'baz',
                        marks: ['strong'],
                      },
                    ]
                  : [sibling],
            origin: 'remote',
          },
        ],
      })
    }
    if (change === 'numeric-range') {
      await vi.waitFor(() => {
        expect(getNode(editor.getSnapshot(), spanPath)).toEqual(undefined)
        expect(locator.element().textContent).toEqual('baz')
        expect(events).toEqual(['blurred', 'focused'])
      })
      return
    }
    if (
      ['unset', 'children', 'code', 'remote'].includes(change) ||
      change === 'numeric-text' ||
      change === 'numeric-children'
    ) {
      await vi.waitFor(() => {
        expect(getNode(editor.getSnapshot(), spanPath)?.node).toEqual(
          change === 'unset'
            ? undefined
            : {
                _key: spanKey,
                _type: 'span',
                text:
                  change === 'code'
                    ? 'foobaX'
                    : change === 'numeric-text'
                      ? 'bar'
                      : 'baz',
                marks: [],
              },
        )
        expect(locator.element().textContent).toEqual(
          change === 'code'
            ? 'foobaX'
            : change === 'numeric-text'
              ? 'bar'
              : 'baz',
        )
        expect(events).toEqual(['blurred', 'focused'])
      })
      return
    }
    await cdp().send('Input.imeSetComposition', {
      text: 'bar',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await cdp().send('Input.insertText', {text: 'bar'})
    await vi.waitFor(() => {
      expect(getNode(editor.getSnapshot(), spanPath)?.node).toEqual({
        _key: spanKey,
        _type: 'span',
        text: 'foobar',
        marks: change === 'marks' ? ['strong'] : [],
      })
      expect(locator.element().textContent).toEqual(
        change === 'before'
          ? 'bazfoobar'
          : change === 'after' || change === 'container' || change === 'span'
            ? 'foobarbaz'
            : change === 'numeric-sibling'
              ? 'foobarbar'
              : change === 'inline'
                ? 'foobar\uFEFF[inline: k6]\uFEFF'
                : 'foobar',
      )
      if (change === 'numeric-sibling') {
        expect(getNode(editor.getSnapshot(), [1, 'children', 0])?.node).toEqual(
          {
            _key: siblingSpanKey,
            _type: 'span',
            text: 'bar',
            marks: [],
          },
        )
      }
      expect(events).toEqual([])
    })
  })
})
