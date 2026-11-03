import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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
    type: 'callout',
    arrayField: 'content',
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      children: <NodePlugin nodes={calloutContainer} />,
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
    // The stock-ticker renders inside the callout despite predating the
    // schema tightening (principle #2 below), so the render layer logs a
    // schema-mismatch diagnostic for it. Silence it; this test pins the
    // operation's own noop-without-throwing contract, not render output.
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      children: <NodePlugin nodes={calloutContainer} />,
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      children: <NodePlugin nodes={calloutContainer} />,
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
    expect(consoleError.mock.calls).toEqual([])
    consoleError.mockRestore()
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      children: <NodePlugin nodes={calloutContainer} />,
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      children: <NodePlugin nodes={calloutContainer} />,
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
    expect(consoleError.mock.calls).toEqual([
      [
        new Error(
          'Performing "annotation.add" failed due to: Failed to parse annotation {"_key":"k3","name":"comment","value":{"text":"a comment"}}',
        ),
      ],
    ])
    consoleError.mockRestore()
  })

  test('Scenario: `decorator.add` of a decorator not declared at root does not apply the mark', async () => {
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

  test('Scenario: `annotation.add` of an annotation not declared at root does not apply the mark', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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
    expect(consoleError.mock.calls).toEqual([
      [
        new Error(
          'Performing "annotation.add" failed due to: Failed to parse annotation {"_key":"k2","name":"footnote","value":{"text":"unused"}}',
        ),
      ],
    ])
    consoleError.mockRestore()
  })
})

describe('bare type references resolve to the nearest enclosing declaration', () => {
  test('Scenario: `insert.block` of a recursive type declared inline keeps every field two levels deep', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sectionKey = keyGenerator()
    const outerSubsectionKey = keyGenerator()
    const innerSubsectionKey = keyGenerator()
    const insertedSubsectionKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: recursiveSectionSchemaDefinition,
      initialValue: [
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'bar',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={recursiveSectionContainers} />,
    })

    const caretPath = [
      {_key: sectionKey},
      'content',
      {_key: outerSubsectionKey},
      'content',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'subsection',
        _key: insertedSubsectionKey,
        title: 'baz',
        content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: insertedSubsectionKey,
                  title: 'baz',
                  content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                },
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'bar',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `insert.blocks` of a recursive type declared inline keeps every field two levels deep', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sectionKey = keyGenerator()
    const outerSubsectionKey = keyGenerator()
    const innerSubsectionKey = keyGenerator()
    const insertedSubsectionKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: recursiveSectionSchemaDefinition,
      initialValue: [
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'bar',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={recursiveSectionContainers} />,
    })

    const caretPath = [
      {_key: sectionKey},
      'content',
      {_key: outerSubsectionKey},
      'content',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'subsection',
          _key: insertedSubsectionKey,
          title: 'baz',
          content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
        },
      ],
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: insertedSubsectionKey,
                  title: 'baz',
                  content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                },
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'bar',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `block.set` on a recursive type declared inline changes its field two levels deep', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sectionKey = keyGenerator()
    const outerSubsectionKey = keyGenerator()
    const innerSubsectionKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: recursiveSectionSchemaDefinition,
      initialValue: [
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'bar',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={recursiveSectionContainers} />,
    })

    editor.send({
      type: 'block.set',
      at: [
        {_key: sectionKey},
        'content',
        {_key: outerSubsectionKey},
        'content',
        {_key: innerSubsectionKey},
      ],
      props: {title: 'baz'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'subsection',
              _key: outerSubsectionKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'subsection',
                  _key: innerSubsectionKey,
                  title: 'baz',
                  content: [textBlock(barBlockKey, barSpanKey, 'bar')],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `insert.block` of a recursive type declared inline keeps every field two levels deep inside another container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const sectionKey = keyGenerator()
    const outerSubsectionKey = keyGenerator()
    const insertedSubsectionKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'section'}],
              },
            ],
          },
          ...recursiveSectionSchemaDefinition.blockObjects,
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'section',
              _key: sectionKey,
              content: [
                {
                  _type: 'subsection',
                  _key: outerSubsectionKey,
                  title: 'foo',
                  content: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
            ...recursiveSectionContainers,
          ]}
        />
      ),
    })

    const caretPath = [
      {_key: calloutKey},
      'content',
      {_key: sectionKey},
      'content',
      {_key: outerSubsectionKey},
      'content',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'subsection',
        _key: insertedSubsectionKey,
        title: 'baz',
        content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'section',
              _key: sectionKey,
              content: [
                {
                  _type: 'subsection',
                  _key: outerSubsectionKey,
                  title: 'foo',
                  content: [
                    textBlock(fooBlockKey, fooSpanKey, 'foo'),
                    {
                      _type: 'subsection',
                      _key: insertedSubsectionKey,
                      title: 'baz',
                      content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `insert.block` of a recursive type declared inline in the array field of a block object with other fields keeps every field two levels deep', async () => {
    const keyGenerator = createTestKeyGenerator()
    const figureKey = keyGenerator()
    const asideKey = keyGenerator()
    const insertedAsideKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'figure',
            fields: [
              {name: 'src', type: 'string'},
              {
                name: 'caption',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'aside',
                    fields: [
                      {name: 'note', type: 'string'},
                      {
                        name: 'body',
                        type: 'array',
                        of: [{type: 'block'}, {type: 'aside'}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'figure',
          _key: figureKey,
          src: 'foo',
          caption: [
            {
              _type: 'aside',
              _key: asideKey,
              note: 'bar',
              body: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'figure',
              arrayField: 'caption',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'aside',
              arrayField: 'body',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    const caretPath = [
      {_key: figureKey},
      'caption',
      {_key: asideKey},
      'body',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'aside',
        _key: insertedAsideKey,
        note: 'baz',
        body: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'figure',
          _key: figureKey,
          src: 'foo',
          caption: [
            {
              _type: 'aside',
              _key: asideKey,
              note: 'bar',
              body: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'aside',
                  _key: insertedAsideKey,
                  note: 'baz',
                  body: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `insert.block` of a bare reference resolves against the nearest of two same-named enclosing declarations', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sectionKey = keyGenerator()
    const outerBoxKey = keyGenerator()
    const panelKey = keyGenerator()
    const innerBoxKey = keyGenerator()
    const insertedBoxKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'section',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'box',
                    fields: [
                      {name: 'title', type: 'string'},
                      {
                        name: 'content',
                        type: 'array',
                        of: [
                          {type: 'block'},
                          {
                            type: 'object',
                            name: 'panel',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [
                                  {type: 'block'},
                                  {
                                    type: 'object',
                                    name: 'box',
                                    fields: [
                                      {name: 'tone', type: 'string'},
                                      {
                                        name: 'content',
                                        type: 'array',
                                        of: [{type: 'block'}, {type: 'box'}],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'box',
              _key: outerBoxKey,
              title: 'foo',
              content: [
                {
                  _type: 'panel',
                  _key: panelKey,
                  content: [
                    {
                      _type: 'box',
                      _key: innerBoxKey,
                      tone: 'bar',
                      content: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'section',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
              of: [
                defineContainer({
                  type: 'box',
                  arrayField: 'content',
                  render: ({children}) => <>{children}</>,
                  of: [
                    defineContainer({
                      type: 'panel',
                      arrayField: 'content',
                      render: ({children}) => <>{children}</>,
                      of: [
                        defineContainer({
                          type: 'box',
                          arrayField: 'content',
                          render: ({children}) => <>{children}</>,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    const caretPath = [
      {_key: sectionKey},
      'content',
      {_key: outerBoxKey},
      'content',
      {_key: panelKey},
      'content',
      {_key: innerBoxKey},
      'content',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'box',
        _key: insertedBoxKey,
        title: 'baz',
        tone: 'baz',
        content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'box',
              _key: outerBoxKey,
              title: 'foo',
              content: [
                {
                  _type: 'panel',
                  _key: panelKey,
                  content: [
                    {
                      _type: 'box',
                      _key: innerBoxKey,
                      tone: 'bar',
                      content: [
                        textBlock(fooBlockKey, fooSpanKey, 'foo'),
                        {
                          _type: 'box',
                          _key: insertedBoxKey,
                          tone: 'baz',
                          content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `insert.block` of a type whose field references an enclosing declaration keeps the fields of the nested reference', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sectionKey = keyGenerator()
    const boxKey = keyGenerator()
    const insertedPanelKey = keyGenerator()
    const nestedBoxKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'section',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'box',
                    fields: [
                      {name: 'title', type: 'string'},
                      {
                        name: 'content',
                        type: 'array',
                        of: [
                          {type: 'block'},
                          {
                            type: 'object',
                            name: 'panel',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [{type: 'block'}, {type: 'box'}],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'box',
              _key: boxKey,
              title: 'foo',
              content: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'section',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'box',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'panel',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    const caretPath = [
      {_key: sectionKey},
      'content',
      {_key: boxKey},
      'content',
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: caretPath, offset: 3},
        focus: {path: caretPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'panel',
        _key: insertedPanelKey,
        content: [
          {
            _type: 'box',
            _key: nestedBoxKey,
            title: 'baz',
            tone: 'baz',
            content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
          },
        ],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'box',
              _key: boxKey,
              title: 'foo',
              content: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                {
                  _type: 'panel',
                  _key: insertedPanelKey,
                  content: [
                    {
                      _type: 'box',
                      _key: nestedBoxKey,
                      title: 'baz',
                      content: [textBlock(bazBlockKey, bazSpanKey, 'baz')],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })
})

const recursiveSectionSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'section',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {
              type: 'object',
              name: 'subsection',
              fields: [
                {name: 'title', type: 'string'},
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block'}, {type: 'subsection'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const recursiveSectionContainers = [
  defineContainer({
    type: 'section',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'subsection',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

function textBlock(key: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}
