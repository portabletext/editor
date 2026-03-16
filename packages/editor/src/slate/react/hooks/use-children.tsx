import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useRef, type JSX} from 'react'
import type {Key} from '../../dom/utils/key'
import {
  isElementDecorationsEqual,
  splitDecorationsByChild,
} from '../../dom/utils/range-list'
import {isEditor} from '../../editor/is-editor'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {DecoratedRange} from '../../interfaces/text'
import {isObjectNode} from '../../node/is-object-node'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from '../components/editable'
import ElementComponent from '../components/element'
import ObjectNodeComponent from '../components/object-node'
import TextComponent from '../components/text'
import {ReactEditor} from '../plugin/react-editor'
import {ElementContext} from './use-element'
import {useSlateStatic} from './use-slate-static'

/**
 * Children.
 */

const useChildren = (props: {
  decorations: DecoratedRange[]
  node: Editor | Node
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    decorations,
    node,
    renderElement,
    renderPlaceholder,
    renderText,
    renderLeaf,
  } = props
  const editor = useSlateStatic()
  editor.isNodeMapDirty = false

  const isEditorNode = isEditor(node)

  const decorationsByChild = useDecorationsByChild(editor, node, decorations)

  const children = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : []

  // Update the index and parent of each child.
  children.forEach((n: Node, i: number) => {
    editor.nodeToIndex.set(n, i)
    editor.nodeToParent.set(n, node)
  })

  const renderElementComponent = useCallback(
    (
      n: PortableTextTextBlock | PortableTextObject,
      i: number,
      cachedKey?: Key,
    ) => {
      const key = cachedKey ?? ReactEditor.findKey(editor, n)

      return (
        <ElementContext.Provider key={`provider-${key.id}`} value={n}>
          <ElementComponent
            decorations={decorationsByChild[i] ?? []}
            element={n}
            key={key.id}
            renderElement={renderElement}
            renderPlaceholder={renderPlaceholder}
            renderLeaf={renderLeaf}
            renderText={renderText}
          />
        </ElementContext.Provider>
      )
    },
    [
      editor,
      decorationsByChild,
      renderElement,
      renderPlaceholder,
      renderLeaf,
      renderText,
    ],
  )

  const textBlockParent = isTextBlock({schema: editor.schema}, node)
    ? node
    : undefined

  const renderTextComponent = (n: PortableTextSpan, i: number) => {
    if (!textBlockParent) {
      throw new Error(
        'Cannot render text component without a text block parent',
      )
    }

    const key = ReactEditor.findKey(editor, n)

    return (
      <TextComponent
        decorations={decorationsByChild[i] ?? []}
        key={key.id}
        isLast={i === children.length - 1}
        parent={textBlockParent}
        renderPlaceholder={renderPlaceholder}
        renderLeaf={renderLeaf}
        renderText={renderText}
        text={n}
      />
    )
  }

  const renderObjectNodeComponent = (n: PortableTextObject, i: number) => {
    const key = ReactEditor.findKey(editor, n)

    return (
      <ObjectNodeComponent
        decorations={decorationsByChild[i] ?? []}
        isInline={!isEditorNode}
        key={key.id}
        objectNode={n}
        renderElement={renderElement}
      />
    )
  }

  return children.map((n: Node, i: number) => {
    if (isTextBlock({schema: editor.schema}, n)) {
      return renderElementComponent(n, i)
    }
    if (isObjectNode({schema: editor.schema}, n)) {
      return renderObjectNodeComponent(n, i)
    }
    if (isSpan({schema: editor.schema}, n)) {
      return renderTextComponent(n, i)
    }
    throw new Error(`Unexpected node type`)
  })
}

const useDecorationsByChild = (
  editor: Editor,
  node: Editor | Node,
  decorations: DecoratedRange[],
) => {
  const decorationsByChild = splitDecorationsByChild(editor, node, decorations)

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
