import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import React, {useContext, useRef, type JSX, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import {isTextDecorationsEqual} from '../slate/dom/utils/range-list'
import type {Path} from '../slate/interfaces/path'
import type {DecoratedRange} from '../slate/interfaces/text'
import {pathEquals} from '../slate/path/path-equals'
import type {RenderPlaceholderProps} from '../slate/react/components/editable'
import {useDecorations} from '../slate/react/hooks/use-decorations'
import {useIsomorphicLayoutEffect} from '../slate/react/hooks/use-isomorphic-layout-effect'
import {getTextDecorations} from '../slate/text/get-text-decorations'
import type {
  BlockAnnotationRenderProps,
  BlockDecoratorRenderProps,
  RangeDecoration,
  RenderAnnotationFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import {RenderMarkContext} from './render-mark-context'
import {buildScopedName, findByScope} from './scoped-config-lookup'
import {SelectionStateContext} from './selection-state-context'

const ContainerTextComponent = (props: {
  decorations: DecoratedRange[]
  isLast: boolean
  parent: PortableTextTextBlock
  path: Path
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  text: PortableTextSpan
}) => {
  const {decorations: parentDecorations, isLast, parent, path, text} = props

  const decorations = useDecorations(text, path, parentDecorations)
  const decoratedLeaves = getTextDecorations(text, decorations)
  const elementRef = useRef<HTMLElement>(null)
  const editorActor = useContext(EditorActorContext)
  const containerScope = useContext(ContainerScopeContext)
  const children = []

  for (let i = 0; i < decoratedLeaves.length; i++) {
    const {leaf} = decoratedLeaves[i]!

    children.push(
      <ContainerLeaf
        isLast={isLast && i === decoratedLeaves.length - 1}
        key={`${text._key}-${i}`}
        leaf={leaf}
        text={text}
        path={path}
        parent={parent}
      />,
    )
  }

  const dataPath = serializePath(path)

  const spanScopedName = buildScopedName(containerScope, 'block.span')

  const leafConfig = useSelector(editorActor, (s) =>
    findByScope(s.context.leafConfigs, spanScopedName),
  )

  const spanAttributes = {
    'data-pt-leaf': '',
    'data-pt-path': dataPath,
  }

  if (leafConfig) {
    const rendered = leafConfig.leaf.render({
      attributes: spanAttributes,
      children: <>{children}</>,
      node: text,
      path,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return (
    <span data-pt-leaf="" data-pt-path={dataPath} ref={elementRef}>
      {children}
    </span>
  )
}

const MemoizedContainerText = React.memo(
  ContainerTextComponent,
  (prev, next) => {
    return (
      next.parent === prev.parent &&
      next.isLast === prev.isLast &&
      pathEquals(next.path, prev.path) &&
      next.renderPlaceholder === prev.renderPlaceholder &&
      next.text === prev.text &&
      isTextDecorationsEqual(next.decorations, prev.decorations)
    )
  },
)

export default MemoizedContainerText

const PLACEHOLDER_STYLE: React.CSSProperties = {
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
  left: 0,
  right: 0,
}

const ContainerLeaf = (props: {
  isLast: boolean
  leaf: PortableTextSpan & {
    placeholder?: boolean
    rangeDecoration?: RangeDecoration
  }
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  text: PortableTextSpan
}) => {
  const {leaf, isLast, text, parent} = props
  const editorActor = useContext(EditorActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const {renderDecorator, renderAnnotation, renderPlaceholder} =
    useContext(RenderMarkContext)
  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const focused = selectionState.focusedLeafPath === serializedPath
  const selected = selectionState.selectedLeafPaths.has(serializedPath)
  const leafRef = useRef<HTMLElement>(null)

  const leafText = leaf.text ?? ''

  let children: ReactElement

  // Empty text in an empty block: render zero-width with line break
  if (
    leafText === '' &&
    isTextBlock({schema}, parent) &&
    parent.children[parent.children.length - 1] === text
  ) {
    children = (
      <span data-pt-zero-width="n" data-pt-length={0}>
        {'\uFEFF'}
        <br />
      </span>
    )
  } else if (leafText === '') {
    // Empty text at inline boundary: render zero-width
    children = (
      <span data-pt-zero-width="z" data-pt-length={0}>
        {'\uFEFF'}
      </span>
    )
  } else if (isLast && leafText.slice(-1) === '\n') {
    // Trailing newline: add extra newline to prevent browser collapse
    children = <ContainerTextString text={leafText} isTrailing />
  } else {
    children = <ContainerTextString text={leafText} />
  }

  // Apply decorator wrapping
  const decoratorNames = schema.decorators.map((decorator) => decorator.name)

  const decorators = [
    ...new Set(
      (leaf.marks ?? []).filter((mark) => decoratorNames.includes(mark)),
    ),
  ]

  for (const mark of decorators) {
    const decoratorSchemaType = schema.decorators.find(
      (decorator) => decorator.name === mark,
    )

    if (decoratorSchemaType && renderDecorator) {
      children = (
        <ContainerRenderDecorator
          renderDecorator={renderDecorator}
          editorElementRef={leafRef}
          focused={focused}
          path={props.path}
          selected={selected}
          schemaType={decoratorSchemaType}
          value={mark}
        >
          {children}
        </ContainerRenderDecorator>
      )
    }
  }

  // Apply annotation wrapping
  const block = parent && isTextBlock({schema}, parent) ? parent : undefined

  const annotationMarkDefs = (leaf.marks ?? []).flatMap((mark: string) => {
    if (decoratorNames.includes(mark)) {
      return []
    }

    const markDef = block?.markDefs?.find((markDef) => markDef._key === mark)

    if (markDef) {
      return [markDef]
    }

    return []
  })

  for (const annotationMarkDef of annotationMarkDefs) {
    const annotationSchemaType = schema.annotations.find(
      (type) => type.name === annotationMarkDef._type,
    )
    if (annotationSchemaType) {
      if (block && renderAnnotation) {
        children = (
          <span ref={leafRef}>
            <ContainerRenderAnnotation
              renderAnnotation={renderAnnotation}
              block={block}
              editorElementRef={leafRef}
              focused={focused}
              path={props.path}
              selected={selected}
              schemaType={annotationSchemaType}
              value={annotationMarkDef}
            >
              {children}
            </ContainerRenderAnnotation>
          </span>
        )
      } else {
        children = <span ref={leafRef}>{children}</span>
      }
    }
  }

  if (leaf.rangeDecoration) {
    children = leaf.rangeDecoration.component({children})
  }

  if (renderPlaceholder && leaf.placeholder && text.text === '') {
    return (
      <>
        <span style={PLACEHOLDER_STYLE} contentEditable={false}>
          {renderPlaceholder()}
        </span>
        {children}
      </>
    )
  }

  return children
}

function ContainerRenderDecorator({
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

function ContainerRenderAnnotation({
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

const ContainerTextString = (props: {text: string; isTrailing?: boolean}) => {
  const {text, isTrailing = false} = props
  const ref = React.useRef<HTMLSpanElement>(null)
  const getTextContent = () => `${text ?? ''}${isTrailing ? '\n' : ''}`
  const [initialText] = React.useState(getTextContent)

  useIsomorphicLayoutEffect(() => {
    const textWithTrailing = getTextContent()
    if (ref.current && ref.current.textContent !== textWithTrailing) {
      ref.current.textContent = textWithTrailing
    }
  })

  return (
    <MemoizedContainerTextString ref={ref}>
      {initialText}
    </MemoizedContainerTextString>
  )
}

const MemoizedContainerTextString = React.memo(
  React.forwardRef<HTMLSpanElement, {children: string}>((props, ref) => {
    return (
      <span data-pt-string ref={ref}>
        {props.children}
      </span>
    )
  }),
)
