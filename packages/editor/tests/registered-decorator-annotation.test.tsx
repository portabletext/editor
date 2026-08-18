import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {
  AnnotationRenderProps,
  BlockAnnotationRenderProps,
  BlockDecoratorRenderProps,
  PortableTextObject,
} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineAnnotation,
  defineDecorator,
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

  test('registered render beats renderDecorator prop for its type; prop still fires for an unregistered decorator', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="registered-strong">{children}</strong>
      ),
    })

    const renderDecorator = vi.fn((props: BlockDecoratorRenderProps) => (
      <span data-testid={`legacy-${props.value}`}>{props.children}</span>
    ))

    await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue: [
        twoMarkedSpansBlock(blockKey, spanAKey, spanBKey, 'strong', 'em'),
      ],
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[strongDecorator]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-strong"]')
          ?.textContent,
      ).toEqual('foo')
      expect(
        document.querySelector('[data-testid="legacy-em"]')?.textContent,
      ).toEqual('bar')
    })

    expect(
      renderDecorator.mock.calls.filter(([props]) => props.value === 'strong'),
    ).toEqual([])
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

  test('nesting order follows marks order across mixed dispatch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="registered-strong">{children}</strong>
      ),
    })

    const renderDecorator = (props: BlockDecoratorRenderProps) => (
      <em data-testid="legacy-em">{props.children}</em>
    )

    await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'bar',
              marks: ['strong', 'em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[strongDecorator]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector(
          '[data-testid="legacy-em"] [data-testid="registered-strong"]',
        ),
      ).not.toEqual(null)
      expect(
        document.querySelector(
          '[data-testid="registered-strong"] [data-testid="legacy-em"]',
        ),
      ).toEqual(null)
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

  test('unregister falls back to the legacy prop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const strongDecorator = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="registered-strong">{children}</strong>
      ),
    })

    const renderDecorator = (props: BlockDecoratorRenderProps) => (
      <em data-testid="legacy-strong">{props.children}</em>
    )

    const initialValue = [
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

    const {rerender} = await createTestEditor({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue,
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[strongDecorator]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-strong"]')
          ?.textContent,
      ).toEqual('bar')
    })

    await rerender({
      keyGenerator,
      schemaDefinition: decoratorSchema,
      initialValue,
      editableProps: {renderDecorator},
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-strong"]'),
      ).toEqual(null)
      expect(
        document.querySelector('[data-testid="legacy-strong"]')?.textContent,
      ).toEqual('bar')
    })
  })
})

describe('registered annotation', () => {
  test('registered render receives the markDef as `annotation` and beats renderAnnotation prop; prop still fires for an unregistered annotation type', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const linkKey = keyGenerator()
    const commentKey = keyGenerator()

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

    const renderAnnotation = vi.fn((props: BlockAnnotationRenderProps) => (
      <span data-testid={`legacy-${props.value._type}`}>{props.children}</span>
    ))

    await createTestEditor({
      keyGenerator,
      schemaDefinition: annotationSchema,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanAKey, _type: 'span', text: 'foo', marks: [linkKey]},
            {_key: spanBKey, _type: 'span', text: 'bar', marks: [commentKey]},
          ],
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
            },
            {_key: commentKey, _type: 'comment', text: 'hi'},
          ],
          style: 'normal',
        },
      ],
      editableProps: {renderAnnotation},
      children: <NodePlugin nodes={[linkAnnotation]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="registered-link"]')?.textContent,
      ).toEqual('foo')
      expect(
        document.querySelector('[data-testid="legacy-comment"]')?.textContent,
      ).toEqual('bar')
    })

    expect(receivedNode).toEqual({
      _key: linkKey,
      _type: 'link',
      href: 'https://example.com',
    })
    expect(
      renderAnnotation.mock.calls.filter(
        ([props]) => props.value._type === 'link',
      ),
    ).toEqual([])
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
