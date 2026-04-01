import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useMemo, useRef, type JSX} from 'react'
import {getNodeChildren} from '../../../node-traversal/get-children'
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
import {ScopeContext, useScope} from './use-scope'
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
  editor.isNodeMapDirty = false

  const isEditorNode = isEditor(node)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  const {scope, scopePath} = useScope()

  const nodeChildren = isEditor(node)
    ? {
        children: node.children,
        scope: undefined,
        scopePath: '',
        fieldName: 'value',
      }
    : getNodeChildren(
        {schema: editor.schema, editableTypes: editor.editableTypes},
        node,
        scope,
        scopePath,
      )

  const children = nodeChildren?.children ?? []
  const childScope = nodeChildren?.scope
  const childScopePath = nodeChildren?.scopePath ?? ''
  const childFieldName = nodeChildren?.fieldName ?? 'children'
  const scopeContextValue = useMemo(
    () => ({scope: childScope, scopePath: childScopePath}),
    [childScope, childScopePath],
  )

  const renderElementComponent = useCallback(
    (node: PortableTextTextBlock | PortableTextObject, i: number) => {
      const nodeDataPath =
        parentDataPath === ''
          ? `[_key=="${node._key}"]`
          : `${parentDataPath}.${childFieldName}[_key=="${node._key}"]`

      return (
        <ScopeContext.Provider
          key={`provider-${node._key}`}
          value={scopeContextValue}
        >
          <ElementContext.Provider value={node}>
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
        </ScopeContext.Provider>
      )
    },
    [
      parentDataPath,
      childFieldName,
      decorationsByChild,
      parentIndexedPath,
      renderElement,
      renderPlaceholder,
      renderLeaf,
      renderText,
      scopeContextValue,
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
        ? `${parentDataPath}.${childFieldName}[_key=="${node._key}"]`
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
        : `${parentDataPath}.${childFieldName}[_key=="${node._key}"]`

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
      const scopedKey = childScopePath
        ? `${childScopePath}.${n._type}`
        : n._type
      if (editor.editableTypes.has(scopedKey)) {
        return renderElementComponent(n, i)
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
