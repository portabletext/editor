import type {Schema} from '@portabletext/schema'
import {isPortableTextBlock, toPlainText} from '@portabletext/toolkit'
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  TypedObject,
} from '@portabletext/types'
import {defaultSchema} from '../default-schema'
import {defaultKeyGenerator} from '../key-generator'
import {neutralForm, type Node} from '../neutral-form'
import {markdownToPortableTextWithBlockLines} from '../to-portable-text/markdown-to-portable-text'
import {buildListIndexMap} from './build-list-index-map'
import type {
  SerializeDegradation,
  SerializeDegradationContent,
  SerializeDegradationLoss,
} from './degradation-report'
import {
  buildSerializeDegradationMessage,
  buildNodePathIndex,
  buildSerializeDegradationPath,
} from './degradation-report'
import {createRenderNode} from './render-node'
import {
  DefaultBlockSpacingRenderer,
  type BlockSpacingRenderer,
} from './renderers/block-spacing'
import {DefaultHardBreakRenderer} from './renderers/hard-break'
import {
  DefaultListItemRenderer,
  DefaultUnknownListItemRenderer,
} from './renderers/list-item'
import {
  DefaultCodeRenderer,
  DefaultEmRenderer,
  DefaultLinkRenderer,
  DefaultStrikeThroughRenderer,
  DefaultStrongRenderer,
  DefaultUnderlineRenderer,
  DefaultUnknownMarkRenderer,
} from './renderers/marks'
import {
  DefaultBlockquoteRenderer,
  DefaultH1Renderer,
  DefaultH2Renderer,
  DefaultH3Renderer,
  DefaultH4Renderer,
  DefaultH5Renderer,
  DefaultH6Renderer,
  DefaultNormalRenderer,
  DefaultUnknownStyleRenderer,
} from './renderers/style'
import {
  DefaultCalloutRenderer,
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultHtmlRenderer,
  DefaultImageRenderer,
  DefaultTableRenderer,
  DefaultUnknownTypeRenderer,
} from './renderers/type'
import type {PortableTextRenderers, RenderNode} from './types'

const defaultRenderers: PortableTextRenderers = {
  types: {
    'callout': DefaultCalloutRenderer,
    'code': DefaultCodeBlockRenderer,
    'horizontal-rule': DefaultHorizontalRuleRenderer,
    'html': DefaultHtmlRenderer,
    'image': DefaultImageRenderer,
    'table': DefaultTableRenderer,
  },

  block: {
    normal: DefaultNormalRenderer,
    blockquote: DefaultBlockquoteRenderer,
    h1: DefaultH1Renderer,
    h2: DefaultH2Renderer,
    h3: DefaultH3Renderer,
    h4: DefaultH4Renderer,
    h5: DefaultH5Renderer,
    h6: DefaultH6Renderer,
  },
  marks: {
    'em': DefaultEmRenderer,
    'strong': DefaultStrongRenderer,
    'code': DefaultCodeRenderer,
    'underline': DefaultUnderlineRenderer,
    'strike-through': DefaultStrikeThroughRenderer,
    'link': DefaultLinkRenderer,
  },
  listItem: DefaultListItemRenderer,
  hardBreak: DefaultHardBreakRenderer,

  unknownType: DefaultUnknownTypeRenderer,
  unknownMark: DefaultUnknownMarkRenderer,
  unknownListItem: DefaultUnknownListItemRenderer,
  unknownBlockStyle: DefaultUnknownStyleRenderer,
}

type Options = Partial<PortableTextRenderers> & {
  blockSpacing?: BlockSpacingRenderer

  /**
   * Compiled schema that gates the built-in type renderers; it never
   * validates the value. A default renderer runs only when the schema
   * declares its type (`blockObjects` for block position, `inlineObjects`
   * for inline); undeclared types render through `unknownType`, whose
   * default output reparses back to the same value. The gate checks the
   * type name only, so declare the type's fields too:
   * `markdownToPortableText` cannot rebuild a value from a fieldless
   * declaration. Renderers passed in `types` are never gated. Pass the
   * same schema to `markdownToPortableText` to keep the round trip
   * consistent. Omitted, all default renderers stay active.
   */
  schema?: Schema

  /**
   * Called at most once, after the conversion has walked every block,
   * only when at least one construct degraded to a lossier rendering (an
   * annotation or decorator with no mark renderer, a block style or
   * list-item kind with no renderer, a heading written as a paragraph
   * because its rendered text holds a line break). Left unset, the
   * conversion stays silent and returns the lossiest representation it
   * can build. Passed
   * a function, observe every degradation via `report.degradations`, in
   * encounter order, and the same degradations grouped and sorted by
   * block via `report.message`. Enforce against lossy output by throwing
   * your own error from inside the callback. The throw propagates out of
   * `portableTextToMarkdown`.
   *
   * ```ts
   * portableTextToMarkdown(blocks, {onDegradation: ({message}) => { throw new Error(message) }})
   * ```
   *
   * `report` is a single object, not positional parameters, so it can
   * gain fields later without a breaking change.
   */
  onDegradation?: (report: {
    degradations: Array<SerializeDegradation>
    message: string
  }) => void
}

/**
 * @public
 */
export function portableTextToMarkdown<
  Block extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
>(blocks: Array<Block>, options: Options = {}): string {
  return renderMarkdown(blocks, options, undefined)
}

/**
 * `portableTextToMarkdown`, plus each degradation paired with the
 * content it left out of the markdown, for `applyMarkdownEdit` to look
 * for in the value an edit returns.
 */
export function portableTextToMarkdownWithLostContent(
  blocks: Array<TypedObject>,
  options: Omit<Options, 'onDegradation'>,
): {
  markdown: string
  degradations: Array<SerializeDegradation & SerializeDegradationContent>
} {
  const degradations: Array<
    SerializeDegradation & SerializeDegradationContent
  > = []
  const markdown = renderMarkdown(blocks, options, (degradation) => {
    degradations.push(degradation)
  })
  return {markdown, degradations}
}

function renderMarkdown(
  inputBlocks: Array<TypedObject>,
  options: Options,
  onLostContent:
    | ((
        degradation: SerializeDegradation & SerializeDegradationContent,
      ) => void)
    | undefined,
): string {
  const renderers = {
    block:
      typeof options.block === 'function'
        ? options.block
        : {
            ...defaultRenderers.block,
            ...options.block,
          },
    listItem: options.listItem ?? defaultRenderers.listItem,
    marks: {
      ...defaultRenderers.marks,
      ...options.marks,
    },
    types: {
      ...gateDefaultTypeRenderers(
        defaultRenderers.types,
        options.schema,
        options.unknownType ?? defaultRenderers.unknownType,
      ),
      ...options.types,
    },
    hardBreak: options.hardBreak ?? defaultRenderers.hardBreak,
    unknownType: options.unknownType ?? defaultRenderers.unknownType,
    unknownBlockStyle:
      options.unknownBlockStyle ?? defaultRenderers.unknownBlockStyle,
    unknownListItem:
      options.unknownListItem ?? defaultRenderers.unknownListItem,
    unknownMark: options.unknownMark ?? defaultRenderers.unknownMark,
  }
  const renderBlockSpacing = options.blockSpacing ?? DefaultBlockSpacingRenderer

  const tracksDegradations = Boolean(options.onDegradation || onLostContent)
  const originalBlockKeys = tracksDegradations
    ? inputBlocks.map((node) => node._key)
    : undefined

  // List numbering is looked up by `_key`, so keyless blocks get one, on a
  // copy so the caller's blocks are left as they were passed in.
  const blocks = inputBlocks.map((block) =>
    block._key ? block : {...block, _key: defaultKeyGenerator()},
  )

  const {listIndexMap, listDepthMap} = buildListIndexMap(blocks)

  type PathSegment = SerializeDegradation['path'][number]

  type InternalDegradation = SerializeDegradation & {
    topIndex: number
    lostContent: SerializeDegradationContent
  }
  // What one render of a root block wrote, with the effects it had, so
  // that only those of the render written out take effect.
  type RootRendering = {
    rendered: string
    degradations: Array<InternalDegradation>
    // Set when the block itself was written as a paragraph because its
    // rendered text holds a line break.
    lineBreakFallback: {setextCandidate: boolean} | undefined
  }

  let currentBlock: {block: TypedObject; index: number; topSegment: PathSegment}
  let currentRendering: {node: TypedObject; rendering: RootRendering}
  let nodePathIndex:
    | {block: TypedObject; paths: Map<object, Array<PathSegment>>}
    | undefined
  const findOwnerPath = (owner: object) => {
    if (nodePathIndex?.block !== currentBlock.block) {
      nodePathIndex = {
        block: currentBlock.block,
        paths: buildNodePathIndex(currentBlock.block, currentBlock.topSegment),
      }
    }
    return nodePathIndex.paths.get(owner)
  }
  const reportDegradation = tracksDegradations
    ? (
        entry: SerializeDegradationLoss & {
          message: string
          snippet: string | undefined
          node: object
          owner: object
        },
      ) => {
        const degradation: SerializeDegradation = {
          type: entry.type,
          message: entry.message,
          path: buildSerializeDegradationPath(
            currentBlock.block,
            currentBlock.topSegment,
            entry.node,
          ),
        }
        if (entry.snippet !== undefined) {
          degradation.snippet = entry.snippet
        }
        currentRendering.rendering.degradations.push({
          ...degradation,
          topIndex: currentBlock.index,
          lostContent: {
            ...lostContent(entry),
            ownerPath: onLostContent ? findOwnerPath(entry.owner) : undefined,
          },
        })
      }
    : undefined
  const onLineBreakFallback = (node: TypedObject, setextCandidate: boolean) => {
    if (node === currentRendering.node) {
      currentRendering.rendering.lineBreakFallback = {setextCandidate}
    }
  }

  const renderRootBlock = (
    render: RenderNode,
    node: TypedObject,
    index: number,
  ): RootRendering => {
    if (originalBlockKeys !== undefined) {
      const key = originalBlockKeys[index]
      currentBlock = {
        block: node,
        index,
        topSegment: key !== undefined ? {_key: key} : index,
      }
    }
    const rendering: RootRendering = {
      rendered: '',
      degradations: [],
      lineBreakFallback: undefined,
    }
    currentRendering = {node, rendering}
    rendering.rendered = render({
      node,
      index,
      isInline: false,
      renderNode: render,
    })
    return rendering
  }

  const renderNode = createRenderNode(renderers, listIndexMap, listDepthMap, {
    reportDegradation,
    onLineBreakFallback,
  })
  const mainRenderings = blocks.map((node, index) =>
    renderRootBlock(renderNode, node, index),
  )
  const selectedRenderings = [...mainRenderings]

  // `blockSpacing` sees each block as the style it was written with.
  const spacingsFor = (
    indexes: ReadonlyArray<number>,
    renderings: ReadonlyArray<RootRendering>,
  ) => {
    const nodes = indexes.map((index) =>
      renderings[index]!.lineBreakFallback
        ? {...blocks[index]!, style: 'normal'}
        : blocks[index]!,
    )
    return nodes
      .slice(1)
      .map(
        (next, position) =>
          renderBlockSpacing({current: nodes[position]!, next}) ?? '\n\n',
      )
  }

  if (options.hardBreak === undefined && options.blockSpacing === undefined) {
    // A block rendering to '' is dropped, unless its setext candidate is
    // still to be tried: a `normal` renderer that writes nothing does not
    // override the default heading renderer.
    let candidateIndexes = blocks.flatMap((_node, index) =>
      mainRenderings[index]!.rendered !== '' ||
      mainRenderings[index]!.lineBreakFallback?.setextCandidate
        ? [index]
        : [],
    )
    const candidates = new Map<number, RootRendering>()
    for (const index of candidateIndexes) {
      const candidate = renderCandidate(blocks[index]!, index)
      if (
        candidate !== undefined &&
        candidate.rendered !== mainRenderings[index]!.rendered
      ) {
        candidates.set(index, candidate)
      }
    }
    // A block whose candidate fails is dropped after all, which changes
    // its neighbours' spacing, so verification runs again without it.
    while (candidates.size > 0) {
      const included = candidateIndexes
      const positionCandidates = new Map<number, string>()
      included.forEach((index, position) => {
        const candidate = candidates.get(index)
        if (candidate !== undefined) {
          positionCandidates.set(position, candidate.rendered)
        }
      })
      const accepted = new Set(
        [
          ...verifyCandidates(
            included.map((index) => {
              const {lineBreakFallback} = mainRenderings[index]!
              return lineBreakFallback && !lineBreakFallback.setextCandidate
                ? {...blocks[index]!, style: 'normal'}
                : blocks[index]!
            }),
            included.map((index) => mainRenderings[index]!.rendered),
            spacingsFor(included, mainRenderings),
            positionCandidates,
            options.schema,
          ).keys(),
        ].map((position) => included[position]!),
      )
      candidateIndexes = included.filter(
        (index) =>
          mainRenderings[index]!.rendered !== '' || accepted.has(index),
      )
      if (candidateIndexes.length === included.length) {
        for (const index of accepted) {
          selectedRenderings[index] = candidates.get(index)!
        }
        break
      }
    }
  }

  // Blocks rendering to '' are dropped before spacing is computed, so
  // `blockSpacing` only ever sees blocks that survive into the output.
  const writtenIndexes = blocks.flatMap((_node, index) =>
    selectedRenderings[index]!.rendered !== '' ? [index] : [],
  )
  const markdown = joinRenderedBlocks(
    writtenIndexes.map((index) => selectedRenderings[index]!.rendered),
    spacingsFor(writtenIndexes, selectedRenderings),
  )

  function renderCandidate(
    node: TypedObject,
    index: number,
  ): RootRendering | undefined {
    if (!isPortableTextBlock(node)) {
      return undefined
    }
    if (
      !mainRenderings[index]!.lineBreakFallback?.setextCandidate &&
      !toPlainText(node).includes('\n\n')
    ) {
      return undefined
    }
    const renderCandidateNode = createRenderNode(
      renderers,
      listIndexMap,
      listDepthMap,
      {candidateForms: true, reportDegradation, onLineBreakFallback},
    )
    return renderRootBlock(renderCandidateNode, node, index)
  }

  // Reported only once verification has decided each candidate, since a
  // block's degradations are those of the render written out.
  const degradations = selectedRenderings.flatMap(
    ({degradations}) => degradations,
  )
  if (onLostContent) {
    for (const degradation of degradations) {
      onLostContent({
        ...toSerializeDegradation(degradation),
        ...degradation.lostContent,
      })
    }
  }
  if (options.onDegradation && degradations.length > 0) {
    options.onDegradation({
      degradations: degradations.map(toSerializeDegradation),
      message: buildSerializeDegradationMessage(degradations),
    })
  }

  return markdown
}

// Dropping a failed candidate restores a whitespace-only line, which can
// change how later blocks parse (the next list item becomes a lazy
// continuation), so the survivors need verifying again, and a failure then
// drops every candidate rather than starting another round. The deserialize
// options a caller pairs with this call are not visible here, so the parse
// uses the default parser settings plus `schema`.
function verifyCandidates(
  nodes: ReadonlyArray<TypedObject>,
  renderedOutputs: ReadonlyArray<string>,
  spacings: ReadonlyArray<string>,
  candidates: ReadonlyMap<number, string>,
  schema: Schema | undefined,
): ReadonlyMap<number, string> {
  const expectedByBlock = parseByBlock(renderedOutputs, spacings, schema)
  const firstRound = failingCandidates(
    nodes,
    renderedOutputs,
    spacings,
    candidates,
    expectedByBlock,
    schema,
  )
  if (firstRound.size === 0) {
    return candidates
  }
  const survivors = new Map(
    [...candidates].filter(([position]) => !firstRound.has(position)),
  )
  if (survivors.size === 0) {
    return survivors
  }
  const secondRound = failingCandidates(
    nodes,
    renderedOutputs,
    spacings,
    survivors,
    expectedByBlock,
    schema,
  )
  return secondRound.size === 0 ? survivors : new Map()
}

function failingCandidates(
  nodes: ReadonlyArray<TypedObject>,
  renderedOutputs: ReadonlyArray<string>,
  spacings: ReadonlyArray<string>,
  candidates: ReadonlyMap<number, string>,
  expectedByBlock: ReadonlyArray<ReadonlyArray<string>>,
  schema: Schema | undefined,
): Set<number> {
  const parsedByBlock = parseByBlock(
    renderedOutputs.map(
      (rendered, position) => candidates.get(position) ?? rendered,
    ),
    spacings,
    schema,
  )
  const parsedTextBlockName = (schema ?? defaultSchema).block.name
  const failing = new Set<number>()
  // A node holds the bytes from the line it starts in onward, so a block
  // without a candidate that parses differently was changed by a candidate
  // its nodes ran into: one after it, before the next block without a
  // candidate that parses as expected.
  let blamingLaterCandidates = false
  parsedByBlock.forEach((parsed, position) => {
    const expected = candidates.has(position)
      ? [neutralForm({...nodes[position], _type: parsedTextBlockName})]
      : expectedByBlock[position]!
    const matches =
      parsed.length === expected.length &&
      parsed.every((form, formIndex) => form === expected[formIndex])
    if (candidates.has(position)) {
      if (!matches || blamingLaterCandidates) {
        failing.add(position)
      }
    } else {
      blamingLaterCandidates = !matches
    }
  })
  return failing
}

function parseByBlock(
  renderedOutputs: ReadonlyArray<string>,
  spacings: ReadonlyArray<string>,
  schema: Schema | undefined,
): Array<Array<string>> {
  const blockStartLines: Array<number> = []
  let line = 0
  renderedOutputs.forEach((rendered, position) => {
    blockStartLines.push(line)
    line += lineCount(rendered) + lineCount(spacings[position] ?? '')
  })
  const parsed = markdownToPortableTextWithBlockLines(
    joinRenderedBlocks(renderedOutputs, spacings),
    {schema},
  )
  const formsByBlock: Array<Array<string>> = renderedOutputs.map(() => [])
  let position = 0
  parsed.portableText.forEach((node, nodeIndex) => {
    const nodeLine = parsed.blockStartLines[nodeIndex]!
    while (
      position + 1 < blockStartLines.length &&
      blockStartLines[position + 1]! <= nodeLine
    ) {
      position++
    }
    formsByBlock[position]!.push(neutralForm(node as unknown as Node))
  })
  return formsByBlock
}

function lineCount(text: string): number {
  let count = 0
  for (const character of text) {
    if (character === '\n') {
      count++
    }
  }
  return count
}

function joinRenderedBlocks(
  renderedOutputs: ReadonlyArray<string>,
  spacings: ReadonlyArray<string>,
): string {
  return renderedOutputs
    .map((rendered, position) => `${rendered}${spacings[position] ?? ''}`)
    .join('')
}

function gateDefaultTypeRenderers(
  defaultTypeRenderers: PortableTextRenderers['types'],
  schema: Schema | undefined,
  resolvedUnknownType: PortableTextRenderers['unknownType'],
): PortableTextRenderers['types'] {
  if (!schema) {
    return defaultTypeRenderers
  }

  return Object.fromEntries(
    Object.entries(defaultTypeRenderers).map(([typeName, renderer]) => [
      typeName,
      (rendererOptions: Parameters<typeof resolvedUnknownType>[0]) => {
        const declared = (
          rendererOptions.isInline ? schema.inlineObjects : schema.blockObjects
        ).some((item) => item.name === typeName)

        return declared && renderer
          ? renderer(rendererOptions)
          : resolvedUnknownType(rendererOptions)
      },
    ]),
  )
}

function toSerializeDegradation({
  type,
  message,
  path,
  snippet,
}: SerializeDegradation): SerializeDegradation {
  return snippet === undefined
    ? {type, message, path}
    : {type, message, path, snippet}
}

function lostContent(
  entry: SerializeDegradationLoss,
): SerializeDegradationLoss {
  switch (entry.type) {
    case 'annotation-dropped':
      return {type: entry.type, markDefinition: entry.markDefinition}
    case 'decorator-dropped':
      return {type: entry.type, decorator: entry.decorator}
    case 'style-fallback':
      return {type: entry.type, style: entry.style}
    case 'list-item-fallback':
      return {type: entry.type, listItem: entry.listItem}
  }
}
