import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useMemo, useRef, type JSX} from 'react'
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
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from '../components/editable'
import ElementComponent from '../components/element'
import ObjectNodeComponent from '../components/object-node'
import TextComponent from '../components/text'
import {ElementContext} from './use-element'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'
import {useSlateStatic} from './use-slate-static'

/**
 * Children.
 */

const useChildren = (props: {
  parentDataPath: string
  decorations: DecoratedRange[]
  node: Editor | Node
  indexedPath: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    parentDataPath,
    decorations,
    node,
    indexedPath: parentIndexedPath,
    renderElement,
    renderPlaceholder,
    renderText,
    renderLeaf,
  } = props
  const editor = useSlateStatic()

  useIsomorphicLayoutEffect(() => {
    editor.isNodeMapDirty = false
  })

  const isEditorNode = isEditor(node)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  const children = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : []

  const renderElementComponent = useCallback(
    (node: PortableTextTextBlock | PortableTextObject, i: number) => {
      const nodeDataPath =
        parentDataPath === ''
          ? `[_key=="${node._key}"]`
          : `${parentDataPath}.children[_key=="${node._key}"]`

      return (
        <ElementContext.Provider key={`provider-${node._key}`} value={node}>
          <ElementComponent
            dataPath={nodeDataPath}
            decorations={decorationsByChild[i] ?? []}
            element={node}
            key={node._key}
            indexedPath={parentIndexedPath.concat(i)}
            renderElement={renderElement}
            renderPlaceholder={renderPlaceholder}
            renderLeaf={renderLeaf}
            renderText={renderText}
          />
        </ElementContext.Provider>
      )
    },
    [
      parentDataPath,
      decorationsByChild,
      parentIndexedPath,
      renderElement,
      renderPlaceholder,
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

    const nodeDataPath =
      parentDataPath !== ''
        ? `${parentDataPath}.children[_key=="${node._key}"]`
        : ''

    return (
      <TextComponent
        dataPath={nodeDataPath}
        decorations={decorationsByChild[index] ?? []}
        key={node._key}
        isLast={index === children.length - 1}
        parent={textBlockParent}
        indexedPath={parentIndexedPath.concat(index)}
        renderPlaceholder={renderPlaceholder}
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
    const nodeDataPath =
      parentDataPath === ''
        ? `[_key=="${node._key}"]`
        : `${parentDataPath}.children[_key=="${node._key}"]`

    return (
      <ObjectNodeComponent
        dataPath={nodeDataPath}
        decorations={decorationsByChild[index] ?? []}
        isInline={!isEditorNode}
        key={node._key}
        objectNode={node}
        indexedPath={parentIndexedPath.concat(index)}
        renderElement={renderElement}
      />
    )
  }

  return children.map((n: Node, i: number) => {
    if (isTextBlock({schema: editor.schema}, n)) {
      return renderElementComponent(n, i)
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.schema}, n)) {
      return null
    }
    if (isObjectNode({schema: editor.schema}, n)) {
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
}

const useDecorationsByChild = (
  editor: Editor,
  node: Editor | Node,
  indexedPath: Path,
  decorations: DecoratedRange[],
) => {
  const decorationsByChild = splitDecorationsByChild(
    editor,
    node,
    indexedPath,
    decorations,
  )

  const previousRef = useRef<DecoratedRange[][]>(decorationsByChild)

  const stableDecorationsByChild = useMemo(() => {
    const previous = previousRef.current
    const next = decorationsByChild.map((decorations, i) => {
      const previousDecorations: DecoratedRange[] | null = previous[i] ?? null
      if (isElementDecorationsEqual(previousDecorations, decorations)) {
        return previousDecorations!
      }
      return decorations
    })
    return next
  }, [decorationsByChild])

  useIsomorphicLayoutEffect(() => {
    previousRef.current = stableDecorationsByChild
  })

  return stableDecorationsByChild
}

export default useChildren
