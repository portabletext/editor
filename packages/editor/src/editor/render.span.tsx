import type {
  InlineObjectSchemaType,
  PortableTextSpan,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import type {RenderLeafProps} from '../engine/react/components/editable'
import {serializePath} from '../paths/serialize-path'
import type {
  AnnotationRenderProps,
  DecoratorRenderProps,
  SpanRenderProps,
} from '../renderers/renderer.types'
import type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {
  findPositionalAnnotationOverride,
  findPositionalDecoratorOverride,
} from './find-positional-override'
import {NewPipelineContext} from './new-pipeline-context'
import {ParentTextBlockContext} from './parent-text-block-context'
import {
  renderDefaultAnnotation,
  renderDefaultDecorator,
  renderDefaultSpan,
} from './render.default'
import {
  useAnnotationConfigs,
  useDecoratorConfigs,
  useSpanConfig,
} from './render.leaf-config'
import {useIsFocusedLeaf, useIsSelectedLeaf} from './selection-state-context'
import {useBlockSubSchema} from './use-block-sub-schema'

interface RenderSpanProps extends RenderLeafProps {
  children: ReactElement<any>
  renderAnnotation?: RenderAnnotationFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  readOnly: boolean
  schema: EditorSchema
}

export function RenderSpan(props: RenderSpanProps) {
  const schema = props.schema
  const spanRef = useRef<HTMLElement>(null)
  const schemaType = {
    name: schema.span.name,
    fields: [],
  } satisfies InlineObjectSchemaType

  const parent = props.children.props.parent
  const block = parent && isTextBlock({schema}, parent) ? parent : undefined
  const child = block?.children.find(
    (_child) => _child._key === props.leaf._key,
  )

  const subSchema = useBlockSubSchema(props.path)
  // Span leafs are looked up against the resolved span child. When no child
  // is found (transient state), fall back to the engine leaf for identity.
  const spanConfig = useSpanConfig(child ?? props.leaf, props.path)
  const decoratorConfigs = useDecoratorConfigs()
  const annotationConfigs = useAnnotationConfigs()
  const parentTextBlock = useContext(ParentTextBlockContext)

  const isInNewPipeline = useContext(NewPipelineContext)
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedLeaf(serializedPath)
  const selected = useIsSelectedLeaf(serializedPath)

  const decoratorSchemaTypes = subSchema.decorators.map(
    (decorator) => decorator.name,
  )

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
   * Support registered decorators, falling back to the legacy
   * `renderDecorator` render function, for each Decorator mark.
   */
  for (const mark of decorators) {
    const decoratorSchemaType = subSchema.decorators.find(
      (dec) => dec.name === mark,
    )
    if (!decoratorSchemaType) {
      continue
    }

    const globalDecoratorConfig =
      decoratorConfigs.get(mark) ?? decoratorConfigs.get('*')
    const positionalDecorator = findPositionalDecoratorOverride(
      parentTextBlock,
      mark,
    )
    // Positional present: undefined render falls through to global;
    // function render is used at this position.
    const decoratorConfig = positionalDecorator
      ? positionalDecorator.decorator.render === undefined
        ? globalDecoratorConfig
        : positionalDecorator
      : globalDecoratorConfig

    if (decoratorConfig) {
      const render = decoratorConfig.decorator.render
      const renderProps: DecoratorRenderProps = {
        children,
        decorator: mark,
        focused,
        path: props.path,
        readOnly: props.readOnly,
        renderDefault: renderDefaultDecorator,
        selected,
      }
      children = render
        ? render(renderProps)
        : renderDefaultDecorator(renderProps)
      continue
    }

    if (props.renderDecorator) {
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
   * Support registered annotations, falling back to the legacy
   * `renderAnnotation` render function, for each Annotation markDef.
   * The `<span ref>` anchor is unconditional whenever the markDef's
   * `_type` is a known annotation, independent of which render fires.
   */
  for (const annotationMarkDef of annotationMarkDefs) {
    const annotationSchemaType = subSchema.annotations.find(
      (t) => t.name === annotationMarkDef._type,
    )
    if (annotationSchemaType) {
      const globalAnnotationConfig =
        annotationConfigs.get(annotationMarkDef._type) ??
        annotationConfigs.get('*')
      const positionalAnnotation = findPositionalAnnotationOverride(
        parentTextBlock,
        annotationMarkDef._type,
      )
      // Positional present: undefined render falls through to global;
      // function render is used at this position.
      const annotationConfig = positionalAnnotation
        ? positionalAnnotation.annotation.render === undefined
          ? globalAnnotationConfig
          : positionalAnnotation
        : globalAnnotationConfig

      if (annotationConfig) {
        const render = annotationConfig.annotation.render
        const renderProps: AnnotationRenderProps = {
          children,
          focused,
          annotation: annotationMarkDef,
          path: props.path,
          readOnly: props.readOnly,
          renderDefault: renderDefaultAnnotation,
          selected,
        }
        children = (
          <span ref={spanRef}>
            {render
              ? render(renderProps)
              : renderDefaultAnnotation(renderProps)}
          </span>
        )
        continue
      }

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
  if (block && props.renderChild && child && !spanConfig && !isInNewPipeline) {
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

  if (spanConfig) {
    const render = spanConfig.span.render
    const renderProps: SpanRenderProps = {
      attributes: props.attributes,
      children,
      focused,
      node: (child ?? props.leaf) as PortableTextSpan,
      path: props.path,
      readOnly: props.readOnly,
      renderDefault: renderDefaultSpan,
      selected,
    }
    return render ? render(renderProps) : renderDefaultSpan(renderProps)
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
