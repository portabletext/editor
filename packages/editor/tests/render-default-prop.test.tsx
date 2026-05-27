import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineSpan,
  defineTextBlock,
  type BlockObjectRender,
  type ContainerRender,
  type InlineObjectRender,
  type SpanRender,
  type TextBlockRender,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * `renderDefault` prop on the five Node API render callbacks.
 *
 * The prop is the engine's default-render function. Consumers call it
 * to fall back to or wrap the engine default at this position. Three
 * properties are pinned per kind:
 *
 *   (a) the prop is present in the callback's props object
 *   (b) the prop is a function (callable)
 *   (c) calling it produces the engine default wrapper
 *
 * Mirrors Studio's `renderDefault` pattern. PTE has no chained layer
 * semantics for nodes - `renderDefault` is always the engine default,
 * not "the next render layer down."
 */

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const mentionSchema = defineSchema({
  inlineObjects: [
    {name: 'mention', fields: [{name: 'username', type: 'string'}]},
  ],
})

const imageSchema = defineSchema({
  blockObjects: [{name: 'image', fields: []}],
})

describe('renderDefault prop', () => {
  test('Container: render receives renderDefault prop', async () => {
    const renderSpy = vi.fn<(props: Parameters<ContainerRender>[0]) => void>()
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: (props) => {
        renderSpy(props)
        return props.renderDefault(props)
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
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
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled()
    })
    const props = renderSpy.mock.calls[0]![0]
    expect(typeof props.renderDefault).toEqual('function')
    expect(document.querySelector('[data-pt-block="container"]')).not.toEqual(
      null,
    )
  })

  test('TextBlock: render receives renderDefault prop', async () => {
    const renderSpy = vi.fn<(props: Parameters<TextBlockRender>[0]) => void>()
    const block = defineTextBlock({
      type: 'block',
      render: (props) => {
        renderSpy(props)
        return props.renderDefault(props)
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[block]} />,
    })

    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled()
    })
    const props = renderSpy.mock.calls[0]![0]
    expect(typeof props.renderDefault).toEqual('function')
    expect(document.querySelector('[data-pt-block="text"]')).not.toEqual(null)
  })

  test('BlockObject: render receives renderDefault prop', async () => {
    const renderSpy = vi.fn<(props: Parameters<BlockObjectRender>[0]) => void>()
    const image = defineBlockObject({
      type: 'image',
      render: (props) => {
        renderSpy(props)
        return props.renderDefault(props)
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled()
    })
    const props = renderSpy.mock.calls[0]![0]
    expect(typeof props.renderDefault).toEqual('function')
    expect(document.querySelector('[data-pt-block="object"]')).not.toEqual(null)
  })

  test('InlineObject: render receives renderDefault prop', async () => {
    const renderSpy =
      vi.fn<(props: Parameters<InlineObjectRender>[0]) => void>()
    const mention = defineInlineObject({
      type: 'mention',
      render: (props) => {
        renderSpy(props)
        return props.renderDefault(props)
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: mentionSchema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled()
    })
    const props = renderSpy.mock.calls[0]![0]
    expect(typeof props.renderDefault).toEqual('function')
    expect(document.querySelector('[data-pt-inline="object"]')).not.toEqual(
      null,
    )
  })

  test('Span: render receives renderDefault prop', async () => {
    const renderSpy = vi.fn<(props: Parameters<SpanRender>[0]) => void>()
    const span = defineSpan({
      type: 'span',
      render: (props) => {
        renderSpy(props)
        return props.renderDefault(props)
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[span]} />,
    })

    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled()
    })
    const props = renderSpy.mock.calls[0]![0]
    expect(typeof props.renderDefault).toEqual('function')
  })
})

describe('renderDefault wraps default', () => {
  test('Container: caller can wrap renderDefault output', async () => {
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: (props) => (
        <div data-testid="wrap">{props.renderDefault(props)}</div>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
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
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const wrap = document.querySelector('[data-testid="wrap"]')
      expect(wrap).not.toEqual(null)
      expect(wrap!.querySelector('[data-pt-block="container"]')).not.toEqual(
        null,
      )
    })
  })

  test('Container: caller can modify props before delegating', async () => {
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({renderDefault, attributes, ...rest}) =>
        renderDefault({
          ...rest,
          attributes: {...attributes, 'data-extra': 'x'},
          renderDefault,
        }),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
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
          ],
        },
      ],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const el = document.querySelector('[data-extra="x"]')
      expect(el).not.toEqual(null)
      expect(el!.getAttribute('data-pt-block')).toEqual('container')
    })
  })
})

describe('renderDefault for void objects renders [_type: _key] placeholder', () => {
  test('BlockObject: omit render → renders [type: key] placeholder', async () => {
    const image = defineBlockObject({type: 'image'})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-block="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.textContent).toContain('[image: i0]')
    })
  })

  test('BlockObject: render: (p) => p.renderDefault(p) → same placeholder', async () => {
    const image = defineBlockObject({
      type: 'image',
      render: (props) => props.renderDefault(props),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-block="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.textContent).toContain('[image: i0]')
    })
  })

  test('BlockObject: placeholder has userSelect: none, contentEditable=false, and draggable matching readOnly', async () => {
    const image = defineBlockObject({type: 'image'})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-block="object"]')
      expect(wrapper).not.toEqual(null)
      const placeholder = Array.from(wrapper!.querySelectorAll('div')).find(
        (el) => el.textContent === '[image: i0]',
      )
      expect(placeholder).not.toEqual(undefined)
      expect(placeholder!.getAttribute('contenteditable')).toEqual('false')
      // Mirrors legacy block-object DOM: both contentEditable+draggable on
      // the same sibling-of-spacer wrapper. readOnly=false by default →
      // draggable='true'.
      expect(placeholder!.getAttribute('draggable')).toEqual('true')
      expect((placeholder! as HTMLElement).style.userSelect).toEqual('none')
    })
  })

  test('InlineObject: omit render → renders [type: key] placeholder', async () => {
    const mention = defineInlineObject({type: 'mention'})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: mentionSchema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-inline="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.textContent).toContain('[mention: i0]')
    })
  })

  test('InlineObject: render: (p) => p.renderDefault(p) → same placeholder', async () => {
    const mention = defineInlineObject({
      type: 'mention',
      render: (props) => props.renderDefault(props),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: mentionSchema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
            {_key: 's1', _type: 'span', text: ' there', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-inline="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.textContent).toContain('[mention: i0]')
    })
  })

  test('InlineObject: placeholder asymmetric contract - outer auto-has contentEditable=false, inner has draggable but no contentEditable', async () => {
    const mention = defineInlineObject({type: 'mention'})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: mentionSchema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-inline="object"]')
      expect(wrapper).not.toEqual(null)
      // Outer auto-receives contentEditable=false via object-node.tsx's
      // isInline && !readOnly branch (engine-applied for inline voids).
      expect(wrapper!.getAttribute('contenteditable')).toEqual('false')
      const placeholder = Array.from(wrapper!.querySelectorAll('span')).find(
        (el) => el.textContent === '[mention: i0]',
      )
      expect(placeholder).not.toEqual(undefined)
      // Inner sibling-of-spacer: NO contentEditable (inherits from outer
      // via DOM contentEditable inheritance). Mirrors v6 inline-object.
      expect(placeholder!.getAttribute('contenteditable')).toEqual(null)
      // Inner sibling carries draggable; readOnly=false default → 'true'.
      expect(placeholder!.getAttribute('draggable')).toEqual('true')
      expect((placeholder! as HTMLElement).style.userSelect).toEqual('none')
    })
  })

  test('BlockObject: consumer can hide placeholder by ignoring renderDefault', async () => {
    const image = defineBlockObject({
      type: 'image',
      render: (props) => <div {...props.attributes}>{props.children}</div>,
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-block="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.textContent).not.toContain('[image: i0]')
    })
  })
})
