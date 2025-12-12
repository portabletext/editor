import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import {createRenderers, defineRenderer} from '../src/renderers'
import {createTestEditor} from '../src/test/vitest'

describe('Renderer API', () => {
  test('minimum block renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'h1',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Hello, world!'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            // No schema generic needed - name: 'block' automatically infers TextBlockRenderProps
            defineRenderer({
              type: 'block',
              name: 'block',
              render: ({attributes, children, node}) => {
                // node.style is inferred as string | undefined (from PortableTextTextBlock)
                return (
                  <div
                    {...attributes}
                    data-testid="block"
                    data-style={node.style}
                  >
                    {children}
                  </div>
                )
              },
            }),
          ]}
        />
      ),
    })

    const blockLocator = locator.getByTestId('block')

    await vi.waitFor(() => {
      expect(blockLocator).toBeInTheDocument()

      expect(blockLocator.getByText('Hello, world!')).toBeInTheDocument()
    })
  })

  test('conflicting block renderers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Hello, world!'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'block',
              name: 'block',
              render: ({attributes, children}) => {
                return (
                  <div {...attributes} data-testid="block-a">
                    {children}
                  </div>
                )
              },
            }),
            defineRenderer({
              type: 'block',
              name: 'block',
              render: ({attributes, children}) => {
                return (
                  <div {...attributes} data-testid="block-b">
                    {children}
                  </div>
                )
              },
            }),
          ]}
        />
      ),
    })

    const blockLocator = locator.getByTestId('block-a')

    await vi.waitFor(() => {
      expect(blockLocator).toBeInTheDocument()

      expect(blockLocator.getByText('Hello, world!')).toBeInTheDocument()
    })
  })

  test('mixing custom and default renderers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: keyGenerator(), text: 'bar'}],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'block',
              name: 'block',
              render: ({attributes, children, renderDefault, node}) => {
                if (node._key === fooBlockKey) {
                  return renderDefault()
                }

                return (
                  <div {...attributes} data-testid="bar">
                    {children}
                  </div>
                )
              },
            }),
          ]}
        />
      ),
    })

    const textLocator = locator.getByText('foo')
    await vi.waitFor(() => expect.element(textLocator).toBeInTheDocument())

    // Verify legacy CSS classes are present from renderDefault()
    // The text should be inside a block element with these classes
    await vi.waitFor(() => {
      const textElement = textLocator.element()
      const blockElement = textElement?.closest(
        '.pt-block.pt-text-block.pt-text-block-style-normal',
      )
      expect(blockElement).not.toBeNull()
    })

    const barLocator = locator.getByTestId('bar')
    await vi.waitFor(() => expect.element(barLocator).toBeInTheDocument())
  })

  test('block object renderer', async () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [
            {name: 'src', type: 'string'},
            {name: 'alt', type: 'string'},
          ],
        },
      ],
    })
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schema,
      initialValue: [
        {
          _type: 'image',
          _key: keyGenerator(),
          src: 'https://example.com/image.jpg',
          alt: 'A test image',
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            createRenderers(schema).defineRenderer({
              type: 'block',
              name: 'image',
              render: ({attributes, children, node}) => {
                // With schema type inference:
                // - node._type is 'image' (literal)
                // - node.src is string
                // - node.alt is string
                return (
                  <figure {...attributes} data-testid="custom-image">
                    <img src={node.src} alt={node.alt} />
                    {children}
                  </figure>
                )
              },
            }),
          ]}
        />
      ),
    })

    const imageLocator = locator.getByTestId('custom-image')
    await vi.waitFor(() => expect.element(imageLocator).toBeInTheDocument())

    // Verify the img element is inside
    await vi.waitFor(() => {
      const imageElement = imageLocator.element()
      const img = imageElement?.querySelector('img')
      expect(img).not.toBeNull()
      expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg')
    })
  })

  test('inline object renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = defineSchema({
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    })
    const {defineRenderer} = createRenderers(schema)
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schema,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Stock: '},
            {_type: 'stock-ticker', _key: keyGenerator(), symbol: 'AAPL'},
            {_type: 'span', _key: keyGenerator(), text: ' is up.'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            // Using createRenderers(schema) for full type inference - node.symbol is inferred!
            defineRenderer({
              type: 'inline',
              name: 'stock-ticker',
              render: ({attributes, children, node}) => {
                return (
                  <span
                    {...attributes}
                    data-testid="custom-stock-ticker"
                    data-symbol={node.symbol}
                  >
                    ${node.symbol}
                    {children}
                  </span>
                )
              },
            }),
          ]}
        />
      ),
    })

    const stockLocator = locator.getByTestId('custom-stock-ticker')
    await vi.waitFor(() => expect.element(stockLocator).toBeInTheDocument())

    // Verify the symbol data attribute
    await vi.waitFor(() => {
      const stockElement = stockLocator.element()
      expect(stockElement?.getAttribute('data-symbol')).toBe('AAPL')
    })
  })

  test('span renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Hello, '},
            {_type: 'stock-ticker', _key: keyGenerator()},
            {_type: 'span', _key: keyGenerator(), text: 'world!'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            // Span renderer - name: 'span' automatically infers SpanRenderProps
            defineRenderer({
              type: 'inline',
              name: 'span',
              render: ({attributes, children, node}) => {
                return (
                  <span
                    {...attributes}
                    data-testid="custom-span"
                    data-text={node.text}
                  >
                    {children}
                  </span>
                )
              },
            }),
          ]}
        />
      ),
    })

    const spanLocators = locator.getByTestId('custom-span')
    await vi.waitFor(() => {
      const spans = spanLocators.all()
      expect(spans.length).toBe(2)
    })

    // Verify the text data attributes
    await vi.waitFor(() => {
      const spans = spanLocators.all()
      const texts = spans.map((span) =>
        span.element()?.getAttribute('data-text'),
      )
      expect(texts).toContain('Hello, ')
      expect(texts).toContain('world!')
    })
  })

  test('decorator renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'highlight'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Normal '},
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'highlighted',
              marks: ['highlight'],
            },
            {_type: 'span', _key: keyGenerator(), text: ' text'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'decorator',
              name: 'highlight',
              render: ({children}) => {
                return (
                  <mark data-testid="custom-highlight" className="highlight">
                    {children}
                  </mark>
                )
              },
            }),
          ]}
        />
      ),
    })

    const highlightLocator = locator.getByTestId('custom-highlight')
    await vi.waitFor(() => expect.element(highlightLocator).toBeInTheDocument())

    // Verify the text content
    await vi.waitFor(() => {
      const highlightElement = highlightLocator.element()
      expect(highlightElement?.textContent).toBe('highlighted')
      expect(highlightElement?.className).toBe('highlight')
    })
  })

  test('annotation renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const linkKey = keyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Check out '},
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'this link',
              marks: [linkKey],
            },
            {_type: 'span', _key: keyGenerator(), text: ' for more.'},
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'annotation',
              name: 'link',
              render: ({children, node}) => {
                const linkNode = node as unknown as {href: string}
                return (
                  <a
                    href={linkNode.href}
                    data-testid="custom-link"
                    className="custom-link"
                  >
                    {children}
                  </a>
                )
              },
            }),
          ]}
        />
      ),
    })

    const linkLocator = locator.getByTestId('custom-link')
    await vi.waitFor(() => expect.element(linkLocator).toBeInTheDocument())

    // Verify the href and text content
    await vi.waitFor(() => {
      const linkElement = linkLocator.element()
      expect(linkElement?.getAttribute('href')).toBe('https://example.com')
      expect(linkElement?.textContent).toBe('this link')
      expect(linkElement?.className).toBe('custom-link')
    })
  })

  test('multiple renderer types together', async () => {
    const keyGenerator = createTestKeyGenerator()
    const linkKey = keyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
        inlineObjects: [{name: 'emoji'}],
        decorators: [{name: 'code'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'Hello '},
            {_type: 'emoji', _key: keyGenerator(), name: 'smile'},
            {_type: 'span', _key: keyGenerator(), text: ' click '},
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'here',
              marks: [linkKey],
            },
            {_type: 'span', _key: keyGenerator(), text: ' or run '},
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'npm install',
              marks: ['code'],
            },
          ],
        },
        {_type: 'image', _key: keyGenerator()},
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'block',
              name: 'image',
              render: ({attributes, children}) => (
                <div {...attributes} data-testid="custom-image">
                  {children}
                </div>
              ),
            }),
            defineRenderer({
              type: 'inline',
              name: 'emoji',
              render: ({attributes, children, node}) => {
                const emojiNode = node as unknown as {name: string}
                return (
                  <span {...attributes} data-testid="custom-emoji">
                    :{emojiNode.name}:{children}
                  </span>
                )
              },
            }),
            defineRenderer({
              type: 'decorator',
              name: 'code',
              render: ({children}) => (
                <code data-testid="custom-code">{children}</code>
              ),
            }),
            defineRenderer({
              type: 'annotation',
              name: 'link',
              render: ({children, node}) => {
                const linkNode = node as unknown as {href: string}
                return (
                  <a href={linkNode.href} data-testid="custom-link">
                    {children}
                  </a>
                )
              },
            }),
          ]}
        />
      ),
    })

    // Verify all custom renderers are present
    const imageLocator = locator.getByTestId('custom-image')
    const emojiLocator = locator.getByTestId('custom-emoji')
    const codeLocator = locator.getByTestId('custom-code')
    const linkLocator = locator.getByTestId('custom-link')

    await vi.waitFor(() => expect.element(imageLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(emojiLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(codeLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(linkLocator).toBeInTheDocument())

    // Verify content
    await vi.waitFor(() => {
      expect(emojiLocator.element()?.textContent).toContain(':smile:')
      expect(codeLocator.element()?.textContent).toBe('npm install')
      expect(linkLocator.element()?.textContent).toBe('here')
    })
  })

  test('guard returns false skips renderer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const h1Key = keyGenerator()
    const normalKey = keyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: h1Key,
          style: 'h1',
          children: [{_type: 'span', _key: keyGenerator(), text: 'Heading'}],
        },
        {
          _type: 'block',
          _key: normalKey,
          style: 'normal',
          children: [{_type: 'span', _key: keyGenerator(), text: 'Normal'}],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            // This renderer only handles h1 blocks
            defineRenderer({
              type: 'block',
              name: 'block',
              guard: ({node}) => node.style === 'h1',
              render: ({attributes, children}) => (
                <h1 {...attributes} data-testid="custom-h1">
                  {children}
                </h1>
              ),
            }),
          ]}
        />
      ),
    })

    const h1Locator = locator.getByTestId('custom-h1')
    await vi.waitFor(() => expect.element(h1Locator).toBeInTheDocument())

    // Normal block should use default rendering (no custom testid)
    await vi.waitFor(() => {
      const h1Element = h1Locator.element()
      expect(h1Element?.textContent).toBe('Heading')
    })

    // Verify normal block uses default rendering
    const normalTextLocator = locator.getByText('Normal')
    await vi.waitFor(() => {
      const normalElement = normalTextLocator.element()
      // Should not have custom testid - uses default rendering
      expect(normalElement?.closest('[data-testid="custom-h1"]')).toBeNull()
    })
  })

  test('guard with object response passes data to render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'h1',
          children: [{_type: 'span', _key: keyGenerator(), text: 'Heading'}],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'block',
              name: 'block',
              guard: ({node}) => {
                // Return computed data for the render function
                return {
                  headingLevel:
                    node.style === 'h1' ? 1 : node.style === 'h2' ? 2 : 0,
                }
              },
              render: ({attributes, children}, guardResponse) => {
                return (
                  <div
                    {...attributes}
                    data-testid="custom-block"
                    data-heading-level={guardResponse.headingLevel}
                  >
                    {children}
                  </div>
                )
              },
            }),
          ]}
        />
      ),
    })

    const blockLocator = locator.getByTestId('custom-block')
    await vi.waitFor(() => expect.element(blockLocator).toBeInTheDocument())

    await vi.waitFor(() => {
      const blockElement = blockLocator.element()
      expect(blockElement?.getAttribute('data-heading-level')).toBe('1')
    })
  })

  test('multiple renderers with guards - first match wins', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          style: 'h1',
          children: [{_type: 'span', _key: keyGenerator(), text: 'Heading'}],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            // First renderer - matches h1
            defineRenderer({
              type: 'block',
              name: 'block',
              guard: ({node}) => node.style === 'h1',
              render: ({attributes, children}) => (
                <h1 {...attributes} data-testid="first-renderer">
                  {children}
                </h1>
              ),
            }),
            // Second renderer - also matches h1, but should be skipped
            defineRenderer({
              type: 'block',
              name: 'block',
              guard: ({node}) => node.style === 'h1',
              render: ({attributes, children}) => (
                <h1 {...attributes} data-testid="second-renderer">
                  {children}
                </h1>
              ),
            }),
          ]}
        />
      ),
    })

    const firstLocator = locator.getByTestId('first-renderer')
    await vi.waitFor(() => expect.element(firstLocator).toBeInTheDocument())

    // Second renderer should not be used
    await vi.waitFor(() => {
      const secondRenderers = locator.getByTestId('second-renderer').all()
      expect(secondRenderers.length).toBe(0)
    })
  })

  test('guard can access editor snapshot', async () => {
    const keyGenerator = createTestKeyGenerator()
    let snapshotReceived = false
    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [{_type: 'span', _key: keyGenerator(), text: 'Test'}],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            defineRenderer({
              type: 'block',
              name: 'block',
              guard: ({snapshot}) => {
                // Verify snapshot has expected properties
                if (
                  snapshot.context.value &&
                  snapshot.context.schema &&
                  typeof snapshot.context.readOnly === 'boolean'
                ) {
                  snapshotReceived = true
                }
                return true
              },
              render: ({attributes, children}) => (
                <div {...attributes} data-testid="with-snapshot">
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    const blockLocator = locator.getByTestId('with-snapshot')
    await vi.waitFor(() => expect.element(blockLocator).toBeInTheDocument())
    await vi.waitFor(() => expect(snapshotReceived).toBe(true))
  })
})
