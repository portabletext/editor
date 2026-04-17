import type {PortableTextSpan} from '@portabletext/schema'
import {useContext, type CSSProperties} from 'react'
import type {RenderLeafProps} from '../slate/react/components/editable'
import type {
  RangeDecoration,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderPlaceholderFunction,
} from '../types/editor'
import {useContainerScope} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {RenderSpan} from './render.span'
import {buildScopedName, findByScope} from './scoped-config-lookup'

const PLACEHOLDER_STYLE: CSSProperties = {
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
  left: 0,
  right: 0,
}

export function RenderLeaf(
  props: RenderLeafProps & {
    leaf: PortableTextSpan & {
      placeholder?: boolean
      rangeDecoration?: RangeDecoration
    }
    readOnly: boolean
    renderAnnotation?: RenderAnnotationFunction
    renderChild?: RenderChildFunction
    renderDecorator?: RenderDecoratorFunction
    renderPlaceholder?: RenderPlaceholderFunction
    schema: EditorSchema
  },
) {
  const schema = props.schema

  const containerScope = useContainerScope()
  const editorActor = useContext(EditorActorContext)
  const leafScope = buildScopedName(containerScope, `block.${schema.span.name}`)
  const leafConfig = findByScope(
    editorActor.getSnapshot().context.leafConfigs,
    leafScope,
  )

  if (props.leaf._type !== schema.span.name) {
    return props.children
  }

  let renderedSpan = <RenderSpan {...props} leafConfig={leafConfig} />

  if (
    props.renderPlaceholder &&
    props.leaf.placeholder &&
    props.text.text === ''
  ) {
    return (
      <>
        <span style={PLACEHOLDER_STYLE} contentEditable={false}>
          {props.renderPlaceholder()}
        </span>
        {renderedSpan}
      </>
    )
  }

  const rangeDecoration = props.leaf.rangeDecoration

  if (rangeDecoration) {
    renderedSpan = rangeDecoration.component({children: renderedSpan})
  }

  return renderedSpan
}
