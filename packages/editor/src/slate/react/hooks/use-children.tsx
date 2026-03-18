import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useCallback, useContext, useRef, type JSX} from 'react'
import {ContainerScopeContext} from '../../../editor/container-scope-context'
import {EditorActorContext} from '../../../editor/editor-actor-context'
import {
  getContainerChildFields,
  isContainerType,
} from '../../../renderers/container-schema'
import {getRendererKey} from '../../../renderers/renderer.types'
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
import {useSlateStatic} from './use-slate-static'

/**
 * Collect all children from a container node's schema-defined child fields
 * into a flat array, preserving the field name for each child.
 */
function getContainerChildrenFlat(editor: Editor, node: Node): Array<Node> {
  const childFields = getContainerChildFields(editor.schema, node._type)
  const result: Array<Node> = []

  for (const childField of childFields) {
    const fieldValue = (node as Record<string, unknown>)[childField.fieldName]

    if (!Array.isArray(fieldValue)) {
      continue
    }

    for (const child of fieldValue) {
      if (child && typeof child === 'object' && '_key' in child) {
        result.push(child as Node)
      }
    }
  }

  return result
}

/**
 * Build a map from child _key to the field name it came from.
 * Used for data-path construction (e.g., "table-1.rows.row-1").
 */
function buildContainerChildFieldMap(
  editor: Editor,
  node: Node,
): Map<string, string> {
  const childFields = getContainerChildFields(editor.schema, node._type)
  const map = new Map<string, string>()

  for (const childField of childFields) {
    const fieldValue = (node as Record<string, unknown>)[childField.fieldName]

    if (!Array.isArray(fieldValue)) {
      continue
    }

    for (const child of fieldValue) {
      if (child && typeof child === 'object' && '_key' in child) {
        map.set((child as {_key: string})._key, childField.fieldName)
      }
    }
  }

  return map
}

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
  const currentScope = useContext(ContainerScopeContext)
  const editorActor = useContext(EditorActorContext)
  const renderers = useSelector(editorActor, (s) => s.context.renderers)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  const hasRenderer = (typeName: string, scope?: string): boolean => {
    if (scope) {
      const scopedKey = getRendererKey('blockObject', `${scope}.${typeName}`)
      if (renderers.has(scopedKey)) {
        return true
      }
    }
    const key = getRendererKey('blockObject', typeName)
    return renderers.has(key)
  }

  const isContainerNode =
    !isEditor(node) &&
    isObjectNode({schema: editor.schema}, node) &&
    isContainerType(editor.schema, node._type) &&
    hasRenderer(node._type, currentScope)

  // When the current node is a container, compute the scope for its children.
  // The scope accumulates: undefined -> 'table' -> 'table.row' -> 'table.row.cell'
  const childScope = isContainerNode
    ? currentScope
      ? `${currentScope}.${node._type}`
      : node._type
    : currentScope

  const children: Array<Node> = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : isContainerNode
        ? getContainerChildrenFlat(editor, node)
        : []

  // For container nodes, we need to know which field each child came from
  // so we can build the correct data-path (e.g., "table-1.rows.row-1")
  const containerChildFieldMap = isContainerNode
    ? buildContainerChildFieldMap(editor, node)
    : undefined

  const renderElementComponent = useCallback(
    (node: PortableTextTextBlock | PortableTextObject, i: number) => {
      // For container children, use field name in the path instead of "children"
      const nodeDataPath = containerChildFieldMap
        ? `${parentDataPath}.${containerChildFieldMap.get(node._key) ?? 'children'}.${node._key}`
        : parentDataPath === ''
          ? `${node._key}`
          : `${parentDataPath}.children.${node._key}`

      return (
        <ContainerScopeContext.Provider
          key={`scope-${node._key}`}
          value={childScope}
        >
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
        </ContainerScopeContext.Provider>
      )
    },
    [
      containerChildFieldMap,
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
      parentDataPath !== '' ? `${parentDataPath}.children.${node._key}` : ''

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
    // Container types go through the normal Element pipeline only when a
    // renderer is registered. Without a renderer, they render as void objects
    // (backwards compatible).
    if (
      (isEditorNode || isContainerNode) &&
      isContainerType(editor.schema, node._type) &&
      hasRenderer(node._type, childScope)
    ) {
      return renderElementComponent(node, index)
    }

    const nodeDataPath = containerChildFieldMap
      ? `${parentDataPath}.${containerChildFieldMap.get(node._key) ?? 'children'}.${node._key}`
      : parentDataPath === ''
        ? `${node._key}`
        : `${parentDataPath}.children.${node._key}`

    return (
      <ContainerScopeContext.Provider
        key={`scope-${node._key}`}
        value={childScope}
      >
        <ObjectNodeComponent
          dataPath={nodeDataPath}
          decorations={decorationsByChild[index] ?? []}
          isInline={!isEditorNode && !isContainerNode}
          key={node._key}
          objectNode={node}
          indexedPath={parentIndexedPath.concat(index)}
          renderElement={renderElement}
        />
      </ContainerScopeContext.Provider>
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
