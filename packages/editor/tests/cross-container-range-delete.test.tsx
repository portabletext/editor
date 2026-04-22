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
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {name: 'image'},
  ],
})

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..code-block',
    field: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('cross-container range delete', () => {
  test('root text block -> code-block line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: lineSpanKey, text: 'r', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('code-block line -> root text block below', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()

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
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: lineSpanKey, text: 'f', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: 'r', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('across three root siblings with a container in the middle merges outer text blocks (same parent)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const firstTextKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const lastTextKey = keyGenerator()
    const lastSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: firstTextKey,
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: lastTextKey,
          children: [
            {_type: 'span', _key: lastSpanKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: firstTextKey}, 'children', {_key: firstSpanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: lastTextKey}, 'children', {_key: lastSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: firstTextKey,
        children: [{_type: 'span', _key: firstSpanKey, text: 'foz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('across two sibling containers (callout - code-block)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: calloutBlockKey,
              children: [
                {_type: 'span', _key: calloutSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: calloutBlockKey},
            'children',
            {_key: calloutSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: calloutBlockKey,
            children: [
              {_type: 'span', _key: calloutSpanKey, text: 'f', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: lineSpanKey, text: 'r', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('within same container across two lines still merges (same-parent path unchanged)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const firstLineKey = keyGenerator()
    const firstLineSpanKey = keyGenerator()
    const secondLineKey = keyGenerator()
    const secondLineSpanKey = keyGenerator()

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
              _key: firstLineKey,
              children: [
                {
                  _type: 'span',
                  _key: firstLineSpanKey,
                  text: 'foo',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: secondLineKey,
              children: [
                {
                  _type: 'span',
                  _key: secondLineSpanKey,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: firstLineKey},
            'children',
            {_key: firstLineSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: secondLineKey},
            'children',
            {_key: secondLineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: firstLineKey,
            children: [
              {_type: 'span', _key: firstLineSpanKey, text: 'fr', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('range selection covering a root void block merges outer text blocks (same parent)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const firstTextKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const lastTextKey = keyGenerator()
    const lastSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: firstTextKey,
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'image', _key: imageKey},
        {
          _type: 'block',
          _key: lastTextKey,
          children: [
            {_type: 'span', _key: lastSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: firstTextKey}, 'children', {_key: firstSpanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: lastTextKey}, 'children', {_key: lastSpanKey}],
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: firstTextKey,
        children: [
          {_type: 'span', _key: firstSpanKey, text: 'foar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
