import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {afterAll, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {cdp, page, server, userEvent} from 'vitest/browser'
import type {Editor} from '../src/editor'

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

afterAll(async () => {
  if (isChromium) {
    await cdp().send('Emulation.setUserAgentOverride', {
      userAgent: originalUserAgent,
    })
  }
})

describe.skipIf(!isChromium)('Composition (IME) on Android', () => {
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
})
