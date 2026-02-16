import {useSelector} from '@xstate/react'
import {useContext, useMemo, useRef, type ReactElement} from 'react'
import {useSlateStatic, type RenderLeafProps} from '../slate-react'
import type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import {serializePath} from '../utils/util.serialize-path'
import {EditorActorContext} from './editor-actor-context'
import {SelectionStateContext} from './selection-state-context'

export interface RenderSpanProps extends RenderLeafProps {
  children: ReactElement<any>
  renderAnnotation?: RenderAnnotationFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  readOnly: boolean
}

export function RenderSpan(props: RenderSpanProps) {
  const slateEditor = useSlateStatic()
  const editorActor = useContext(EditorActorContext)
  const legacySchema = useSelector(editorActor, (s) =>
    s.context.getLegacySchema(),
  )
  const spanRef = useRef<HTMLElement>(null)

  const parent = props.children.props.parent
  const block = parent && slateEditor.isTextBlock(parent) ? parent : undefined

  const path = useMemo(
    () =>
      block
        ? [{_key: block._key}, 'children', {_key: props.leaf._key}]
        : undefined,
    [block, props.leaf._key],
  )

  const selectionState = useContext(SelectionStateContext)
  const serializedPath = path ? serializePath(path) : undefined
  const focused = serializedPath
    ? selectionState.focusedChildPath === serializedPath
    : false
  const selected = serializedPath
    ? selectionState.selectedChildPaths.has(serializedPath)
    : false

  const decoratorSchemaTypes = editorActor
    .getSnapshot()
    .context.schema.decorators.map((decorator) => decorator.name)

  const decorators = [
    ...new Set(
      (props.leaf.marks ?? []).filter((mark) =>
        decoratorSchemaTypes.includes(mark),
      ),
    ),
  ]

  const annotationMarkDefs = (props.leaf.marks ?? []).flatMap((mark) => {
    if (decoratorSchemaTypes.includes(mark)) {
      return []
    }

    const markDef = block?.markDefs?.find((markDef) => markDef._key === mark)

    if (markDef) {
      return [markDef]
    }

    return []
  })

  let children = props.children

  /**
   * Support `renderDecorator` render function for each Decorator
   */
  for (const mark of decorators) {
    const legacyDecoratorSchemaType = legacySchema.decorators.find(
      (dec) => dec.value === mark,
    )

    if (path && legacyDecoratorSchemaType && props.renderDecorator) {
      children = (
        <RenderDecorator
          renderDecorator={props.renderDecorator}
          editorElementRef={spanRef}
          focused={focused}
          path={path}
          selected={selected}
          schemaType={legacyDecoratorSchemaType}
          value={mark}
          type={legacyDecoratorSchemaType}
        >
          {children}
        </RenderDecorator>
      )
    }
  }

  /**
   * Support `renderAnnotation` render function for each Annotation
   */
  for (const annotationMarkDef of annotationMarkDefs) {
    const legacyAnnotationSchemaType = legacySchema.annotations.find(
      (t) => t.name === annotationMarkDef._type,
    )
    if (legacyAnnotationSchemaType) {
      if (block && path && props.renderAnnotation) {
        children = (
          <span ref={spanRef}>
            <RenderAnnotation
              renderAnnotation={props.renderAnnotation}
              block={block}
              editorElementRef={spanRef}
              focused={focused}
              path={path}
              selected={selected}
              schemaType={legacyAnnotationSchemaType}
              value={annotationMarkDef}
              type={legacyAnnotationSchemaType}
            >
              {children}
            </RenderAnnotation>
          </span>
        )
      } else {
        children = <span ref={spanRef}>{children}</span>
      }
    }
  }

  /**
   * Support `renderChild` render function for the Span itself
   */
  if (block && path && props.renderChild) {
    const child = block.children.find(
      (_child) => _child._key === props.leaf._key,
    ) // Ensure object equality

    if (child) {
      children = (
        <RenderChild
          renderChild={props.renderChild}
          annotations={annotationMarkDefs}
          editorElementRef={spanRef}
          focused={focused}
          path={path}
          schemaType={legacySchema.span}
          selected={selected}
          value={child}
          type={legacySchema.span}
        >
          {children}
        </RenderChild>
      )
    }
  }

  return (
    <span {...props.attributes} ref={spanRef}>
      {children}
    </span>
  )
}

function RenderAnnotation({
  renderAnnotation,
  block,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
  type,
}: {
  renderAnnotation: RenderAnnotationFunction
} & BlockAnnotationRenderProps) {
  return renderAnnotation({
    block,
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
    type,
  })
}

function RenderDecorator({
  renderDecorator,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
  type,
}: {
  renderDecorator: RenderDecoratorFunction
} & BlockDecoratorRenderProps) {
  return renderDecorator({
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
    type,
  })
}

function RenderChild({
  renderChild,
  annotations,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
  type,
}: {
  renderChild: RenderChildFunction
} & BlockChildRenderProps) {
  return renderChild({
    annotations,
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
    type,
  })
}
