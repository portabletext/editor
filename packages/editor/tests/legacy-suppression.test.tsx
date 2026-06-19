import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Legacy-suppression contract for the new render pipeline.
 *
 * Once a position is inside a `registerNode`-shaped subtree, the four
 * block-level legacy `renderX` hooks (renderBlock, renderListItem,
 * renderStyle, renderChild) are suppressed. The four span/leaf-level
 * hooks (renderDecorator, renderAnnotation, renderPlaceholder, range
 * decorations) keep firing because they operate at the leaf level on
 * span text - they wrap runs of text and don't emit pipeline-shaped
 * wrappers themselves.
 *
 * Each `legacy.renderX` callback is provided as a spy; assertions
 * verify the call count is 0 (suppressed) or non-zero (still firing).
 */

describe('legacy-suppression contract', () => {
  test('top-level defineTextBlock with unregistered inline-object child does not call legacy.renderChild', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const renderChild = vi.fn(({children}) => <span>{children}</span>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'm0', _type: 'mention'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {renderChild},
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      // Unregistered inline-object placeholder fires in new pipeline
      expect(root!.innerHTML).toContain('[mention: m0]')
    })

    // legacy.renderChild MUST NOT fire for the mention inside a new-pipeline text block
    const mentionRenderChildCalls = renderChild.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'mention',
    )
    expect(mentionRenderChildCalls.length).toEqual(0)
  })

  test('top-level defineContainer with unregistered block-object child does not call legacy.renderBlock for that child', async () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {type: 'object', name: 'divider', fields: []},
              ],
            },
          ],
        },
        {name: 'divider', fields: []},
      ],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
    })
    const renderBlock = vi.fn(({children}) => <div>{children}</div>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {_key: 'd0', _type: 'divider'},
          ],
        },
      ],
      editableProps: {renderBlock},
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="callout"]')
      expect(root).not.toEqual(null)
      // Unregistered block-object placeholder fires in new pipeline
      expect(root!.innerHTML).toContain('[divider: d0]')
    })

    // legacy.renderBlock MUST NOT fire for the divider inside the new-pipeline container
    const dividerRenderBlockCalls = renderBlock.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'divider',
    )
    expect(dividerRenderBlockCalls.length).toEqual(0)
  })

  test('top-level defineTextBlock with styled span DOES call legacy.renderDecorator', async () => {
    const schema = defineSchema({
      decorators: [{name: 'strong'}],
    })
    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const renderDecorator = vi.fn(({children}) => <strong>{children}</strong>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'bold text', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      // <strong> from renderDecorator must be present
      expect(root!.innerHTML).toContain('<strong>')
    })

    expect(renderDecorator).toHaveBeenCalled()
  })

  test('top-level defineTextBlock with annotated span DOES call legacy.renderAnnotation', async () => {
    const schema = defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })
    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const renderAnnotation = vi.fn(({children}) => (
      <a href="https://x">{children}</a>
    ))

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'linked', marks: ['m1']},
          ],
          markDefs: [{_key: 'm1', _type: 'link', href: 'https://x'}],
          style: 'normal',
        },
      ],
      editableProps: {renderAnnotation},
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      expect(root!.innerHTML).toContain('<a href="https://x">')
    })

    expect(renderAnnotation).toHaveBeenCalled()
  })

  test('top-level defineBlockObject value does not call legacy.renderBlock', async () => {
    const schema = defineSchema({
      blockObjects: [{name: 'divider', fields: []}],
    })
    const divider = defineBlockObject({
      type: 'divider',
      render: ({attributes, children}) => (
        <div data-testid="divider" {...attributes}>
          {children}
          <hr />
        </div>
      ),
    })
    const renderBlock = vi.fn(({children}) => <div>{children}</div>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [{_key: 'k0', _type: 'divider'}],
      editableProps: {renderBlock},
      children: <NodePlugin nodes={[divider]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="divider"]')
      expect(root).not.toEqual(null)
    })

    // legacy.renderBlock MUST NOT fire for the registered divider
    const dividerCalls = renderBlock.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'divider',
    )
    expect(dividerCalls.length).toEqual(0)
  })

  test('top-level defineInlineObject value does not call legacy.renderChild', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention" {...attributes}>
          {children}
          @x
        </span>
      ),
    })
    const renderChild = vi.fn(({children}) => <span>{children}</span>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'm0', _type: 'mention'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {renderChild},
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="mention"]')
      expect(root).not.toEqual(null)
    })

    // legacy.renderChild MUST NOT fire for the registered mention
    const mentionCalls = renderChild.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'mention',
    )
    expect(mentionCalls.length).toEqual(0)
  })

  test('mixed pipeline: legacy block beside new-pipeline block - legacy hook fires for the legacy block, not for the registered one', async () => {
    const schema = defineSchema({
      blockObjects: [{name: 'divider', fields: []}],
    })
    const divider = defineBlockObject({
      type: 'divider',
      render: ({attributes, children}) => (
        <div data-testid="divider" {...attributes}>
          {children}
          <hr />
        </div>
      ),
    })
    const renderBlock = vi.fn(({children}) => <div data-rb>{children}</div>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'legacy', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_key: 'k0', _type: 'divider'},
      ],
      editableProps: {renderBlock},
      children: <NodePlugin nodes={[divider]} />,
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="divider"]')).not.toEqual(
        null,
      )
    })

    // legacy.renderBlock fires for the legacy block (the plain text block)
    const legacyBlockCalls = renderBlock.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'block',
    )
    expect(legacyBlockCalls.length).toBeGreaterThan(0)

    // ...but NOT for the registered divider
    const dividerCalls = renderBlock.mock.calls.filter(
      ([props]: [{value: {_type: string}}]) => props.value._type === 'divider',
    )
    expect(dividerCalls.length).toEqual(0)
  })
})
