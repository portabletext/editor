import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import {describe, expect, test} from 'vitest'
import {defineTextBlock} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

/**
 * Proves the new `defineX` render pipeline can replicate the legacy
 * pipeline's DOM 1:1. For each value, the legacy pipeline (no render
 * callbacks, so the engine's legacy default) and the new pipeline (a
 * `defineTextBlock` catch-all reconstructing that default) must produce the
 * same normalized DOM.
 *
 * This is the engine-level capability proof: the new pipeline exposes
 * enough for a consumer to reconstruct the legacy output. Studio's own
 * reconstruction is pinned separately in the Sanity repo.
 *
 * The entire `data-slate-*` namespace is excluded from the comparison, by
 * design. Opting into the new pipeline is a clean break: it emits only
 * `data-pt-*` and never the Slate-named attributes. The legacy pipeline
 * emits both (`data-slate-string data-pt-text`, etc.); the Slate names die
 * with the legacy pipeline (EDEX-1249) and the `data-pt-*` names that
 * replaced them are present on both sides and verified here. Consumers
 * that adopt the new pipeline migrate their queries to `data-pt-*`
 * (Studio's `CommentsInspector` query of `data-slate-string` moves to
 * `data-pt-text`; tracked on EDEX-1237).
 *
 * `data-list-index` is also excluded: the legacy pipeline computes it
 * internally, the new pipeline serves it via `@portabletext/plugin-list-
 * index` (pinned by that package's own tests).
 *
 * What remains, and is asserted 1:1: the `pt-block`/`pt-text-block` class
 * taxonomy, `data-block-*`, `data-list-item`/`data-level`/`data-style`,
 * the `data-pt-*` attributes, and the full element structure.
 *
 * Shelf life: this test exists only while both pipelines coexist. When the
 * legacy pipeline is removed (EDEX-1249), "no render callbacks" routes to
 * the engine's minimal new-pipeline default, so the legacy baseline is
 * gone. At that point replace the legacy comparison with an absolute DOM
 * literal assertion on the reconstruction, or delete this test.
 */

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'blockquote'}],
})

type NormalizedNode =
  | {text: string}
  | {
      tag: string
      attributes: Record<string, string>
      children: Array<NormalizedNode>
    }

function isIgnoredAttribute(name: string): boolean {
  // The whole Slate namespace is intentionally dropped in the new
  // pipeline (clean break); `data-list-index` is plugin-provided.
  return name.startsWith('data-slate-') || name === 'data-list-index'
}

function normalize(node: Node): NormalizedNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return {text: node.textContent ?? ''}
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const element = node as Element
  const attributes: Record<string, string> = {}
  for (const attr of Array.from(element.attributes).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!isIgnoredAttribute(attr.name)) {
      attributes[attr.name] = attr.value
    }
  }
  const children: Array<NormalizedNode> = []
  for (const child of Array.from(element.childNodes)) {
    const normalized = normalize(child)
    if (normalized !== null) {
      children.push(normalized)
    }
  }
  return {tag: element.tagName.toLowerCase(), attributes, children}
}

async function renderPipeline(
  initialValue: Array<PortableTextBlock>,
  children?: ReactElement,
): Promise<NormalizedNode | null> {
  const {locator} = await createTestEditor({
    schemaDefinition,
    initialValue,
    children,
  })
  return normalize(locator.element())
}

/**
 * Reconstructs the engine's legacy default text-block DOM: the
 * `pt-block`/`pt-text-block` class taxonomy, the `data-block-*`
 * attributes, the conditional list/style attributes, and the inner
 * wrapper div around the editable children.
 */
const reconstructionNodes = [
  defineTextBlock({
    type: '*',
    render: (props) => <ReconstructedTextBlock {...props} />,
  }),
]

function ReconstructedTextBlock(props: {
  attributes: Record<string, unknown>
  children: ReactElement
  node: PortableTextBlock & {
    style?: string
    listItem?: string
    level?: number
  }
}) {
  const block = props.node
  return (
    <div
      {...props.attributes}
      className={[
        'pt-block',
        'pt-text-block',
        ...(block.style ? [`pt-text-block-style-${block.style}`] : []),
        ...(block.listItem
          ? [
              'pt-list-item',
              `pt-list-item-${block.listItem}`,
              `pt-list-item-level-${block.level ?? 1}`,
            ]
          : []),
      ].join(' ')}
      data-block-key={block._key}
      data-block-name={block._type}
      data-block-type="text"
      {...(block.listItem !== undefined
        ? {'data-list-item': block.listItem}
        : {})}
      {...(block.level !== undefined ? {'data-level': block.level} : {})}
      {...(block.style !== undefined ? {'data-style': block.style} : {})}
    >
      <div>{props.children}</div>
    </div>
  )
}

function block(
  key: string,
  text: string,
  extra: Partial<PortableTextBlock> = {},
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-s`, text, marks: []}],
    ...extra,
  }
}

describe('render pipeline equivalence: text blocks', () => {
  const cases: Array<{name: string; value: Array<PortableTextBlock>}> = [
    {name: 'plain paragraph', value: [block('b0', 'Hello')]},
    {name: 'empty paragraph', value: [block('b0', '')]},
    {
      // `listItem` set, `level` omitted: className gets `-level-1` (via
      // `level ?? 1`) while `data-level` stays absent. Pins that asymmetry.
      name: 'list item without explicit level',
      value: [block('b0', 'One', {listItem: 'number'})],
    },
    {name: 'h1 style', value: [block('b0', 'Heading', {style: 'h1'})]},
    {
      name: 'blockquote style',
      value: [block('b0', 'Quote', {style: 'blockquote'})],
    },
    {
      name: 'numbered list item',
      value: [block('b0', 'One', {listItem: 'number', level: 1})],
    },
    {
      name: 'bulleted list item at level 2',
      value: [block('b0', 'Nested', {listItem: 'bullet', level: 2})],
    },
    {
      name: 'decorated text',
      value: [
        block('b0', '', {
          children: [
            {_type: 'span', _key: 's0', text: 'bold', marks: ['strong']},
            {_type: 'span', _key: 's1', text: ' plain', marks: []},
          ],
        }),
      ],
    },
    {
      name: 'mixed list and paragraph',
      value: [
        block('b0', 'Intro'),
        block('b1', 'First', {listItem: 'number', level: 1}),
        block('b2', 'Second', {listItem: 'number', level: 1}),
      ],
    },
  ]

  for (const {name, value} of cases) {
    test(`Scenario: ${name}`, async () => {
      const legacy = await renderPipeline(value)
      const next = await renderPipeline(
        value,
        <NodePlugin nodes={reconstructionNodes} />,
      )
      expect(next).toEqual(legacy)
    })
  }
})
