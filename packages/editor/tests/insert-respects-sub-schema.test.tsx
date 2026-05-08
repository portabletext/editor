import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [
    {name: 'link', fields: [{name: 'href', type: 'string'}]},
    {name: 'comment', fields: [{name: 'text', type: 'string'}]},
  ],
  inlineObjects: [
    {name: 'mention', fields: [{name: 'text', type: 'string'}]},
    {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
  ],
  blockObjects: [
    {name: 'image', fields: [{name: 'url', type: 'string'}]},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              // Callout's text block has tighter sub-schema than root:
              // only `strong` decorator (no `em`), only `link` annotation
              // (no `comment`), only `mention` inline object (no
              // `stock-ticker`).
              decorators: [{name: 'strong'}],
              annotations: [
                {name: 'link', fields: [{name: 'href', type: 'string'}]},
              ],
              inlineObjects: [
                {name: 'mention', fields: [{name: 'text', type: 'string'}]},
              ],
            },
            // Embed-card is a block-object only available inside callouts.
            // It declares 'href' and 'title'. Used to verify that
            // `block.set` field filtering uses the path's sub-schema.
            {
              type: 'object',
              name: 'embed-card',
              fields: [
                {name: 'href', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            },
          ],
        },
      ],
    },
  ],
})

const calloutContainer = [
  defineContainer({
    scope: '$..callout',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('insert respects sub-schema', () => {
  test('Scenario: inserting an inline object whose type is allowed in the path sub-schema', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    const mentionKey = keyGenerator()

    editor.send({
      type: 'insert.child',
      child: {
        _type: 'mention',
        _key: mentionKey,
        text: '@alice',
      },
    })

    await vi.waitFor(() => {
      return expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: hello|{mention text="@alice"}'].join('\n'),
      )
    })
  })

  test('Scenario: inserting an inline object whose type is NOT in the path sub-schema is rejected', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    const tickerKey = keyGenerator()

    // stock-ticker exists at root but is NOT in callout's block.inlineObjects.
    editor.send({
      type: 'insert.child',
      child: {
        _type: 'stock-ticker',
        _key: tickerKey,
        symbol: 'GOOG',
      },
    })

    // The callout's content is unchanged: the inline object was rejected.
    await vi.waitFor(() => {
      return expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: hello|'].join('\n'),
      )
    })
  })

  test('Scenario: inserting a block object whose type is NOT in the path sub-schema is rejected', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    const imageKey = keyGenerator()

    // image exists at root but is NOT in callout's content of[].
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
        _key: imageKey,
        url: 'https://example.com/cat.png',
      },
      placement: 'auto',
      select: 'end',
    })

    // The callout's content is unchanged: the block object was rejected.
    await vi.waitFor(() => {
      return expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: hello|'].join('\n'),
      )
    })
  })

  test('Scenario: setting properties on an existing inline object whose type is NOT in the path sub-schema noops without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const beforeSpanKey = keyGenerator()
    const tickerKey = keyGenerator()
    const afterSpanKey = keyGenerator()

    // Document was authored when callout's sub-schema allowed stock-ticker.
    // Schema since tightened. The stock-ticker survives loading (principle #2).
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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: beforeSpanKey, text: 'see ', marks: []},
                {
                  _type: 'stock-ticker',
                  _key: tickerKey,
                  symbol: 'GOOG',
                },
                {_type: 'span', _key: afterSpanKey, text: ' today', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    // Try to update the stock-ticker's symbol. Should noop (not throw).
    editor.send({
      type: 'child.set',
      at: [
        {_key: calloutKey},
        'content',
        {_key: innerBlockKey},
        'children',
        {_key: tickerKey},
      ],
      props: {symbol: 'AAPL'},
    })

    // Document is unchanged: the set was rejected silently.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: beforeSpanKey, text: 'see ', marks: []},
                {
                  _type: 'stock-ticker',
                  _key: tickerKey,
                  symbol: 'GOOG',
                },
                {_type: 'span', _key: afterSpanKey, text: ' today', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    // No error logged: the operation noops, it does not throw.
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  test('Scenario: `child.set` on an inline object inside a container filters undeclared fields against the path sub-schema', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const beforeSpanKey = keyGenerator()
    const mentionKey = keyGenerator()
    const afterSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: beforeSpanKey, text: '', marks: []},
                {
                  _type: 'mention',
                  _key: mentionKey,
                  text: '@alice',
                },
                {_type: 'span', _key: afterSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    // Update mention's text and pass an undeclared 'role' field.
    editor.send({
      type: 'child.set',
      at: [
        {_key: calloutKey},
        'content',
        {_key: innerBlockKey},
        'children',
        {_key: mentionKey},
      ],
      props: {text: '@bob', role: 'admin'},
    })

    // Declared 'text' is updated, undeclared 'role' is filtered out.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: beforeSpanKey, text: '', marks: []},
                {
                  _type: 'mention',
                  _key: mentionKey,
                  text: '@bob',
                },
                {_type: 'span', _key: afterSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `block.set` on a block object inside a container filters undeclared fields against the path sub-schema', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const embedKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'embed-card',
              _key: embedKey,
              href: 'https://example.com',
              title: 'Example',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    // Update declared 'title' and pass an undeclared 'description' field.
    editor.send({
      type: 'block.set',
      at: [{_key: calloutKey}, 'content', {_key: embedKey}],
      props: {title: 'New title', description: 'undeclared field'},
    })

    // Declared 'title' is updated, undeclared 'description' is filtered out.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'embed-card',
              _key: embedKey,
              href: 'https://example.com',
              title: 'New title',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `decorator.add` of an allowed decorator inside a container applies the mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    // `strong` is in callout's sub-schema.
    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      return expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: [strong:hello]'].join('\n'),
      )
    })
  })

  test('Scenario: `decorator.add` of a disallowed decorator inside a container does not apply the mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    // `em` exists at root but is NOT in callout's decorators.
    editor.send({type: 'decorator.add', decorator: 'em'})

    // The span has no `em` mark; the callout content is unchanged.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `annotation.add` of an allowed annotation inside a container applies the mark and markDef', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const linkKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    // `link` is in callout's sub-schema.
    editor.send({
      type: 'annotation.add',
      annotation: {
        _key: linkKey,
        name: 'link',
        value: {href: 'https://example.com'},
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'hello',
                  marks: [linkKey],
                },
              ],
              markDefs: [
                {_key: linkKey, _type: 'link', href: 'https://example.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `annotation.add` of a disallowed annotation inside a container does not apply the mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const commentKey = keyGenerator()

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
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    // `comment` exists at root but is NOT in callout's annotations.
    editor.send({
      type: 'annotation.add',
      annotation: {
        _key: commentKey,
        name: 'comment',
        value: {text: 'a comment'},
      },
    })

    // The block's markDefs and span marks are unchanged.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: \`decorator.add\` of a decorator not declared at root does not apply the mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })

    // \`underline\` is not declared in the root schema.
    editor.send({type: 'decorator.add', decorator: 'underline'})

    // The span has no \`underline\` mark; the block is unchanged.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: \`annotation.add\` of an annotation not declared at root does not apply the mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const annotationKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })

    // \`footnote\` is not declared in the root schema.
    editor.send({
      type: 'annotation.add',
      annotation: {
        _key: annotationKey,
        name: 'footnote',
        value: {text: 'unused'},
      },
    })

    // The span has no \`footnote\` mark and no markDef is added.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
