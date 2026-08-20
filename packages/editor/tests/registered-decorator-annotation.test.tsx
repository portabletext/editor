import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {AnnotationRenderProps, PortableTextObject} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineAnnotation,
  defineDecorator,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const decoratorSchema = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
})

const annotationSchema = defineSchema({
  annotations: [
    {name: 'link', fields: [{name: 'href', type: 'string'}]},
    {name: 'comment', fields: [{name: 'text', type: 'string'}]},
  ],
})

describe('registered decorator', () => {
  test('registered render fires for its type', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="registered-strong">{children}</strong>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[strongDecorator]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-strong"]')
          ?.textContent,
      ).toEqual('bar')
    })
  })

  test('renderDefault output equals the unregistered output', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const value = [
      {
        _key: blockKey,
        _type: 'block' as const,
        children: [
          {
            _key: spanKey,
            _type: 'span' as const,
            text: 'bar',
            marks: ['strong'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const identityRender = vi.fn((props) => props.renderDefault(props))
    const identityDecorator = defineDecorator({
      type: 'strong',
      render: identityRender,
    })

    const {locator: registeredLocator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: decoratorSchema,
      initialValue: value,
      children: <NodePlugin nodes={[identityDecorator]} />,
    })

    const {locator: unregisteredLocator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: decoratorSchema,
      initialValue: value,
    })

    await vi.waitFor(() => {
      expect(registeredLocator.element().innerHTML).toEqual(
        unregisteredLocator.element().innerHTML,
      )
    })

    expect(identityRender).toHaveBeenCalled()
  })

  test('focused and selected marks reflect the cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children, focused, selected}) => (
        <strong
          data-testid="registered-strong"
          data-focused={String(focused)}
          data-selected={String(selected)}
        >
          {children}
        </strong>
      ),
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo '},
            {
              _key: barSpanKey,
              _type: 'span',
              text: 'bar',
              marks: ['strong'],
            },
            {_key: bazSpanKey, _type: 'span', text: ' baz'},
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
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      const strong = document.querySelector('[data-testid="registered-strong"]')
      expect(strong?.getAttribute('data-focused')).toEqual('false')
      expect(strong?.getAttribute('data-selected')).toEqual('false')
    })

    // Cursor is now at "foo b|ar baz", inside the marked text.
    await userEvent.keyboard('{ArrowRight}')
    await vi.waitFor(() => {
      const strong = document.querySelector('[data-testid="registered-strong"]')
      expect(strong?.getAttribute('data-focused')).toEqual('true')
      expect(strong?.getAttribute('data-selected')).toEqual('true')
    })

    // Cursor is now at "foo bar |baz", past the marked text.
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    await vi.waitFor(() => {
      const strong = document.querySelector('[data-testid="registered-strong"]')
      expect(strong?.getAttribute('data-focused')).toEqual('false')
      expect(strong?.getAttribute('data-selected')).toEqual('false')
    })
  })

  test('composes inside a registered text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => <strong>{children}</strong>,
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[textBlock, strongDecorator]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      expect(root!.innerHTML).toContain('<strong>')
    })
  })

  test('a registered decorator whose name is not in the schema never fires', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const codeDecorator = defineDecorator({
      type: 'code',
      render: ({children}) => (
        <code data-testid="should-not-fire">{children}</code>
      ),
    })

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="registered-strong">{children}</strong>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue: [
        twoMarkedSpansBlock(blockKey, spanAKey, spanBKey, 'strong', 'code'),
      ],
      children: <NodePlugin nodes={[codeDecorator, strongDecorator]} />,
    })

    // Both decorators mount in the same `NodePlugin` effect: waiting on
    // `strongDecorator`'s output proves `codeDecorator` registered too.
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-strong"]')
          ?.textContent,
      ).toEqual('foo')
    })

    expect(document.querySelector('[data-testid="should-not-fire"]')).toEqual(
      null,
    )
  })
})

describe('registered annotation', () => {
  test('registered render receives the markDef as `annotation`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    let receivedNode: PortableTextObject | undefined

    const linkAnnotation = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => {
        receivedNode = annotation
        return (
          <a
            data-testid="registered-link"
            href={(annotation as {href?: string}).href}
          >
            {children}
          </a>
        )
      },
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
          ],
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[linkAnnotation]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-link"]')?.textContent,
      ).toEqual('foo')
    })

    expect(receivedNode).toEqual({
      _key: linkKey,
      _type: 'link',
      href: 'https://example.com',
    })
  })

  test('renderDefault output equals the unregistered output', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    const value = [
      {
        _key: blockKey,
        _type: 'block' as const,
        children: [
          {
            _key: spanKey,
            _type: 'span' as const,
            text: 'bar',
            marks: [linkKey],
          },
        ],
        markDefs: [
          {_key: linkKey, _type: 'link' as const, href: 'https://example.com'},
        ],
        style: 'normal',
      },
    ]

    const identityRender = vi.fn((props) => props.renderDefault(props))
    const identityAnnotation = defineAnnotation({
      type: 'link',
      render: identityRender,
    })

    const {locator: registeredLocator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: annotationSchema,
      initialValue: value,
      children: <NodePlugin nodes={[identityAnnotation]} />,
    })

    const {locator: unregisteredLocator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: annotationSchema,
      initialValue: value,
    })

    await vi.waitFor(() => {
      expect(registeredLocator.element().innerHTML).toEqual(
        unregisteredLocator.element().innerHTML,
      )
    })

    expect(identityRender).toHaveBeenCalled()
  })

  test('focused and selected marks reflect the cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const linkAnnotation = defineAnnotation({
      type: 'link',
      render: ({children, focused, selected}) => (
        <span
          data-testid="registered-link"
          data-focused={String(focused)}
          data-selected={String(selected)}
        >
          {children}
        </span>
      ),
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo '},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [linkKey]},
            {_key: bazSpanKey, _type: 'span', text: ' baz'},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[linkAnnotation]} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      const link = document.querySelector('[data-testid="registered-link"]')
      expect(link?.getAttribute('data-focused')).toEqual('false')
      expect(link?.getAttribute('data-selected')).toEqual('false')
    })

    // Cursor is now at "foo b|ar baz", inside the marked text.
    await userEvent.keyboard('{ArrowRight}')
    await vi.waitFor(() => {
      const link = document.querySelector('[data-testid="registered-link"]')
      expect(link?.getAttribute('data-focused')).toEqual('true')
      expect(link?.getAttribute('data-selected')).toEqual('true')
    })

    // Cursor is now at "foo bar |baz", past the marked text.
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    await vi.waitFor(() => {
      const link = document.querySelector('[data-testid="registered-link"]')
      expect(link?.getAttribute('data-focused')).toEqual('false')
      expect(link?.getAttribute('data-selected')).toEqual('false')
    })
  })

  test('composes inside a registered text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const linkAnnotation = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) =>
        typeof annotation['href'] === 'string' ? (
          <a href={annotation['href']}>{children}</a>
        ) : (
          children
        ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[textBlock, linkAnnotation]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      expect(root!.innerHTML).toContain('<a href="https://example.com">')
    })
  })

  test('a registered annotation whose _type is not in the schema never fires', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const linkKey = keyGenerator()
    const unknownKey = keyGenerator()

    const unknownAnnotation = defineAnnotation({
      type: 'unknown-annotation',
      render: ({children}) => (
        <span data-testid="should-not-fire">{children}</span>
      ),
    })

    const linkAnnotation = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => (
        <a
          data-testid="registered-link"
          href={(annotation as {href?: string}).href}
        >
          {children}
        </a>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanAKey, _type: 'span', text: 'foo', marks: [linkKey]},
            {_key: spanBKey, _type: 'span', text: 'bar', marks: [unknownKey]},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
            {_key: unknownKey, _type: 'unknown-annotation'},
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[unknownAnnotation, linkAnnotation]} />,
    })

    // Both annotations mount in the same `NodePlugin` effect: waiting on
    // `linkAnnotation`'s output proves `unknownAnnotation` registered too.
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-link"]')?.textContent,
      ).toEqual('foo')
    })

    expect(document.querySelector('[data-testid="should-not-fire"]')).toEqual(
      null,
    )
  })

  test('a mark whose markDef is missing is still skipped silently with a registered "*" annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const linkKey = keyGenerator()

    const wildcardRender = vi.fn(
      ({annotation, children}: AnnotationRenderProps) => (
        <span data-testid={`wildcard-${annotation._type}`}>{children}</span>
      ),
    )

    const wildcardAnnotation = defineAnnotation({
      type: '*',
      render: wildcardRender,
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanAKey, _type: 'span', text: 'foo', marks: [linkKey]},
            {
              _key: spanBKey,
              _type: 'span',
              text: 'bar',
              marks: ['missing-mark-def'],
            },
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[wildcardAnnotation]} />,
    })

    // The wildcard fires for `link` and the missing-markDef span in the
    // same render pass: waiting for `wildcard-link` proves registration
    // landed before the call count below rules the other span out.
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="wildcard-link"]')?.textContent,
      ).toEqual('foo')
    })

    expect(
      new Set(
        wildcardRender.mock.calls.map(([props]) => props.annotation._type),
      ),
    ).toEqual(new Set(['link']))
  })

  test('a markDef whose _type is not in the schema is still skipped silently with a registered "*" annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const linkKey = keyGenerator()
    const unknownKey = keyGenerator()

    const wildcardRender = vi.fn(
      ({annotation, children}: AnnotationRenderProps) => (
        <span data-testid={`wildcard-${annotation._type}`}>{children}</span>
      ),
    )

    const wildcardAnnotation = defineAnnotation({
      type: '*',
      render: wildcardRender,
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanAKey, _type: 'span', text: 'foo', marks: [linkKey]},
            {_key: spanBKey, _type: 'span', text: 'bar', marks: [unknownKey]},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
            {_key: unknownKey, _type: 'unknown-annotation'},
          ],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[wildcardAnnotation]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="wildcard-link"]')?.textContent,
      ).toEqual('foo')
    })

    expect(
      new Set(
        wildcardRender.mock.calls.map(([props]) => props.annotation._type),
      ),
    ).toEqual(new Set(['link']))
  })
})

function twoMarkedSpansBlock(
  blockKey: string,
  spanAKey: string,
  spanBKey: string,
  markA: string,
  markB: string,
) {
  return {
    _key: blockKey,
    _type: 'block' as const,
    children: [
      {_key: spanAKey, _type: 'span' as const, text: 'foo', marks: [markA]},
      {_key: spanBKey, _type: 'span' as const, text: 'bar', marks: [markB]},
    ],
    markDefs: [],
    style: 'normal',
  }
}
