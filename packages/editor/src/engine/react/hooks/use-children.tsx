import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {
  isSpan,
  isSpanNode,
  isTextBlock,
  isTextBlockNode,
} from '@portabletext/schema'
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  type JSX,
} from 'react'
import {NewPipelineContext} from '../../../editor/new-pipeline-context'
import {
  ParentContainerContext,
  useParentContainer,
} from '../../../editor/parent-container-context'
import {
  buildRootChunks,
  reconcileChildChunks,
  type RootChunk,
} from '../../../internal-utils/root-chunks'
import {serializePath} from '../../../paths/serialize-path'
import type {ContainerConfig} from '../../../renderers/renderer.types'
import {isObject} from '../../../traversal/is-object'
import {isElementDecorationsEqual} from '../../dom/utils/range-list'
import {isEditor} from '../../editor/is-editor'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderTextProps,
} from '../components/editable'
import ElementComponent from '../components/element'
import ObjectNodeComponent from '../components/object-node'
import TextComponent from '../components/text'
import {useDecorationsByChild} from './use-decorations-by-child'
import {useEngineStatic} from './use-engine-static'

const EMPTY_DECORATIONS: DecoratedRange[] = []
Object.freeze(EMPTY_DECORATIONS)

/**
 * Resolve the container config for `node` given its immediate parent's
 * container config. Returns the config or `undefined` if `node` is not
 * a container at this position (positional leaf override, or no
 * registration at all).
 *
 * Walks the parent's `of` array for a positional entry matching
 * `node._type`, then falls back to the global `editor.containers`
 * registration. Same descent shape as the engine-internal
 * `resolveContainerByPath` so the React render path and the
 * traversal path stay in sync.
 */
function resolveContainerForNode(
  editor: Editor,
  parentContainer: ContainerConfig | undefined,
  node: PortableTextObject,
): ContainerConfig | undefined {
  if (parentContainer?.of) {
    for (const entry of parentContainer.of) {
      if ('container' in entry && entry.container.type === node._type) {
        return entry
      }
    }
  }
  return editor.containers.get(node._type)
}

const useChildren = (props: {
  decorations: DecoratedRange[]
  node: Editor | Node
  path: Path
  renderElement: (props: RenderElementProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}): React.ReactNode => {
  const {
    decorations,
    node,
    path: parentPath,
    renderElement,
    renderText,
    renderLeaf,
  } = props
  const renderAsChunks = isEditor(node)
  const editor = useEngineStatic()
  editor.isNodeMapDirty = false

  const parentContainer = useParentContainer()
  const parentIsInNewPipeline = useContext(NewPipelineContext)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentPath,
    decorations,
  )

  let children: Array<Node> = []
  let arrayFieldName = 'children'
  let isContainerNode = false
  // The container config to propagate down to node's children: it becomes
  // their parent's container config. Stays as parentContainer for text
  // blocks and the editor root; updates to node's own config when node
  // is itself a container object.
  let childContainer: ContainerConfig | undefined = parentContainer

  if (isEditor(node)) {
    children = node.snapshot.context.value
  } else if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
    children = node.children
  } else if (isObject(editor.snapshot, node)) {
    const containerConfig = resolveContainerForNode(
      editor,
      parentContainer,
      node,
    )

    if (containerConfig) {
      isContainerNode = true
      const fieldValue = (node as Record<string, unknown>)[
        containerConfig.field.name
      ]
      if (Array.isArray(fieldValue)) {
        children = fieldValue as Array<Node>
        arrayFieldName = containerConfig.field.name
      }

      childContainer = containerConfig
    }
  }

  const renderElementComponent = useCallback(
    (
      node: PortableTextTextBlock | PortableTextObject,
      i: number,
      isContainer: boolean,
    ) => {
      const nodePath: Path =
        parentPath.length === 0
          ? [{_key: node._key}]
          : [...parentPath, arrayFieldName, {_key: node._key}]

      return (
        <ElementComponent
          decorations={decorationsByChild[i] ?? []}
          element={node}
          isContainer={isContainer}
          key={node._key}
          path={nodePath}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          renderText={renderText}
        />
      )
    },
    [
      arrayFieldName,
      decorationsByChild,
      parentPath,
      renderElement,
      renderLeaf,
      renderText,
    ],
  )

  const textBlockParent = isTextBlock(
    {schema: editor.snapshot.context.schema},
    node,
  )
    ? node
    : undefined

  /**
   * Wrap a rendered child in `NewPipelineContext.Provider value={true}`
   * when needed. `parentIsInNewPipeline` already true ⇒ context is
   * inherited; no extra wrap. Otherwise, wrap when the child itself
   * kicks off a new-pipeline subtree at this position.
   */
  const wrapNewPipeline = (
    child: React.ReactNode,
    isInNewPipelineForChild: boolean,
    key: string,
  ): React.ReactNode => {
    if (parentIsInNewPipeline) {
      // Already inside a new-pipeline subtree; the child inherits.
      return child
    }
    if (!isInNewPipelineForChild) {
      return child
    }
    return (
      <NewPipelineContext.Provider value={true} key={key}>
        {child}
      </NewPipelineContext.Provider>
    )
  }

  const renderTextComponent = (node: PortableTextSpan, index: number) => {
    if (!textBlockParent) {
      throw new Error(
        'Cannot render text component without a text block parent',
      )
    }

    const nodePath: Path =
      parentPath.length === 0
        ? [{_key: node._key}]
        : [...parentPath, 'children', {_key: node._key}]

    return (
      <TextComponent
        decorations={decorationsByChild[index] ?? []}
        key={node._key}
        isLast={index === children.length - 1}
        parent={textBlockParent}
        path={nodePath}
        renderLeaf={renderLeaf}
        renderText={renderText}
        text={node}
      />
    )
  }

  const renderObjectNodeComponent = (
    node: PortableTextObject,
    index: number,
  ) => {
    const nodePath: Path =
      parentPath.length === 0
        ? [{_key: node._key}]
        : [...parentPath, arrayFieldName, {_key: node._key}]

    return (
      <ObjectNodeComponent
        decorations={decorationsByChild[index] ?? []}
        isInline={textBlockParent !== undefined}
        key={node._key}
        objectNode={node}
        path={nodePath}
        renderElement={renderElement}
      />
    )
  }

  /**
   * Compute whether the child kicks off a new-pipeline subtree. Used
   * by `wrapNewPipeline` to decide whether to wrap the child in
   * `NewPipelineContext.Provider value={true}`. `parentIsInNewPipeline`
   * short-circuits to `true` upstream of this call.
   */
  const isInNewPipelineForChild = (n: Node, isContainerChild: boolean) => {
    if (isContainerChild) {
      return true
    }
    if (isTextBlock({schema: editor.snapshot.context.schema}, n)) {
      if (editor.textBlocks.has(n._type) || editor.textBlocks.has('*')) {
        return true
      }
      if (parentContainer?.of) {
        for (const entry of parentContainer.of) {
          if ('textBlock' in entry && entry.textBlock.type === n._type) {
            return true
          }
        }
      }
      return false
    }
    if (isObject(editor.snapshot, n)) {
      if (textBlockParent !== undefined) {
        // Inline-object position: pipeline mode is inherited from the
        // parent text block. An inline object never kicks off a new-
        // pipeline subtree on its own.
        return false
      }
      // Block object position
      if (editor.blockObjects.has(n._type) || editor.blockObjects.has('*')) {
        return true
      }
      if (parentContainer?.of) {
        for (const entry of parentContainer.of) {
          if ('blockObject' in entry && entry.blockObject.type === n._type) {
            return true
          }
        }
      }
      return false
    }
    if (isSpan({schema: editor.snapshot.context.schema}, n)) {
      // Span position: pipeline mode is inherited from the parent text
      // block, same as inline objects above. `parentIsInNewPipeline`
      // short-circuits upstream when the text block is itself in the
      // new pipeline.
      return false
    }
    return false
  }

  const renderChild = (n: Node, i: number) => {
    if (isTextBlock({schema: editor.snapshot.context.schema}, n)) {
      return wrapNewPipeline(
        renderElementComponent(n, i, false),
        isInNewPipelineForChild(n, false),
        n._key,
      )
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.snapshot.context.schema}, n)) {
      return null
    }
    if (isObject(editor.snapshot, n)) {
      // Does `n` resolve as a container at this position?
      // (positional override in childContainer.container.of, or global)
      if (resolveContainerForNode(editor, childContainer, n)) {
        return wrapNewPipeline(renderElementComponent(n, i, true), true, n._key)
      }
      return wrapNewPipeline(
        renderObjectNodeComponent(n, i),
        isInNewPipelineForChild(n, false),
        n._key,
      )
    }
    if (isSpan({schema: editor.snapshot.context.schema}, n)) {
      return wrapNewPipeline(
        renderTextComponent(n, i),
        isInNewPipelineForChild(n, false),
        n._key,
      )
    }
    // Fallback for span nodes without `text`
    if (isSpanNode({schema: editor.snapshot.context.schema}, n)) {
      return null
    }
    throw new Error(`Unexpected node type`)
  }

  const childArrayPath = isContainerNode
    ? serializePath([...parentPath, arrayFieldName])
    : undefined
  const childChunksOwner = useRef(Symbol('child chunks owner'))
  let ownedChildChunks: Array<RootChunk> | undefined
  if (isContainerNode) {
    const previousChunks = editor.childChunks.get(childArrayPath!)
    ownedChildChunks = previousChunks
      ? reconcileChildChunks(previousChunks, children)
      : buildRootChunks(children)
    editor.childChunks.set(childArrayPath!, ownedChildChunks)
    editor.childChunksOwners.set(childArrayPath!, childChunksOwner.current)
  }
  useEffect(() => {
    if (childArrayPath !== undefined && ownedChildChunks !== undefined) {
      editor.childChunks.set(childArrayPath, ownedChildChunks)
      editor.childChunksOwners.set(childArrayPath, childChunksOwner.current)
    }

    return () => {
      if (
        childArrayPath !== undefined &&
        editor.childChunksOwners.get(childArrayPath) ===
          childChunksOwner.current
      ) {
        editor.childChunks.delete(childArrayPath)
        editor.childChunksOwners.delete(childArrayPath)
      }
    }
  }, [childArrayPath, editor, ownedChildChunks])
  const renderChunks = renderAsChunks
    ? editor.rootChunks
    : isContainerNode
      ? editor.childChunks.get(childArrayPath!)
      : undefined
  const chunkElementCache = useRef(new Map<string, ChunkElementCache>())
  let chunkStart = 0
  const elements = renderChunks
    ? renderChunks.flatMap((chunk) => {
        const start = chunkStart
        chunkStart += chunk.blocks.length
        const hit = getFreshChunkElements(
          chunkElementCache.current,
          chunk,
          start,
          {
            childContainer,
            parentIsInNewPipeline,
            containers: editor.containers,
            textBlocks: editor.textBlocks,
            blockObjects: editor.blockObjects,
            inlineObjects: editor.inlineObjects,
            spans: editor.spans,
            renderElement,
            renderLeaf,
            renderText,
          },
          decorationsByChild,
        )
        if (hit) {
          return hit
        }
        const chunkDecorations = chunk.blocks.map(
          (_, index) => decorationsByChild[start + index] ?? EMPTY_DECORATIONS,
        )
        const chunkElements = chunk.blocks.map((child, index) =>
          renderChild(child, start + index),
        )
        chunkElementCache.current.set(chunk.id, {
          childContainer,
          parentIsInNewPipeline,
          blockObjects: editor.blockObjects,
          chunk,
          containers: editor.containers,
          decorations: chunkDecorations,
          elements: chunkElements,
          inlineObjects: editor.inlineObjects,
          renderElement,
          renderLeaf,
          renderText,
          spans: editor.spans,
          textBlocks: editor.textBlocks,
        })
        return chunkElements
      })
    : children.map(renderChild)

  if (renderChunks) {
    const renderedChunkIds = new Set(renderChunks.map((chunk) => chunk.id))
    for (const chunkId of chunkElementCache.current.keys()) {
      if (!renderedChunkIds.has(chunkId)) {
        chunkElementCache.current.delete(chunkId)
      }
    }
  }

  if (childContainer && childContainer !== parentContainer) {
    // `useChildren` is running for a node that is itself a registered
    // container. Wrap its children in `ParentContainerContext` (so
    // positional `of` lookups resolve against this container) AND in
    // `NewPipelineContext.Provider value={true}` (so descendants emit
    // the new-pipeline DOM shape).
    return (
      <ParentContainerContext value={childContainer}>
        <NewPipelineContext.Provider value={true}>
          {elements}
        </NewPipelineContext.Provider>
      </ParentContainerContext>
    )
  }

  return <>{elements}</>
}

type ChunkRenderInputs = Pick<
  ChunkElementCache,
  | 'childContainer'
  | 'parentIsInNewPipeline'
  | 'containers'
  | 'textBlocks'
  | 'blockObjects'
  | 'inlineObjects'
  | 'spans'
  | 'renderElement'
  | 'renderLeaf'
  | 'renderText'
>

// The lookup lives outside the render callback so the callback's scope never
// references a previous cache entry.
function getFreshChunkElements(
  cache: Map<string, ChunkElementCache>,
  chunk: RootChunk,
  start: number,
  inputs: ChunkRenderInputs,
  decorationsByChild: Array<DecoratedRange[]>,
): Array<React.ReactNode> | undefined {
  const cached = cache.get(chunk.id)
  if (
    cached?.chunk === chunk &&
    cached.childContainer === inputs.childContainer &&
    cached.parentIsInNewPipeline === inputs.parentIsInNewPipeline &&
    cached.containers === inputs.containers &&
    cached.textBlocks === inputs.textBlocks &&
    cached.blockObjects === inputs.blockObjects &&
    cached.inlineObjects === inputs.inlineObjects &&
    cached.spans === inputs.spans &&
    cached.renderElement === inputs.renderElement &&
    cached.renderLeaf === inputs.renderLeaf &&
    cached.renderText === inputs.renderText &&
    chunk.blocks.every((_, index) =>
      isElementDecorationsEqual(
        cached.decorations[index]!,
        decorationsByChild[start + index] ?? EMPTY_DECORATIONS,
      ),
    )
  ) {
    return cached.elements
  }
  return undefined
}

type ChunkElementCache = {
  childContainer: ContainerConfig | undefined
  parentIsInNewPipeline: boolean
  blockObjects: Editor['blockObjects']
  chunk: RootChunk
  containers: Editor['containers']
  decorations: Array<DecoratedRange[]>
  elements: Array<React.ReactNode>
  inlineObjects: Editor['inlineObjects']
  renderElement: (props: RenderElementProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  spans: Editor['spans']
  textBlocks: Editor['textBlocks']
}

export default useChildren
