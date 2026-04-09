import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {useCallback, useRef, type JSX} from 'react'
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

  const isEditorNode = isEditor(node)

  const containerScope = useContainerScope()

  const decorationsByChild = useDecorationsByChild(
    editor,
    node,
    parentIndexedPath,
    decorations,
  )

  let children: Array<Node> = []
  let childFieldName = 'children'
  let childScope: ContainerScope | undefined = containerScope

  if (isEditor(node)) {
    children = node.children
  } else if (isTextBlock({schema: editor.schema}, node)) {
    children = node.children
  } else if (isObjectNode({schema: editor.schema}, node)) {
    const scopedKey = containerScope
      ? `${containerScope.name}.${node._type}`
      : node._type

    if (editor.editableTypes.has(scopedKey)) {
      const arrayField = resolveChildArrayField(
        {schema: editor.schema, scope: containerScope?.schemaScope},
        node,
      )

      if (arrayField) {
        const fieldValue = (node as Record<string, unknown>)[arrayField.name]
        if (Array.isArray(fieldValue)) {
          children = fieldValue as Array<Node>
          childFieldName = arrayField.name
        }

        childScope = {
          name: scopedKey,
          schemaScope: arrayField.of,
        }
      }
    }
  }

  const renderElementComponent = useCallback(
    (node: PortableTextTextBlock | PortableTextObject, i: number) => {
      const nodeDataPath =
        parentDataPath === ''
          ? `[_key=="${node._key}"]`
          : `${parentDataPath}.${childFieldName}[_key=="${node._key}"]`

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
      childFieldName,
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

  const elements = children.map((n: Node, i: number) => {
    if (isTextBlock({schema: editor.schema}, n)) {
      return renderElementComponent(n, i)
    }
    // Fallback for text block nodes without `children`
    if (isTextBlockNode({schema: editor.schema}, n)) {
      return null
    }
    if (isObjectNode({schema: editor.schema}, n)) {
      if (editor.editableTypes.has(n._type)) {
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

  if (childScope && childScope !== containerScope) {
    return (
      <ContainerScopeContext.Provider value={childScope}>
        {elements}
      </ContainerScopeContext.Provider>
    )
  }

  return elements
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
