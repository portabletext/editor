import type {
  OfDefinition,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useContext, useRef, type JSX} from 'react'
import {
  ContainerScopeContext,
  type ContainerScope,
} from '../../../editor/container-scope-context'
import {EditorActorContext} from '../../../editor/editor-actor-context'
import {getRendererKey} from '../../../renderers/renderer.types'
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

  const editorActor = useContext(EditorActorContext)
  const containerScope = useContext(ContainerScopeContext)

  const isEditorNode = isEditor(node)

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  // Determine the children array and scope for this node.
  // containerScope carries the parent's accumulated path, used to look up
  // the current node's renderer. containerChildInfo resolves the current
  // node's child array field and computes the scope for its children.
  const renderers = editorActor.getSnapshot().context.renderers
  const containerChildInfo = getContainerChildInfo(
    editor,
    node,
    renderers,
    containerScope,
  )

  const children = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : containerChildInfo
        ? containerChildInfo.children
        : []

  const renderElementComponent = useCallback(
    (childNode: PortableTextTextBlock | PortableTextObject, index: number) => {
      const nodeDataPath =
        parentDataPath === ''
          ? `[_key=="${childNode._key}"]`
          : containerChildInfo
            ? `${parentDataPath}.${containerChildInfo.fieldName}[_key=="${childNode._key}"]`
            : `${parentDataPath}.children[_key=="${childNode._key}"]`

      return (
        <ElementContext.Provider
          key={`provider-${childNode._key}`}
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
      )
    },
    [
      parentDataPath,
      containerChildInfo,
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

  const renderTextComponent = (childNode: PortableTextSpan, index: number) => {
    if (!textBlockParent) {
      throw new Error(
        'Cannot render text component without a text block parent',
      )
    }

    const nodeDataPath =
      parentDataPath !== ''
        ? `${parentDataPath}.children[_key=="${childNode._key}"]`
        : ''

    return (
      <TextComponent
        dataPath={nodeDataPath}
        decorations={decorationsByChild[index] ?? []}
        key={childNode._key}
        isLast={index === children.length - 1}
        parent={textBlockParent}
        indexedPath={parentIndexedPath.concat(index)}
        renderPlaceholder={renderPlaceholder}
        renderLeaf={renderLeaf}
        renderText={renderText}
        text={childNode}
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
        : containerChildInfo
          ? `${parentDataPath}.${containerChildInfo.fieldName}[_key=="${childNode._key}"]`
          : `${parentDataPath}.children[_key=="${childNode._key}"]`

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

  // Wrap container children in scope context.
  // The scope carries the parent's accumulated path so that the child's
  // renderer can be looked up as scope.name + '.' + child._type.
  const renderContainerElementComponent = useCallback(
    (
      childNode: PortableTextTextBlock | PortableTextObject,
      index: number,
      scope: ContainerScope,
    ) => {
      const nodeDataPath = containerChildInfo
        ? parentDataPath === ''
          ? `[_key=="${childNode._key}"]`
          : `${parentDataPath}.${containerChildInfo.fieldName}[_key=="${childNode._key}"]`
        : parentDataPath === ''
          ? `[_key=="${childNode._key}"]`
          : `${parentDataPath}.children[_key=="${childNode._key}"]`

      return (
        <ContainerScopeContext.Provider
          key={`scope-${childNode._key}`}
          value={scope}
        >
          <ElementContext.Provider
            key={`provider-${childNode._key}`}
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
      containerChildInfo,
      parentDataPath,
      decorationsByChild,
      parentIndexedPath,
      renderElement,
      renderPlaceholder,
      renderLeaf,
      renderText,
    ],
  )

  // The scope name for looking up children's renderers.
  // This is the current container's full path.
  const childScopeName = containerChildInfo?.scopeName

  return children.map((childNode: Node, index: number) => {
    if (isTextBlock({schema: editor.schema}, childNode)) {
      // If we're inside a container, wrap in scope context so that
      // text blocks inside containers get the correct scope
      if (containerChildInfo) {
        const nodeDataPath = `${parentDataPath}.${containerChildInfo.fieldName}[_key=="${childNode._key}"]`
        return (
          <ContainerScopeContext.Provider
            key={`scope-${childNode._key}`}
            value={{
              name: childScopeName ?? '',
              schemaScope: containerChildInfo.ofDefinitions,
            }}
          >
            <ElementContext.Provider
              key={`provider-${childNode._key}`}
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
      }
      return renderElementComponent(childNode, index)
    }
    if (isObjectNode({schema: editor.schema}, childNode)) {
      // Check if this object node has a registered renderer.
      // Use the current container's scope name to build the scoped renderer key.
      const lookupScopeName = childScopeName ?? containerScope?.name
      const rendererKey = getRendererKey('blockObject', childNode._type)
      const scopedRendererKey = lookupScopeName
        ? getRendererKey('blockObject', `${lookupScopeName}.${childNode._type}`)
        : undefined
      const hasRenderer =
        (scopedRendererKey && renderers.has(scopedRendererKey)) ||
        renderers.has(rendererKey)

      if (hasRenderer) {
        // Container with a renderer - render through Element pipeline.
        // Set the scope to the parent's accumulated path so that
        // the child's getContainerChildInfo can look up its renderer.
        const scope: ContainerScope = {
          name: lookupScopeName ?? '',
          schemaScope: containerChildInfo?.ofDefinitions,
        }
        return renderContainerElementComponent(childNode, index, scope)
      }
      return renderObjectNodeComponent(childNode, index)
    }
    if (isSpan({schema: editor.schema}, childNode)) {
      return renderTextComponent(childNode, index)
    }
    throw new Error(`Unexpected node type`)
  })
}

type ContainerChildInfo = {
  children: Array<Node>
  fieldName: string
  /** The full scope name of the current container (e.g. 'table', 'table.row') */
  scopeName: string
  ofDefinitions: ReadonlyArray<OfDefinition> | undefined
}

/**
 * Checks if the given node is a container with a registered renderer.
 * If so, resolves its child array field and returns the children and scope info.
 *
 * The containerScope carries the parent's accumulated path. The current node's
 * renderer is looked up as scope.name + '.' + node._type (or just node._type
 * if scope is undefined).
 */
function getContainerChildInfo(
  editor: Editor,
  node: Editor | Node,
  renderers: Map<string, unknown>,
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

  // Check if this node has a registered renderer.
  // The scope name is the parent's accumulated path.
  const parentScopeName = containerScope?.name
  const rendererKey = getRendererKey('blockObject', node._type)
  const scopedRendererKey = parentScopeName
    ? getRendererKey('blockObject', `${parentScopeName}.${node._type}`)
    : undefined
  const hasRenderer =
    (scopedRendererKey && renderers.has(scopedRendererKey)) ||
    renderers.has(rendererKey)

  if (!hasRenderer) {
    return undefined
  }

  // Resolve the child array field from the schema, using the schema scope
  // from the container context to find nested type definitions
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

  // The full scope name for this container
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
