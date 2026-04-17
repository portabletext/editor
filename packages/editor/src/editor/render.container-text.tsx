import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import React, {
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import {getNodes} from '../node-traversal/get-nodes'
import {serializePath} from '../paths/serialize-path'
import {IS_ANDROID} from '../slate/dom/utils/environment'
import {isTextDecorationsEqual} from '../slate/dom/utils/range-list'
import {MARK_PLACEHOLDER_SYMBOL} from '../slate/dom/utils/symbols'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {Editor} from '../slate/interfaces/editor'
import type {Path} from '../slate/interfaces/path'
import type {DecoratedRange, LeafPosition} from '../slate/interfaces/text'
import {parentPath as getParentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {useDecorations} from '../slate/react/hooks/use-decorations'
import {useIsomorphicLayoutEffect} from '../slate/react/hooks/use-isomorphic-layout-effect'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import {getTextDecorations} from '../slate/text/get-text-decorations'
import {textEquals} from '../slate/text/text-equals'
import type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  RangeDecoration,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import {RenderLegacyCallbacksContext} from './render-legacy-callbacks-context'
import {RenderMarkContext} from './render-mark-context'
import {buildScopedName, lookupScopedConfig} from './scoped-config-lookup'
import {SelectionStateContext} from './selection-state-context'

const ContainerTextComponent = (props: {
  decorations: DecoratedRange[]
  isLast: boolean
  parent: PortableTextTextBlock
  path: Path
  text: PortableTextSpan
}) => {
  const {decorations: parentDecorations, isLast, parent, path, text} = props

  const decorations = useDecorations(text, path, parentDecorations)
  const decoratedLeaves = getTextDecorations(text, decorations)
  const editorActor = useContext(EditorActorContext)
  const containerScope = useContext(ContainerScopeContext)
  const dataPath = serializePath(path)

  const useLegacyPipeline = !containerScope

  if (useLegacyPipeline) {
    const children = []

    for (let i = 0; i < decoratedLeaves.length; i++) {
      const {leaf, position} = decoratedLeaves[i]!

      children.push(
        <LegacyLeafSelection
          key={`${text._key}-${i}`}
          isLast={isLast && i === decoratedLeaves.length - 1}
          leaf={leaf}
          leafPosition={position}
          text={text}
          path={path}
          parent={parent}
        />,
      )
    }

    return (
      <span
        data-slate-node="text"
        data-pt-path={dataPath}
        data-child-key={text._key}
        data-child-name={text._type}
        data-child-type="span"
      >
        {children}
      </span>
    )
  }

  const spanScopedName = buildScopedName(containerScope, 'block.span')

  const leafConfig = lookupScopedConfig(
    editorActor.getSnapshot().context.leafConfigs,
    spanScopedName,
  )

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
    <span data-pt-leaf="" data-pt-path={dataPath}>
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
      next.text === prev.text &&
      isTextDecorationsEqual(next.decorations, prev.decorations)
    )
  },
)

export default MemoizedContainerText

const PLACEHOLDER_STYLE: CSSProperties = {
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
  const {renderDecorator, renderAnnotation} = useContext(RenderMarkContext)
  const {renderPlaceholder} = useContext(RenderLegacyCallbacksContext)
  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const focused = selectionState.focusedLeafPath === serializedPath
  const selected = selectionState.selectedLeafPaths.has(serializedPath)
  const leafRef = useRef<HTMLElement>(null)

  const leafText = leaf.text ?? ''

  let children: ReactElement

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
    children = (
      <span data-pt-zero-width="z" data-pt-length={0}>
        {'\uFEFF'}
      </span>
    )
  } else if (isLast && leafText.slice(-1) === '\n') {
    children = <ContainerTextString text={leafText} isTrailing />
  } else {
    children = <ContainerTextString text={leafText} />
  }

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
  const ref = useRef<HTMLSpanElement>(null)
  const getTextContent = () => `${text ?? ''}${isTrailing ? '\n' : ''}`
  const [initialText] = useState(getTextContent)

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

type LegacyLeafProps = {
  focused: boolean
  isLast: boolean
  leaf: PortableTextSpan & {
    placeholder?: boolean
    rangeDecoration?: RangeDecoration
  }
  leafPosition?: LeafPosition
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  selected: boolean
  text: PortableTextSpan
}

type LegacyLeafSelectionProps = Omit<LegacyLeafProps, 'focused' | 'selected'>

const LegacyLeafSelection = (props: LegacyLeafSelectionProps) => {
  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const focused = selectionState.focusedLeafPath === serializedPath
  const selected = selectionState.selectedLeafPaths.has(serializedPath)

  return <LegacyLeaf {...props} focused={focused} selected={selected} />
}

const LegacyLeafComponent = (props: LegacyLeafProps) => {
  const {focused, leaf, isLast, text, parent, path, selected} = props

  const stringChildren: ReactElement = (
    <LegacyString
      isLast={isLast}
      leaf={leaf}
      parent={parent}
      path={path}
      text={text}
    />
  )

  return (
    <LegacyLeafMarks
      focused={focused}
      leaf={leaf}
      parent={parent}
      path={path}
      selected={selected}
      text={text}
    >
      {stringChildren}
    </LegacyLeafMarks>
  )
}

type LegacyLeafMarksProps = {
  children: ReactElement
  focused: boolean
  leaf: PortableTextSpan & {
    placeholder?: boolean
    rangeDecoration?: RangeDecoration
  }
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  selected: boolean
  text: PortableTextSpan
}

const LegacyLeafMarks = (props: LegacyLeafMarksProps) => {
  const {focused, leaf, parent, path, selected, text} = props
  const editorActor = useContext(EditorActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const {renderAnnotation, renderDecorator} = useContext(RenderMarkContext)
  const {renderChild, renderPlaceholder: placeholderRenderer} = useContext(
    RenderLegacyCallbacksContext,
  )
  const spanRef = useRef<HTMLElement>(null)

  let children: ReactElement = props.children

  if (leaf._type !== schema.span.name) {
    return (
      <span data-slate-leaf="true" data-pt-leaf="" ref={spanRef}>
        {children}
      </span>
    )
  }

  const block = parent && isTextBlock({schema}, parent) ? parent : undefined

  const decoratorNames = schema.decorators.map((decorator) => decorator.name)

  const decorators = [
    ...new Set(
      (leaf.marks ?? []).filter((mark) => decoratorNames.includes(mark)),
    ),
  ]

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

  for (const mark of decorators) {
    const decoratorSchemaType = schema.decorators.find(
      (decorator) => decorator.name === mark,
    )

    if (decoratorSchemaType && renderDecorator) {
      children = (
        <LegacyRenderDecorator
          renderDecorator={renderDecorator}
          editorElementRef={spanRef}
          focused={focused}
          path={path}
          selected={selected}
          schemaType={decoratorSchemaType}
          value={mark}
        >
          {children}
        </LegacyRenderDecorator>
      )
    }
  }

  for (const annotationMarkDef of annotationMarkDefs) {
    const annotationSchemaType = schema.annotations.find(
      (type) => type.name === annotationMarkDef._type,
    )
    if (annotationSchemaType) {
      if (block && renderAnnotation) {
        children = (
          <span ref={spanRef}>
            <LegacyRenderAnnotation
              renderAnnotation={renderAnnotation}
              block={block}
              editorElementRef={spanRef}
              focused={focused}
              path={path}
              selected={selected}
              schemaType={annotationSchemaType}
              value={annotationMarkDef}
            >
              {children}
            </LegacyRenderAnnotation>
          </span>
        )
      } else {
        children = <span ref={spanRef}>{children}</span>
      }
    }
  }

  if (block && renderChild) {
    const child = block.children.find(
      (candidate) => candidate._key === leaf._key,
    )

    if (child) {
      const spanSchemaType = {
        name: schema.span.name,
        fields: [],
      } as const

      children = (
        <LegacyRenderChild
          renderChild={renderChild}
          annotations={annotationMarkDefs}
          editorElementRef={spanRef}
          focused={focused}
          path={path}
          schemaType={spanSchemaType}
          selected={selected}
          value={child}
        >
          {children}
        </LegacyRenderChild>
      )
    }
  }

  let renderedSpan: ReactElement = (
    <span data-slate-leaf="true" data-pt-leaf="" ref={spanRef}>
      {children}
    </span>
  )

  if (placeholderRenderer && leaf.placeholder && text.text === '') {
    return (
      <>
        <span style={PLACEHOLDER_STYLE} contentEditable={false}>
          {placeholderRenderer()}
        </span>
        {renderedSpan}
      </>
    )
  }

  if (leaf.rangeDecoration) {
    renderedSpan = leaf.rangeDecoration.component({children: renderedSpan})
  }

  return renderedSpan
}

const LegacyLeaf = React.memo(LegacyLeafComponent, (prev, next) => {
  return (
    next.parent === prev.parent &&
    next.isLast === prev.isLast &&
    next.focused === prev.focused &&
    next.selected === prev.selected &&
    pathEquals(next.path, prev.path) &&
    next.text === prev.text &&
    textEquals(next.leaf, prev.leaf)
  )
})
function LegacyRenderDecorator({
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

function LegacyRenderAnnotation({
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

function LegacyRenderChild({
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

function getLegacyStringContent(editor: Editor, path: Path): string {
  const start = editorStart(editor, path)
  const end = editorEnd(editor, path)
  let text = ''

  for (const {node, path: nodePath} of getNodes(editor, {
    from: start.path,
    to: end.path,
    match: (n) => isSpan({schema: editor.schema}, n),
  })) {
    if (!isSpan({schema: editor.schema}, node)) {
      continue
    }
    let nodeText = node.text
    if (pathEquals(nodePath, end.path)) {
      nodeText = nodeText.slice(0, end.offset)
    }
    if (pathEquals(nodePath, start.path)) {
      nodeText = nodeText.slice(start.offset)
    }
    text += nodeText
  }

  return text
}

const LegacyString = (props: {
  isLast: boolean
  leaf: PortableTextSpan
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  text: PortableTextSpan
}) => {
  const {isLast, leaf, parent, path, text} = props
  const editor = useSlateStatic()
  const parentPath = getParentPath(path)
  const isMarkPlaceholder = Boolean((leaf as any)[MARK_PLACEHOLDER_SYMBOL])
  const leafText = leaf.text ?? ''

  if (
    leafText === '' &&
    isTextBlock({schema: editor.schema}, parent) &&
    parent.children[parent.children.length - 1] === text &&
    getLegacyStringContent(editor, parentPath) === ''
  ) {
    return (
      <LegacyZeroWidthString
        isLineBreak
        isMarkPlaceholder={isMarkPlaceholder}
      />
    )
  }

  if (leafText === '') {
    return <LegacyZeroWidthString isMarkPlaceholder={isMarkPlaceholder} />
  }

  if (isLast && leafText.slice(-1) === '\n') {
    return <LegacyTextString isTrailing text={leafText} />
  }

  return <LegacyTextString text={leafText} />
}

const LegacyTextString = (props: {text: string; isTrailing?: boolean}) => {
  const {text, isTrailing = false} = props
  const ref = useRef<HTMLSpanElement>(null)
  const getTextContent = () => {
    return `${text ?? ''}${isTrailing ? '\n' : ''}`
  }
  const [initialText] = useState(getTextContent)

  useIsomorphicLayoutEffect(() => {
    const textWithTrailing = getTextContent()

    if (ref.current && ref.current.textContent !== textWithTrailing) {
      ref.current.textContent = textWithTrailing
    }
  })

  return (
    <MemoizedLegacyTextString ref={ref}>{initialText}</MemoizedLegacyTextString>
  )
}

const MemoizedLegacyTextString = React.memo(
  React.forwardRef<HTMLSpanElement, {children: string}>((props, ref) => {
    return (
      <span data-slate-string data-pt-string ref={ref}>
        {props.children}
      </span>
    )
  }),
)

const LegacyZeroWidthString = (props: {
  length?: number
  isLineBreak?: boolean
  isMarkPlaceholder?: boolean
}) => {
  const {length = 0, isLineBreak = false, isMarkPlaceholder = false} = props

  const attributes: {
    'data-slate-zero-width': string
    'data-slate-length': number
    'data-pt-zero-width': string
    'data-pt-length': number
    'data-slate-mark-placeholder'?: boolean
  } = {
    'data-slate-zero-width': isLineBreak ? 'n' : 'z',
    'data-slate-length': length,
    'data-pt-zero-width': isLineBreak ? 'n' : 'z',
    'data-pt-length': length,
  }

  if (isMarkPlaceholder) {
    attributes['data-slate-mark-placeholder'] = true
  }

  return (
    <span {...attributes}>
      {!IS_ANDROID || !isLineBreak ? '\uFEFF' : null}
      {isLineBreak ? <br /> : null}
    </span>
  )
}
