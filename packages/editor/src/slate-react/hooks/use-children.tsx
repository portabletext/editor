import {useCallback, useRef, type JSX} from 'react'
import type {
  Ancestor,
  DecoratedRange,
  Editor,
  Element,
  ObjectNode,
  Text,
} from '../../slate'
import {
  isElementDecorationsEqual,
  splitDecorationsByChild,
  type Key,
} from '../../slate-dom'
import {isEditor} from '../../slate/editor/is-editor'
import {isElement} from '../../slate/element/is-element'
import {isObjectNode} from '../../slate/node/is-object-node'
import {isText} from '../../slate/text/is-text'
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
  node: Ancestor
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

  // Update the index and parent of each child.
  node.children.forEach((n, i) => {
    editor.nodeToIndex.set(n, i)
    editor.nodeToParent.set(n, node)
  })

  const renderElementComponent = useCallback(
    (n: Element, i: number, cachedKey?: Key) => {
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

  const renderTextComponent = (n: Text, i: number) => {
    const key = ReactEditor.findKey(editor, n)

    return (
      <TextComponent
        decorations={decorationsByChild[i] ?? []}
        key={key.id}
        isLast={i === node.children.length - 1}
        parent={node}
        renderPlaceholder={renderPlaceholder}
        renderLeaf={renderLeaf}
        renderText={renderText}
        text={n}
      />
    )
  }

  const renderObjectNodeComponent = (n: ObjectNode, i: number) => {
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

  return node.children.map((n, i) => {
    if (isElement(n, editor.schema)) {
      return renderElementComponent(n, i)
    }
    if (isObjectNode(n, editor.schema)) {
      return renderObjectNodeComponent(n, i)
    }
    if (isText(n, editor.schema)) {
      return renderTextComponent(n, i)
    }
    return renderTextComponent(n as Text, i)
  })
}

const useDecorationsByChild = (
  editor: Editor,
  node: Ancestor,
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
