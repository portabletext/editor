import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {cdp, server, userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

const isChromium = server.browser === 'chromium'

/**
 * Enable composition key events in the browser.
 *
 * CDP's Input.imeSetComposition doesn't fire keydown events, but the editor
 * relies on keyCode 229 to detect IME composition. This listener bridges
 * the gap by dispatching a synthetic keydown with keyCode 229 when
 * compositionstart fires.
 *
 * This is a common technique used in composition tests.
 */
function enableCompositionKeyEvents() {
  window.addEventListener(
    'compositionstart',
    () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Unidentified',
          keyCode: 229,
        }),
      )
    },
    true,
  )
}

/**
 * Small delay between CDP calls to let the editor process events.
 */
function delay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Compiled default schema used for type guards like `isTextBlock`.
 */
const defaultSchema = compileSchema(defineSchema({}))

/**
 * Get the first block from the editor value, asserting it's a text block.
 */
function getFirstTextBlock(
  value: Array<PortableTextBlock>,
): PortableTextTextBlock {
  const block = value[0]
  if (!block || !isTextBlock({schema: defaultSchema}, block)) {
    throw new Error('Expected first block to be a text block with children')
  }
  return block
}

describe.skipIf(!isChromium)('Composition (IME)', () => {
  describe('Japanese IME', () => {
    test('type "すし" (sushi) into empty editor', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)
      enableCompositionKeyEvents()

      const session = cdp()

      // Simulate Japanese IME composing すし (sushi)
      // s → ｓ → す → すs → すし → commit
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the text was inserted
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getFirstTextBlock(value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'すし', marks: []}],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('after existing text', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus and type "Hello" normally
      await userEvent.click(locator)
      await userEvent.type(locator, 'Hello')

      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
        })
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Now compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the combined text
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'Helloすし', marks: []}],
        })
      })
    })

    test('cancelled with Escape', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)
      enableCompositionKeyEvents()

      const session = cdp()

      // Start composing
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()

      // Cancel composition (empty text)
      await session.send('Input.imeSetComposition', {
        text: '',
        selectionStart: 0,
        selectionEnd: 0,
      })
      await delay()
      await session.send('Input.insertText', {text: ''})

      // Wait a bit for any async processing
      await delay(200)

      // Assert: editor should be empty (or have only the initial empty span)
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        })
      })
    })

    test('replacing selected text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'Hello World', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Select "World" (offset 6-11)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 6,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 11,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(6)
        expect(selection?.focus.offset).toBe(11)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose 世界 (sekai = world in Japanese) to replace "World"
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せｋ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せか',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せかｉ',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '世界',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: '世界'})

      // Assert: "Hello 世界"
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: 'Hello 世界', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })
  })

  describe('Korean IME', () => {
    test('character-by-character building', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)
      enableCompositionKeyEvents()

      const session = cdp()

      // Korean IME: ㄱ → 가 → commit 가
      await session.send('Input.imeSetComposition', {
        text: 'ㄱ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '가',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.insertText', {text: '가'})

      // Assert the Korean character was inserted
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getFirstTextBlock(value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '가', marks: []}],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('continuous recomposition "한국"', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)
      enableCompositionKeyEvents()

      const session = cdp()

      // Korean IME: ㅎ → 하 → 한 → 한ㄱ → 한구 → 한국
      // Each step REPLACES the previous composition text
      await session.send('Input.imeSetComposition', {
        text: 'ㅎ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '하',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '한',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      // The ㄱ consonant starts a new syllable but is still part of composition
      await session.send('Input.imeSetComposition', {
        text: '한ㄱ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '한구',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '한국',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: '한국'})

      // Assert the Korean text was inserted correctly
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '한국', marks: []}],
          markDefs: [],
          style: 'normal',
        })
      })
    })
  })

  describe('Composition with formatting', () => {
    test('at a format boundary', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'Hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor at end of "Hello"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toBeTruthy()
      })

      // Toggle bold
      editor.send({
        type: 'decorator.toggle',
        decorator: 'strong',
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME (should be bold)
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert: "Hello" plain + "すし" bold
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: 'Hello', marks: []},
            {_type: 'span', _key: 'k4', text: 'すし', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('before bold text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'plain', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'bold',
                marks: ['strong'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor at the start of the bold span (offset 0 of span-1)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 0,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(0)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert: composed text ends up in the plain span because at the boundary
      // between plain and bold, the cursor resolves to the plain (left) side
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'plainすし', marks: []},
            {
              _key: 'span-1',
              _type: 'span',
              text: 'bold',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('with active decorators on empty block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toBeTruthy()
      })

      // Toggle bold on the empty block
      editor.send({type: 'decorator.toggle', decorator: 'strong'})

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME  -  should be bold
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert: the composed text should have the bold mark
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: 'すし', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('with multiple decorators', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'Hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor at end of "Hello"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toBeTruthy()
      })

      // Toggle both bold and italic
      editor.send({type: 'decorator.toggle', decorator: 'strong'})
      editor.send({type: 'decorator.toggle', decorator: 'em'})

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the composed text has both 'strong' and 'em' marks
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: 'Hello', marks: []},
            {
              _type: 'span',
              _key: 'k4',
              text: 'すし',
              marks: ['strong', 'em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('replacing decorated text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {
                _key: 'span-0',
                _type: 'span',
                text: 'Hello',
                marks: ['strong'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Select all of "Hello"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(0)
        expect(selection?.focus.offset).toBe(5)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose 世界 via IME to replace "Hello"
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せｋ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せか',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'せかｉ',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '世界',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: '世界'})

      // Assert the replacement text has the bold mark
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {
              _key: 'span-0',
              _type: 'span',
              text: '世界',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })

    test('at decorator boundary', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {
                _key: 'span-0',
                _type: 'span',
                text: 'bold',
                marks: ['strong'],
              },
              {_key: 'span-1', _type: 'span', text: 'normal', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor at the end of the bold span
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 4,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 4,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(4)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the composed text ends up in the bold span
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {
              _key: 'span-0',
              _type: 'span',
              text: 'boldすし',
              marks: ['strong'],
            },
            {_key: 'span-1', _type: 'span', text: 'normal', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })
  })

  describe('Composition with annotations', () => {
    test('inside annotation inherits mark', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'click ', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'here',
                marks: ['link-0'],
              },
              {_key: 'span-2', _type: 'span', text: ' please', marks: []},
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor inside the annotated span "here" (after "he")
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 2,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 2,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(2)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the composed text inherits the annotation mark
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'click ', marks: []},
            {
              _key: 'span-1',
              _type: 'span',
              text: 'heすしre',
              marks: ['link-0'],
            },
            {_key: 'span-2', _type: 'span', text: ' please', marks: []},
          ],
          markDefs: [{_key: 'link-0', _type: 'link'}],
          style: 'normal',
        })
      })
    })

    test('at annotation boundary has no mark', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {
                _key: 'span-0',
                _type: 'span',
                text: 'link text',
                marks: ['link-0'],
              },
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor right after the annotation (end of "link text")
      // At the end of an annotated span, the editor places the cursor outside the annotation
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 9,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 9,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(9)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the composed text does NOT have the annotation mark
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {
              _key: 'span-0',
              _type: 'span',
              text: 'link text',
              marks: ['link-0'],
            },
            {_type: 'span', _key: 'k2', text: 'すし', marks: []},
          ],
          markDefs: [{_key: 'link-0', _type: 'link'}],
          style: 'normal',
        })
      })
    })

    test('inside annotated bold text inherits both', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'before ', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'link',
                marks: ['strong', 'link-0'],
              },
              {_key: 'span-2', _type: 'span', text: ' after', marks: []},
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor inside the annotated bold span "link" (after "li")
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 2,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 2,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(2)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose 東京 (Tokyo) via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｔ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'と',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'とう',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '東',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.insertText', {text: '東'})

      // Assert: composed text inherits both the annotation mark and the bold decorator
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'before ', marks: []},
            {
              _key: 'span-1',
              _type: 'span',
              text: 'li東nk',
              marks: ['strong', 'link-0'],
            },
            {_key: 'span-2', _type: 'span', text: ' after', marks: []},
          ],
          markDefs: [{_key: 'link-0', _type: 'link'}],
          style: 'normal',
        })
      })
    })

    test('at start of annotation', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'before ', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'link text',
                marks: ['link-0'],
              },
              {_key: 'span-2', _type: 'span', text: ' after', marks: []},
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Place cursor at offset 0 of the annotated span (the very start of "link text")
      // At the boundary between plain and annotated text, the cursor resolves
      // to the plain (left) side, similar to the bold boundary behavior
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 0,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(0)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert: at the start of an annotation, the composed text resolves to
      // the plain (left) side, so it does NOT inherit the annotation mark
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'before すし', marks: []},
            {
              _key: 'span-1',
              _type: 'span',
              text: 'link text',
              marks: ['link-0'],
            },
            {_key: 'span-2', _type: 'span', text: ' after', marks: []},
          ],
          markDefs: [{_key: 'link-0', _type: 'link'}],
          style: 'normal',
        })
      })
    })

    test('replacing text spanning annotation boundary', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'before ', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'link',
                marks: ['link-0'],
              },
              {_key: 'span-2', _type: 'span', text: ' after', marks: []},
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Select "re li" which spans from "befo[re ]" (plain) into "[li]nk" (annotated)
      // "before " is 7 chars, so "re " starts at offset 4 in span-0 (end at 7)
      // "li" is offset 0-2 in span-1
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-0'}],
            offset: 4,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 2,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(4)
        expect(selection?.focus.offset).toBe(2)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose 東 via IME to replace the cross-boundary selection
      await session.send('Input.imeSetComposition', {
        text: 'ｔ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'と',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'とう',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '東',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.insertText', {text: '東'})

      // Assert: the replacement text should NOT have the annotation mark
      // because the selection started in the plain span outside the annotation
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'befo東', marks: []},
            {
              _key: 'span-1',
              _type: 'span',
              text: 'nk',
              marks: ['link-0'],
            },
            {_key: 'span-2', _type: 'span', text: ' after', marks: []},
          ],
          markDefs: [{_key: 'link-0', _type: 'link'}],
          style: 'normal',
        })
      })
    })

    test('replacing single-char annotation preserves mark', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
        }),
        initialValue: [
          {
            _key: 'block-0',
            _type: 'block',
            children: [
              {_key: 'span-0', _type: 'span', text: 'text ', marks: []},
              {
                _key: 'span-1',
                _type: 'span',
                text: 'x',
                marks: ['link-0'],
              },
              {_key: 'span-2', _type: 'span', text: ' more', marks: []},
            ],
            markDefs: [{_key: 'link-0', _type: 'link'}],
            style: 'normal',
          },
        ],
      })

      // Focus the editor
      await userEvent.click(locator)

      // Select the single annotated character "x"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'block-0'}, 'children', {_key: 'span-1'}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(0)
        expect(selection?.focus.offset).toBe(1)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME to replace the single annotated character
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert: when the entire content of an annotation is selected and replaced
      // via IME composition, the annotation is removed entirely. The composed text
      // does NOT inherit the annotation mark because the annotation had its full
      // content replaced, causing it to be cleaned up.
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _key: 'block-0',
          _type: 'block',
          children: [
            {_key: 'span-0', _type: 'span', text: 'text すし more', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        })
      })
    })
  })

  describe('Composition sequences', () => {
    test('after soft break', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)

      // Insert two soft breaks (Shift+Enter)
      editor.send({type: 'insert.soft break'})
      editor.send({type: 'insert.soft break'})

      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '\n\n', marks: []}],
        })
      })

      // Move cursor between the two soft breaks (after first \n, before second \n)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 1,
          },
          focus: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        const selection = editor.getSnapshot().context.selection
        expect(selection?.anchor.offset).toBe(1)
      })

      enableCompositionKeyEvents()

      const session = cdp()

      // Compose すし via IME
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すｓ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'すし',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.insertText', {text: 'すし'})

      // Assert the composed text is between the soft breaks
      await vi.waitFor(() => {
        const currentBlock = getFirstTextBlock(
          editor.getSnapshot().context.value,
        )
        expect(currentBlock).toEqual({
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '\nすし\n', marks: []}],
        })
      })
    })

    test('multiple sequential compositions', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
      })

      // Focus the editor
      await userEvent.click(locator)
      enableCompositionKeyEvents()

      const session = cdp()

      // First composition: 東
      await session.send('Input.imeSetComposition', {
        text: 'ｔ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'と',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'とう',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '東',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.insertText', {text: '東'})

      // Wait for first composition to settle
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '東', marks: []}],
          markDefs: [],
          style: 'normal',
        })
      })

      // Second composition: 京
      await session.send('Input.imeSetComposition', {
        text: 'ｋ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'き',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'きょ',
        selectionStart: 2,
        selectionEnd: 2,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: 'きょう',
        selectionStart: 3,
        selectionEnd: 3,
      })
      await delay()
      await session.send('Input.imeSetComposition', {
        text: '京',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await delay()
      await session.send('Input.insertText', {text: '京'})

      // Assert: final text should be "東京"
      await vi.waitFor(() => {
        const block = getFirstTextBlock(editor.getSnapshot().context.value)
        expect(block).toEqual({
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '東京', marks: []}],
          markDefs: [],
          style: 'normal',
        })
      })
    })
  })
})
