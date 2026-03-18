import type {PortableTextObject} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {getContainerChildFields} from '../../../renderers/container-schema'
import {useRenderer} from '../../../renderers/use-renderer'
import {IS_ANDROID} from '../../dom/utils/environment'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {ElementContext} from '../hooks/use-element'
import {useSlateStatic} from '../hooks/use-slate-static'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './editable'
import ElementComponent from './element'

/**
 * ContainerNode renders a block object that has nested child fields
 * (e.g., a table with rows, cells, and content blocks).
 *
 * It recursively renders the container's children using registered renderers,
 * and for leaf content fields (arrays of blocks), renders through the normal
 * block rendering pipeline.
 */
const ContainerNodeComponent = (props: {
  dataPath: string
  decorations: Array<DecoratedRange>
  containerNode: PortableTextObject
  indexedPath: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  scope?: string
}) => {
  const {
    dataPath,
    containerNode,
    indexedPath,
    renderElement,
    renderPlaceholder,
    renderText,
    renderLeaf,
    scope,
  } = props

  const editor = useSlateStatic()
  const typeName = containerNode._type
  const currentScope = scope ? `${scope}.${typeName}` : typeName

  const rendererConfig = useRenderer('blockObject', typeName, scope)

  const childFields = getContainerChildFields(editor.schema, typeName, scope)

  // Render children for each child field
  const renderedChildren: Array<React.ReactNode> = []

  for (const childField of childFields) {
    const fieldValue = (containerNode as Record<string, unknown>)[
      childField.fieldName
    ]

    if (!Array.isArray(fieldValue)) {
      continue
    }

    for (let index = 0; index < fieldValue.length; index++) {
      const childNode = fieldValue[index] as PortableTextObject

      if (!childNode || typeof childNode !== 'object' || !childNode._key) {
        continue
      }

      const childDataPath = `${dataPath}.${childField.fieldName}.${childNode._key}`

      // Check if this child is a block type (content field)
      const isBlock =
        childField.ofTypes.some((ofType) => ofType.type === 'block') &&
        isTextBlock({schema: editor.schema}, childNode)

      if (isBlock) {
        // Render through the normal block rendering pipeline
        renderedChildren.push(
          <ElementContext.Provider
            key={`provider-${childNode._key}`}
            value={childNode}
          >
            <ElementComponent
              dataPath={childDataPath}
              decorations={[]}
              element={childNode}
              key={childNode._key}
              indexedPath={indexedPath.concat(index)}
              renderElement={renderElement}
              renderPlaceholder={renderPlaceholder}
              renderLeaf={renderLeaf}
              renderText={renderText}
            />
          </ElementContext.Provider>,
        )
      } else {
        // Render as a nested container or object
        const nestedChildFields = getContainerChildFields(
          editor.schema,
          childNode._type,
          currentScope,
        )

        if (nestedChildFields.length > 0) {
          // This is a nested container - recurse
          renderedChildren.push(
            <ContainerNodeComponent
              key={childNode._key}
              dataPath={childDataPath}
              decorations={[]}
              containerNode={childNode}
              indexedPath={indexedPath.concat(index)}
              renderElement={renderElement}
              renderPlaceholder={renderPlaceholder}
              renderText={renderText}
              renderLeaf={renderLeaf}
              scope={currentScope}
            />,
          )
        }
      }
    }
  }

  const children = <>{renderedChildren}</>

  // Build attributes
  const attributes: Record<string, unknown> = {
    'data-slate-node': 'element',
    'data-slate-void': true,
    'data-path': dataPath,
  }

  if (rendererConfig) {
    return rendererConfig.renderer.render({
      attributes,
      children,
      node: containerNode,
    })
  }

  // Default rendering - just a div wrapper
  return (
    <div {...attributes} style={{position: 'relative'}}>
      {children}
      <div
        data-slate-spacer
        style={{
          height: '0',
          color: 'transparent',
          outline: 'none',
          position: 'absolute',
        }}
      >
        <span data-slate-node="text">
          <span data-slate-leaf>
            <span data-slate-zero-width="z" data-slate-length={0}>
              {!IS_ANDROID ? '\uFEFF' : null}
            </span>
          </span>
        </span>
      </div>
    </div>
  )
}

const MemoizedContainerNode = React.memo(ContainerNodeComponent)

export default MemoizedContainerNode
