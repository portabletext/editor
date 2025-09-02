import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {uniq} from 'lodash'
import {useContext, useMemo, useRef, type ReactElement} from 'react'
import {useSlateStatic, type RenderLeafProps} from 'slate-react'
import {
  getFocusSpan,
  isOverlappingSelection,
  isSelectionCollapsed,
} from '../../selectors'
import type {
  EditorSelection,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {getEditorSnapshot} from '../editor-selector'

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

  /**
   * A span is considered focused if the selection is collapsed and the caret
   * is inside the span.
   */
  const focused = useSelector(editorActor, (editorActorSnapshot) => {
    const snapshot = getEditorSnapshot({
      editorActorSnapshot,
      slateEditorInstance: slateEditor,
    })

    if (!snapshot.context.selection) {
      return false
    }

    if (!isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusedSpan = getFocusSpan(snapshot)

    if (!focusedSpan) {
      return false
    }

    return focusedSpan.node._key === props.leaf._key
  })

  /**
   * A span is considered selected if editor selection is overlapping with the
   * span selection points.
   */
  const selected = useSelector(editorActor, (editorActorSnapshot) => {
    const snapshot = getEditorSnapshot({
      editorActorSnapshot,
      slateEditorInstance: slateEditor,
    })

    if (!snapshot.context.selection) {
      return false
    }

    const parent = props.children.props.parent
    const block =
      parent && isTextBlock(snapshot.context, parent) ? parent : undefined
    const spanSelection: EditorSelection = block
      ? {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: props.leaf._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: props.leaf._key}],
            offset: props.leaf.text.length,
          },
        }
      : null

    return isOverlappingSelection(spanSelection)(snapshot)
  })

  const parent = props.children.props.parent
  const block = parent && slateEditor.isTextBlock(parent) ? parent : undefined

  const path = useMemo(
    () =>
      block
        ? [{_key: block._key}, 'children', {_key: props.leaf._key}]
        : undefined,
    [block, props.leaf._key],
  )

  const decoratorSchemaTypes = editorActor
    .getSnapshot()
    .context.schema.decorators.map((decorator) => decorator.name)

  const decorators = uniq(
    (props.leaf.marks ?? []).filter((mark) =>
      decoratorSchemaTypes.includes(mark),
    ),
  )

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
        <props.renderDecorator
          editorElementRef={spanRef}
          focused={focused}
          path={path}
          selected={selected}
          schemaType={legacyDecoratorSchemaType}
          value={mark}
          type={legacyDecoratorSchemaType}
        >
          {children}
        </props.renderDecorator>
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
            <props.renderAnnotation
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
            </props.renderAnnotation>
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
        <props.renderChild
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
        </props.renderChild>
      )
    }
  }

  return (
    <span {...props.attributes} ref={spanRef}>
      {children}
    </span>
  )
}
