import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import React, {useCallback, useRef, type JSX} from 'react'
import {
  ContainerScopeContext,
  useContainerScope,
} from '../../../editor/container-scope-context'
import ContainerTextComponent from '../../../editor/render.container-text'
import {buildScopedName} from '../../../editor/scoped-config-lookup'
import {
  isElementDecorationsEqual,
  splitDecorationsByChild,
} from '../../dom/utils/range-list'
import {isEditor} from '../../editor/is-editor'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {isObjectNode} from '../../node/is-object-node'
import {isSpanNode} from '../../node/is-span-node'
import {isTextBlockNode} from '../../node/is-text-block-node'
import type {RenderElementProps} from '../components/editable'
import ElementComponent from '../components/element'
import {useSlateStatic} from './use-slate-static'

/**
 * Children.
 */

const useChildren = (props: {
  decorations: DecoratedRange[]
  node: Editor | Node
  path: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
}): React.ReactNode => {
  const {decorations, node, path: parentPath, renderElement} = props
  const editor = useSlateStatic()
  editor.isNodeMapDirty = false

  const containerScope = useContainerScope()

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentPath,
    decorations,
  )

  let children: Array<Node> = []
  let childFieldName = 'children'
  let childScope: string | undefined = containerScope

  if (isEditor(node)) {
    children = node.children
  } else if (isTextBlock({schema: editor.schema}, node)) {
    children = node.children

    const textBlockScopedKey = buildScopedName(containerScope, 'block')

    if (editor.containers.has(textBlockScopedKey)) {
      childScope = textBlockScopedKey
    }
  } else if (isObjectNode({schema: editor.schema}, node)) {
    const scopedKey = buildScopedName(containerScope, node._type)

    const containerField = editor.containers.get(scopedKey)

    if (containerField) {
      const fieldValue = (node as Record<string, unknown>)[containerField.name]
      if (Array.isArray(fieldValue)) {
        children = fieldValue as Array<Node>
        childFieldName = containerField.name
      }

      childScope = scopedKey
    }
  }

  const renderElementComponent = useCallback(
    (node: PortableTextTextBlock | PortableTextObject, i: number) => {
      const nodePath: Path =
        parentPath.length === 0
          ? [{_key: node._key}]
          : [...parentPath, childFieldName, {_key: node._key}]

      return (
        <ElementComponent
          decorations={decorationsByChild[i] ?? []}
          element={node}
          key={node._key}
          path={nodePath}
          renderElement={renderElement}
        />
      )
    },
    [childFieldName, decorationsByChild, parentPath, renderElement],
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
      <ContainerTextComponent
        decorations={decorationsByChild[index] ?? []}
        key={node._key}
        isLast={index === children.length - 1}
        parent={textBlockParent}
        path={nodePath}
        text={node}
      />
    )
  }

  const elements = children.map((n: Node, i: number) => {
    if (isTextBlock({schema: editor.schema}, n)) {
      return renderElementComponent(n, i)
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.schema}, n)) {
      return null
    }
    if (isObjectNode({schema: editor.schema}, n)) {
      return renderElementComponent(n, i)
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

  if (childScope && childScope !== containerScope) {
    return (
      <ContainerScopeContext value={childScope}>
        {elements}
      </ContainerScopeContext>
    )
  }

  return <>{elements}</>
}

const useDecorationsByChild = (
  editor: Editor,
  node: Editor | Node,
  path: Path,
  decorations: DecoratedRange[],
) => {
  const decorationsByChild = splitDecorationsByChild(
    editor,
    node,
    path,
    decorations,
  )

  // The value we return is a mutable array of `DecoratedRange[]` arrays. Each
  // `DecoratedRange[]` is only updated if the decorations at that index have
  // changed, which speeds up the equality check for the `decorations` prop in
  // the memoized `Element` and `Text` components.
  const mutableDecorationsByChild = useRef(decorationsByChild).current

  // Resize the mutable array to match the latest result
  mutableDecorationsByChild.length = decorationsByChild.length

  for (let i = 0; i < decorationsByChild.length; i++) {
    const decorations = decorationsByChild[i]!

    const previousDecorations: DecoratedRange[] | null =
      mutableDecorationsByChild[i] ?? null

    if (!isElementDecorationsEqual(previousDecorations, decorations)) {
      mutableDecorationsByChild[i] = decorations!
    }
  }

  return mutableDecorationsByChild
}

export default useChildren
