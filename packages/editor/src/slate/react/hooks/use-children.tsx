import type {
  OfDefinition,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useMemo, useRef, type JSX} from 'react'
import {
  ContainerScopeContext,
  useContainerScope,
  type ContainerScope,
} from '../../../editor/container-scope-context'
import {resolveChildArrayField} from '../../../schema/resolve-child-array-field'
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

  const containerScope = useContainerScope()

  const isEditorNode = isEditor(node)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  const containerChildInfo = getContainerChildInfo(editor, node, containerScope)

  const children = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : containerChildInfo
        ? containerChildInfo.children
        : []

  const childFieldName = containerChildInfo?.fieldName ?? 'children'

  const childScopeValue = useMemo<ContainerScope | undefined>(
    () =>
      containerChildInfo
        ? {
            name: containerChildInfo.scopeName,
            schemaScope: containerChildInfo.ofDefinitions,
          }
        : undefined,
    [containerChildInfo],
  )

  const renderElementComponent = useCallback(
    (childNode: PortableTextTextBlock | PortableTextObject, index: number) => {
      const nodeDataPath =
        parentDataPath === ''
          ? `[_key=="${childNode._key}"]`
          : `${parentDataPath}.${childFieldName}[_key=="${childNode._key}"]`

      return (
        <ContainerScopeContext.Provider
          key={`provider-${childNode._key}`}
          value={childScopeValue}
        >
          <ElementContext.Provider
            key={`element-${childNode._key}`}
            value={childNode}
          >
            <ElementComponent
              dataPath={nodeDataPath}
              decorations={decorationsByChild[index] ?? []}
              element={childNode}
              key={childNode._key}
              indexedPath={parentIndexedPath.concat(index)}
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
      parentDataPath,
      childFieldName,
      childScopeValue,
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
    childNode: PortableTextObject,
    index: number,
  ) => {
    const nodeDataPath =
      parentDataPath === ''
        ? `[_key=="${childNode._key}"]`
        : `${parentDataPath}.${childFieldName}[_key=="${childNode._key}"]`

    return (
      <ObjectNodeComponent
        dataPath={nodeDataPath}
        decorations={decorationsByChild[index] ?? []}
        isInline={!isEditorNode}
        key={childNode._key}
        objectNode={childNode}
        indexedPath={parentIndexedPath.concat(index)}
        renderElement={renderElement}
      />
    )
  }

  return children.map((childNode: Node, index: number) => {
    if (isTextBlock({schema: editor.schema}, childNode)) {
      return renderElementComponent(childNode, index)
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.schema}, childNode)) {
      return null
    }
    if (isObjectNode({schema: editor.schema}, childNode)) {
      const scopeName = containerChildInfo?.scopeName ?? containerScope?.name
      const scopedType = scopeName
        ? `${scopeName}.${childNode._type}`
        : childNode._type
      const isEditable =
        editor.editableTypes.has(scopedType) ||
        editor.editableTypes.has(childNode._type)

      if (isEditable) {
        return renderElementComponent(childNode, index)
      }
      return renderObjectNodeComponent(childNode, index)
    }
    if (isSpan({schema: editor.schema}, childNode)) {
      return renderTextComponent(childNode, index)
    }
    // Fallback for span nodes without `text`
    if (isSpanNode({schema: editor.schema}, childNode)) {
      return null
    }
    throw new Error(`Unexpected node type`)
  })
}

type ContainerChildInfo = {
  children: Array<Node>
  fieldName: string
  scopeName: string
  ofDefinitions: ReadonlyArray<OfDefinition> | undefined
}

function getContainerChildInfo(
  editor: Editor,
  node: Editor | Node,
  containerScope: ContainerScope | undefined,
): ContainerChildInfo | undefined {
  if (isEditor(node)) {
    return undefined
  }
  if (isTextBlock({schema: editor.schema}, node)) {
    return undefined
  }
  if (!isObjectNode({schema: editor.schema}, node)) {
    return undefined
  }

  const parentScopeName = containerScope?.name
  const scopedType = parentScopeName
    ? `${parentScopeName}.${node._type}`
    : node._type
  const isEditable =
    editor.editableTypes.has(scopedType) || editor.editableTypes.has(node._type)

  if (!isEditable) {
    return undefined
  }

  const arrayField = resolveChildArrayField(
    {schema: editor.schema, scope: containerScope?.schemaScope},
    node,
  )

  if (!arrayField) {
    return undefined
  }

  const fieldValue = (node as Record<string, unknown>)[arrayField.name]

  if (!Array.isArray(fieldValue)) {
    return undefined
  }

  const scopeName = parentScopeName
    ? `${parentScopeName}.${node._type}`
    : node._type

  return {
    children: fieldValue,
    fieldName: arrayField.name,
    scopeName,
    ofDefinitions: arrayField.of,
  }
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
