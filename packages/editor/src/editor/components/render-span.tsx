import {useSelector} from '@xstate/react'
import {isEqual, uniq} from 'lodash'
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import {useSelected, useSlateStatic, type RenderLeafProps} from 'slate-react'
import type {
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {usePortableTextEditor} from '../hooks/usePortableTextEditor'
import {PortableTextEditor} from '../PortableTextEditor'

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
  const portableTextEditor = usePortableTextEditor()
  const blockSelected = useSelected()
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState(false)

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

  const shouldTrackSelectionAndFocus =
    annotationMarkDefs.length > 0 && blockSelected

  useEffect(() => {
    if (!shouldTrackSelectionAndFocus) {
      setFocused(false)
      return
    }

    const sel = PortableTextEditor.getSelection(portableTextEditor)

    if (
      sel &&
      isEqual(sel.focus.path, path) &&
      PortableTextEditor.isCollapsedSelection(portableTextEditor)
    ) {
      startTransition(() => {
        setFocused(true)
      })
    }
  }, [shouldTrackSelectionAndFocus, path, portableTextEditor])

  // Function to check if this leaf is currently inside the user's text selection
  const setSelectedFromRange = useCallback(() => {
    if (!shouldTrackSelectionAndFocus) {
      return
    }

    const winSelection = window.getSelection()

    if (!winSelection) {
      setSelected(false)
      return
    }

    if (winSelection && winSelection.rangeCount > 0) {
      const range = winSelection.getRangeAt(0)

      if (spanRef.current && range.intersectsNode(spanRef.current)) {
        setSelected(true)
      } else {
        setSelected(false)
      }
    } else {
      setSelected(false)
    }
  }, [shouldTrackSelectionAndFocus])

  useEffect(() => {
    if (!shouldTrackSelectionAndFocus) {
      return undefined
    }

    const onBlur = editorActor.on('blurred', () => {
      setFocused(false)
      setSelected(false)
    })

    const onFocus = editorActor.on('focused', () => {
      const sel = PortableTextEditor.getSelection(portableTextEditor)

      if (
        sel &&
        isEqual(sel.focus.path, path) &&
        PortableTextEditor.isCollapsedSelection(portableTextEditor)
      ) {
        setFocused(true)
      }

      setSelectedFromRange()
    })

    const onSelection = editorActor.on('selection', (event) => {
      if (
        event.selection &&
        isEqual(event.selection.focus.path, path) &&
        PortableTextEditor.isCollapsedSelection(portableTextEditor)
      ) {
        setFocused(true)
      } else {
        setFocused(false)
      }
      setSelectedFromRange()
    })

    return () => {
      onBlur.unsubscribe()
      onFocus.unsubscribe()
      onSelection.unsubscribe()
    }
  }, [
    editorActor,
    path,
    portableTextEditor,
    setSelectedFromRange,
    shouldTrackSelectionAndFocus,
  ])

  useEffect(() => setSelectedFromRange(), [setSelectedFromRange])

  let children = props.children

  /**
   * Support `renderDecorator` render function for each Decorator
   */
  for (const mark of decorators) {
    const legacyDecoratorSchemaType = legacySchema.decorators.find(
      (dec) => dec.value === mark,
    )

    if (path && legacyDecoratorSchemaType && props.renderDecorator) {
      children = props.renderDecorator({
        children: children,
        editorElementRef: spanRef,
        focused,
        path,
        selected,
        schemaType: legacyDecoratorSchemaType,
        value: mark,
        type: legacyDecoratorSchemaType,
      })
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
            {props.renderAnnotation({
              block,
              children: children,
              editorElementRef: spanRef,
              focused,
              path,
              selected,
              schemaType: legacyAnnotationSchemaType,
              value: annotationMarkDef,
              type: legacyAnnotationSchemaType,
            })}
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
      children = props.renderChild({
        annotations: annotationMarkDefs,
        children: children,
        editorElementRef: spanRef,
        focused,
        path,
        schemaType: legacySchema.span,
        selected,
        value: child,
        type: legacySchema.span,
      })
    }
  }

  return (
    <span {...props.attributes} ref={spanRef}>
      {children}
    </span>
  )
}
