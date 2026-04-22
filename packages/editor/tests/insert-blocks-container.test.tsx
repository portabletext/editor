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

describe('insert.blocks inside an editable container', () => {
  test('pasting a single text block at the end of a code-block line appends its text to the line', async () => {
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

    const endOfLine = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: lineSpanKey},
      ],
      offset: 3,
    }

    editor.send({
      type: 'select',
      at: {anchor: endOfLine, focus: endOfLine},
    })

    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'block',
          _key: 'pasted-block',
          children: [
            {_type: 'span', _key: 'pasted-span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      placement: 'auto',
      select: 'end',
    })

    const snapshot = editor.getSnapshot()

    // Pasting a single text block at the end of a line should merge — the
    // line's text becomes 'foobar'.
    const value = snapshot.context.value as Array<{
      _key: string
      lines?: Array<{_key: string; children: Array<{text?: string}>}>
    }>
    const block = value[0]!
    const line = block.lines?.[0]
    const lineText = line?.children.map((c) => c.text ?? '').join('') ?? ''

    expect(lineText).toBe('foobar')
  })

  test('pasting two text blocks into the middle of a code-block line splits the line', async () => {
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
                {_type: 'span', _key: lineSpanKey, text: 'foobar', marks: []},
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

    const middleOfLine = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: lineSpanKey},
      ],
      offset: 3,
    }

    editor.send({
      type: 'select',
      at: {anchor: middleOfLine, focus: middleOfLine},
    })

    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'block',
          _key: 'pasted-1',
          children: [{_type: 'span', _key: 'p1s', text: 'ONE', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'pasted-2',
          children: [{_type: 'span', _key: 'p2s', text: 'TWO', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      placement: 'auto',
      select: 'end',
    })

    const snapshot = editor.getSnapshot()
    const value = snapshot.context.value as Array<{
      _key: string
      lines?: Array<{_key: string; children: Array<{text?: string}>}>
    }>
    const lines = value[0]?.lines ?? []
    const lineTexts = lines.map((l) =>
      l.children.map((c) => c.text ?? '').join(''),
    )

    // Expected: the line's text is split at 'foo' | 'bar', the first pasted
    // block merges into the first half ('fooONE'), and the second pasted
    // block fragment-merges with the right half ('TWObar') because
    // `placement: 'auto'` merges the trailing block's content into the
    // existing remainder when the caret is mid-text-block.
    expect(lineTexts).toEqual(['fooONE', 'TWObar'])
  })
})
