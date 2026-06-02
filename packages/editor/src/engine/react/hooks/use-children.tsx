import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import React, {useCallback, useContext, type JSX} from 'react'
import {NewPipelineContext} from '../../../editor/new-pipeline-context'
import {
  ParentContainerContext,
  useParentContainer,
} from '../../../editor/parent-container-context'
import type {ContainerConfig} from '../../../renderers/renderer.types'
import {isObject} from '../../../traversal/is-object'
import {isEditor} from '../../editor/is-editor'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {isSpanNode} from '../../node/is-span-node'
import {isTextBlockNode} from '../../node/is-text-block-node'
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
      if (editor.textBlocks.has(n._type)) {
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
        // pipeline subtree on its own — if the parent text block is in
        // the new pipeline, `parentIsInNewPipeline` already short-
        // circuits upstream; otherwise the inline object stays legacy
        // so the DOM is consistent across the block.
        return false
      }
      // Block object position
      if (editor.blockObjects.has(n._type)) {
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

  const elements = children.map((n: Node, i: number) => {
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
  })

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

export default useChildren
