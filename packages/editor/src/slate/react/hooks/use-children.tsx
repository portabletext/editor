import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import React, {useCallback, type JSX} from 'react'
import {
  ParentContainerContext,
  useParentContainer,
} from '../../../editor/parent-container-context'
import type {ContainerConfig} from '../../../renderers/renderer.types'
import {isEditor} from '../../editor/is-editor'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {isObjectNode} from '../../node/is-object-node'
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
import {useSlateStatic} from './use-slate-static'

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
  const editor = useSlateStatic()
  editor.isNodeMapDirty = false

  const parentContainer = useParentContainer()

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
    children = node.children
  } else if (isTextBlock({schema: editor.schema}, node)) {
    children = node.children
  } else if (isObjectNode({schema: editor.schema}, node)) {
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

  const textBlockParent = isTextBlock({schema: editor.schema}, node)
    ? node
    : undefined

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

  // `inContainer` is the effective container context the dispatched
  // children will see: either the current node's own container (when we
  // wrap below) or the inherited parent container otherwise.
  const inContainer = Boolean(childContainer ?? parentContainer)

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
        inContainer={inContainer}
        isInline={textBlockParent !== undefined}
        key={node._key}
        objectNode={node}
        path={nodePath}
        renderElement={renderElement}
      />
    )
  }

  const elements = children.map((n: Node, i: number) => {
    if (isTextBlock({schema: editor.schema}, n)) {
      return renderElementComponent(n, i, false)
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.schema}, n)) {
      return null
    }
    if (isObjectNode({schema: editor.schema}, n)) {
      // Does `n` resolve as a container at this position?
      // (positional override in childContainer.container.of, or global)
      if (resolveContainerForNode(editor, childContainer, n)) {
        return renderElementComponent(n, i, true)
      }
      return renderObjectNodeComponent(n, i)
    }
    if (isSpan({schema: editor.schema}, n)) {
      return renderTextComponent(n, i)
    }
    // Fallback for span nodes without `text`
    if (isSpanNode({schema: editor.schema}, n)) {
      return null
    }
    throw new Error(`Unexpected node type`)
  })

  if (childContainer && childContainer !== parentContainer) {
    return (
      <ParentContainerContext value={childContainer}>
        {elements}
      </ParentContainerContext>
    )
  }

  return <>{elements}</>
}

export default useChildren
