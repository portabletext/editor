import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * A registered inline node's own wrapper attributes don't depend on
 * whether its surrounding text block is itself registered: the pipeline
 * boundary no longer changes the DOM emitted at a position, only who
 * owns rendering it. Each pair of tests below pins the identical
 * attribute string for a registered inline object and a registered
 * span, once inside an unregistered (bare) text block and once inside
 * a registered one.
 */

function getEditorHTML(): string {
  const root = document.querySelector('[role="textbox"]')
  if (!root) {
    throw new Error('No editor with role="textbox"')
  }
  return root.innerHTML
}

function getInlineWrapperAttrs(testid: string): string {
  const element = document.querySelector(`[data-testid="${testid}"]`)
  if (!element) {
    throw new Error(`No element with data-testid="${testid}"`)
  }
  // Extract attributes from the wrapper element itself (not children).
  return Array.from(element.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
}

const MENTION_WRAPPER_ATTRS =
  'data-testid="mention-wrapper" data-pt-path="[_key=="b0"].children[_key=="m0"]" contenteditable="false" data-pt-inline="object"'

const SPAN_WRAPPER_ATTRS = 'data-testid="span-wrapper" data-pt-marks="true"'

describe('inline pipeline mode inherits from text block', () => {
  test('registered inline-object inside a bare text block gets the same wrapper attributes as inside a registered one', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-wrapper" {...attributes}>
          {children}
          <span>@alice</span>
        </span>
      ),
    })

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
      children: <NodePlugin nodes={[mention]} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHTML()).toContain('@alice')
      expect(getInlineWrapperAttrs('mention-wrapper')).toEqual(
        MENTION_WRAPPER_ATTRS,
      )
    })
  })

  test('registered span inside a bare text block gets the same wrapper attributes as inside a registered one', async () => {
    const schema = defineSchema({})
    const span = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-wrapper" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[span]} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHTML()).toContain('hello')
      expect(getInlineWrapperAttrs('span-wrapper')).toEqual(SPAN_WRAPPER_ATTRS)
    })
  })

  test('registered inline-object inside a registered text block gets the same wrapper attributes as inside a bare one', async () => {
    const schema = defineSchema({
      inlineObjects: [{name: 'mention', fields: []}],
    })
    const richBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="textblock-wrapper" {...attributes}>
          {children}
        </div>
      ),
    })
    const mention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-wrapper" {...attributes}>
          {children}
          <span>@alice</span>
        </span>
      ),
    })

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
      children: <NodePlugin nodes={[richBlock, mention]} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHTML()).toContain('@alice')
      expect(getInlineWrapperAttrs('mention-wrapper')).toEqual(
        MENTION_WRAPPER_ATTRS,
      )
    })
  })

  test('registered span inside a registered text block gets the same wrapper attributes as inside a bare one', async () => {
    const schema = defineSchema({})
    const richBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="textblock-wrapper" {...attributes}>
          {children}
        </div>
      ),
    })
    const span = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-wrapper" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[richBlock, span]} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHTML()).toContain('hello')
      expect(getInlineWrapperAttrs('span-wrapper')).toEqual(SPAN_WRAPPER_ATTRS)
    })
  })
})
