import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, useMemo, useRef, type ReactElement} from 'react'
import {useSlateStatic, type RenderLeafProps} from 'slate-react'
import {
  findMatchingRenderer,
  useAllRenderers,
  useRenderers,
} from '../renderers/use-renderer'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {isOverlappingSelection} from '../selectors/selector.is-overlapping-selection'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  EditorSelection,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'

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

  // Get registered renderers
  const registeredRenderers = useAllRenderers()
  const spanRenderers = useRenderers('inline', 'span')

  // Lazy snapshot getter - only compute when guards need it
  const getSnapshot = () =>
    getEditorSnapshot({
      editorActorSnapshot: editorActor.getSnapshot(),
      slateEditorInstance: slateEditor,
    })

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
   * Registered renderers take priority
   */
  for (const mark of decorators) {
    // Check for registered decorator renderer first (with guard evaluation)
    const decoratorRenderers = registeredRenderers.filter(
      (config) =>
        config.renderer.type === 'decorator' && config.renderer.name === mark,
    )
    const decoratorMatch = findMatchingRenderer(
      decoratorRenderers,
      mark,
      getSnapshot,
    )

    if (decoratorMatch) {
      const currentChildren = children
      const renderDefault = () => currentChildren
      children = decoratorMatch.renderer.renderer.render(
        {
          node: mark,
          children,
          renderDefault,
        },
        decoratorMatch.guardResponse,
      )
      continue
    }

    // Fall back to renderDecorator prop
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
   * Registered renderers take priority
   */
  for (const annotationMarkDef of annotationMarkDefs) {
    // Check for registered annotation renderer first (with guard evaluation)
    const annotationRenderers = registeredRenderers.filter(
      (config) =>
        config.renderer.type === 'annotation' &&
        config.renderer.name === annotationMarkDef._type,
    )
    const annotationMatch = findMatchingRenderer(
      annotationRenderers,
      annotationMarkDef,
      getSnapshot,
    )

    if (annotationMatch) {
      const currentChildren = children
      const renderDefault = () => currentChildren
      children = (
        <span ref={spanRef}>
          {annotationMatch.renderer.renderer.render(
            {
              node: annotationMarkDef,
              children,
              renderDefault,
            },
            annotationMatch.guardResponse,
          )}
        </span>
      )
      continue
    }

    // Fall back to renderAnnotation prop
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
   * Support registered span renderer (type: 'inline', name: 'span')
   * This takes priority over the legacy renderChild prop
   */
  const spanNode = {
    _key: props.leaf._key,
    _type: 'span' as const,
    text: props.leaf.text,
    marks: props.leaf.marks ?? [],
  }

  // Find matching span renderer (first whose guard passes)
  const spanMatch = findMatchingRenderer(spanRenderers, spanNode, getSnapshot)

  if (spanMatch) {
    const currentChildren = children
    const renderDefault = () => (
      <span {...props.attributes} ref={spanRef}>
        {currentChildren}
      </span>
    )

    const renderHidden = () => (
      <span {...props.attributes} style={{display: 'none'}}>
        {props.children}
      </span>
    )

    return spanMatch.renderer.renderer.render(
      {
        attributes: props.attributes,
        children: currentChildren,
        node: spanNode,
        renderDefault,
        renderHidden,
      },
      spanMatch.guardResponse,
    )
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
