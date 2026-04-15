import type {InlineObjectSchemaType} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, useRef, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {RenderLeafProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import {SelectionStateContext} from './selection-state-context'

interface RenderSpanProps extends RenderLeafProps {
  children: ReactElement<any>
  renderAnnotation?: RenderAnnotationFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  readOnly: boolean
}

export function RenderSpan(props: RenderSpanProps) {
  const slateEditor = useSlateStatic()
  const editorActor = useContext(EditorActorContext)
  const schema = useSelector(editorActor, (s) => s.context.schema)
  const spanRef = useRef<HTMLElement>(null)
  const schemaType = {
    name: schema.span.name,
    fields: [],
  } satisfies InlineObjectSchemaType

  const parent = props.children.props.parent
  const block =
    parent && isTextBlock({schema: slateEditor.schema}, parent)
      ? parent
      : undefined

  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const focused = selectionState.focusedChildPath === serializedPath
  const selected = selectionState.selectedChildPaths.has(serializedPath)

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

  const annotationMarkDefs = (props.leaf.marks ?? []).flatMap(
    (mark: string) => {
      if (decoratorSchemaTypes.includes(mark)) {
        return []
      }

      const markDef = block?.markDefs?.find((markDef) => markDef._key === mark)

      if (markDef) {
        return [markDef]
      }

      return []
    },
  )

  let children = props.children

  /**
   * Support `renderDecorator` render function for each Decorator
   */
  for (const mark of decorators) {
    const decoratorSchemaType = schema.decorators.find(
      (dec) => dec.name === mark,
    )

    if (decoratorSchemaType && props.renderDecorator) {
      children = (
        <RenderDecorator
          renderDecorator={props.renderDecorator}
          editorElementRef={spanRef}
          focused={focused}
          path={props.path}
          selected={selected}
          schemaType={decoratorSchemaType}
          value={mark}
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
    const annotationSchemaType = schema.annotations.find(
      (t) => t.name === annotationMarkDef._type,
    )
    if (annotationSchemaType) {
      if (block && props.renderAnnotation) {
        children = (
          <span ref={spanRef}>
            <RenderAnnotation
              renderAnnotation={props.renderAnnotation}
              block={block}
              editorElementRef={spanRef}
              focused={focused}
              path={props.path}
              selected={selected}
              schemaType={annotationSchemaType}
              value={annotationMarkDef}
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
  if (block && props.renderChild) {
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
          path={props.path}
          schemaType={schemaType}
          selected={selected}
          value={child}
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
  })
}
