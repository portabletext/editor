import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterAll, describe, expect, test, vi} from 'vitest'
import {cdp, server, userEvent} from 'vitest/browser'

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
    await expect.element(locator).toHaveTextContent('き')
    await session.send('Input.imeSetComposition', {
      text: 'きょ',
      selectionStart: 2,
      selectionEnd: 2,
    })
    await expect.element(locator).toHaveTextContent('きょ')
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await expect.element(locator).toHaveTextContent('きょう')
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
    await expect.element(locator).toHaveTextContent('き')
    await session.send('Input.imeSetComposition', {
      text: 'きょ',
      selectionStart: 2,
      selectionEnd: 2,
    })
    await expect.element(locator).toHaveTextContent('きょ')
    await session.send('Input.imeSetComposition', {
      text: 'きょう',
      selectionStart: 3,
      selectionEnd: 3,
    })
    await expect.element(locator).toHaveTextContent('きょう')
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
})
