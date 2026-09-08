import {
  defineAnnotation,
  defineBlockObject,
  defineContainer,
  defineDecorator,
  defineInlineObject,
  defineTextBlock,
  useEditor,
  type AnnotationRenderProps,
  type BlockObjectRenderProps,
  type BlockPath,
  type ContainerRenderProps,
  type DecoratorRenderProps,
  type InlineObjectRenderProps,
  type PortableTextBlock,
  type RegistrableNode,
  type RenderPlaceholderFunction,
  type TextBlockRenderProps,
} from '@portabletext/editor'
import {useListIndex} from '@portabletext/plugin-list-index'
import type {MarkdownShortcutsPluginProps} from '@portabletext/plugin-markdown-shortcuts'
import {defineTable} from '@portabletext/plugin-table'
import {referenceContainers} from '@portabletext/plugin-table/ui'
import {
  InfoIcon,
  LightbulbIcon,
  MessageSquareWarningIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type {JSX} from 'react'
import type {MarkdownBenchFeatures} from './schema'

export const markdownShortcutsProps: MarkdownShortcutsPluginProps = {
  boldDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'strong')
      ?.name,
  codeDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'code')
      ?.name,
  italicDecorator: ({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'em')
      ?.name,
  strikeThroughDecorator: ({context}) =>
    context.schema.decorators.find(
      (decorator) => decorator.name === 'strike-through',
    )?.name,
  horizontalRuleObject: ({context}) => {
    const schemaType = context.schema.blockObjects.find(
      (object) => object.name === 'horizontal-rule',
    )
    return schemaType ? {_type: schemaType.name} : undefined
  },
  linkObject: ({context, props}) => {
    const schemaType = context.schema.annotations.find(
      (annotation) => annotation.name === 'link',
    )
    const hrefField = schemaType?.fields.find(
      (field) => field.name === 'href' && field.type === 'string',
    )
    if (!schemaType || !hrefField) {
      return undefined
    }
    return {_type: schemaType.name, [hrefField.name]: props.href}
  },
  defaultStyle: ({context}) => context.schema.styles[0]?.name,
  headingStyle: ({context, props}) =>
    context.schema.styles.find((style) => style.name === `h${props.level}`)
      ?.name,
  blockquoteStyle: ({context}) =>
    context.schema.styles.find((style) => style.name === 'blockquote')?.name,
  unorderedList: ({context}) =>
    context.schema.lists.find((list) => list.name === 'bullet')?.name,
  orderedList: ({context}) =>
    context.schema.lists.find((list) => list.name === 'number')?.name,
}

export const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-gray-400 dark:text-gray-500">
    Type or paste markdown
  </span>
)

// `defineTable` registers the table type names (`table`/`row`/`cell`) in a
// module-level registry the reference UI reads from outside the render
// tree; the registration is the same regardless of `features`, so it runs
// once here rather than on every `buildEditorNodes` call.
const table = defineTable({containers: referenceContainers})

export function buildEditorNodes(features: MarkdownBenchFeatures): {
  nodes: Array<RegistrableNode>
  tablePlugin: (() => JSX.Element) | null
} {
  const nodes: Array<RegistrableNode> = [
    defineTextBlock({type: 'block', render: TextBlock}),
    defineDecorator({type: '*', render: Decorator}),
    defineAnnotation({type: 'link', render: LinkAnnotation}),
    defineBlockObject({type: 'horizontal-rule', render: HorizontalRule}),
    defineBlockObject({type: 'html', render: HtmlBlock}),
  ]

  if (features.code) {
    nodes.push(defineBlockObject({type: 'code', render: CodeBlock}))
  }
  if (features.image) {
    nodes.push(defineBlockObject({type: 'image', render: ImageBlock}))
    nodes.push(defineInlineObject({type: 'image', render: InlineImage}))
  }
  if (features.callout) {
    nodes.push(
      defineContainer({
        type: 'callout',
        arrayField: 'content',
        render: CalloutContainer,
      }),
    )
  }

  return {nodes, tablePlugin: features.table ? table.Plugin : null}
}

function TextBlock(props: TextBlockRenderProps): JSX.Element {
  if (props.node.listItem !== undefined) {
    return <ListItemBlock {...props} />
  }
  return renderStyledBlock(props.node.style, props)
}

function ListItemBlock(props: TextBlockRenderProps): JSX.Element {
  const listIndex = useListIndex(props.path)
  const checked = (props.node as {checked?: boolean}).checked === true
  const children =
    props.node.listItem === 'task' ? (
      <span
        className="flex items-center gap-2 data-[checked=true]:text-gray-400 data-[checked=true]:line-through [&>*:last-child]:flex-1"
        data-checked={checked}
      >
        <TaskListCheckbox node={props.node} path={props.path} />
        {props.children}
      </span>
    ) : (
      props.children
    )
  return (
    <div
      {...props.attributes}
      data-list-item={props.node.listItem}
      data-level={props.node.level}
      data-list-index={listIndex}
      className="my-1"
    >
      {children}
    </div>
  )
}

function TaskListCheckbox(props: {
  node: PortableTextBlock
  path: BlockPath
}): JSX.Element {
  const editor = useEditor()
  const checked = (props.node as {checked?: boolean}).checked === true
  return (
    <button
      type="button"
      contentEditable={false}
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-gray-400 align-middle transition-colors hover:bg-gray-100 data-[checked=true]:border-blue-500 data-[checked=true]:bg-blue-500 dark:border-gray-600 dark:hover:bg-gray-700"
      data-checked={checked}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() =>
        editor.send({
          type: 'block.set',
          props: {checked: !checked},
          at: props.path,
        })
      }
      aria-label={checked ? 'Mark task as not done' : 'Mark task as done'}
    >
      {checked ? <CheckMark /> : null}
    </button>
  )
}

function CheckMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3 fill-none stroke-white stroke-2"
      aria-hidden
    >
      <path d="M3 8l3 3 7-7" />
    </svg>
  )
}

function renderStyledBlock(
  style: string | undefined,
  props: TextBlockRenderProps,
): JSX.Element {
  switch (style) {
    case 'h1':
      return (
        <h1 {...props.attributes} className="my-2 font-bold text-3xl">
          {props.children}
        </h1>
      )
    case 'h2':
      return (
        <h2 {...props.attributes} className="my-2 font-bold text-2xl">
          {props.children}
        </h2>
      )
    case 'h3':
      return (
        <h3 {...props.attributes} className="my-2 font-bold text-xl">
          {props.children}
        </h3>
      )
    case 'h4':
      return (
        <h4 {...props.attributes} className="my-1 font-bold text-lg">
          {props.children}
        </h4>
      )
    case 'h5':
      return (
        <h5 {...props.attributes} className="my-1 font-bold text-base">
          {props.children}
        </h5>
      )
    case 'h6':
      return (
        <h6 {...props.attributes} className="my-1 font-bold text-sm">
          {props.children}
        </h6>
      )
    case 'blockquote':
      return (
        <blockquote
          {...props.attributes}
          className="my-1 border-l-4 border-gray-300 py-1 pl-2 dark:border-gray-600"
        >
          {props.children}
        </blockquote>
      )
    default:
      return (
        <p {...props.attributes} className="my-1">
          {props.children}
        </p>
      )
  }
}

function Decorator(props: DecoratorRenderProps): JSX.Element {
  switch (props.decorator) {
    case 'strong':
      return <strong>{props.children}</strong>
    case 'em':
      return <em>{props.children}</em>
    case 'code':
      return (
        <code className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-sm text-pink-600 dark:border-gray-700 dark:bg-gray-800 dark:text-pink-400">
          {props.children}
        </code>
      )
    case 'strike-through':
      return <span className="line-through">{props.children}</span>
    default:
      return props.children
  }
}

function LinkAnnotation(props: AnnotationRenderProps): JSX.Element {
  return (
    <span className="text-blue-700 underline dark:text-blue-400">
      {props.children}
    </span>
  )
}

function HorizontalRule(props: BlockObjectRenderProps): JSX.Element {
  return (
    <div {...props.attributes} className="my-6 flex items-center">
      {props.children}
      <div
        contentEditable={false}
        className="h-px w-full bg-gray-300 dark:bg-gray-600"
      />
    </div>
  )
}

function HtmlBlock(props: BlockObjectRenderProps): JSX.Element {
  const html = (props.node as {html?: string}).html ?? ''
  return (
    <div {...props.attributes} className="my-2">
      {props.children}
      <pre
        contentEditable={false}
        className="overflow-x-auto rounded border border-dashed border-gray-300 bg-gray-50 p-2 font-mono text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
      >
        {html}
      </pre>
    </div>
  )
}

function CodeBlock(props: BlockObjectRenderProps): JSX.Element {
  const value = props.node as {language?: string; code?: string}
  return (
    <div {...props.attributes} className="my-2">
      {props.children}
      <pre
        contentEditable={false}
        className="overflow-x-auto rounded bg-gray-100 p-2 font-mono text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      >
        {value.language ? (
          <div className="mb-1 text-gray-400 dark:text-gray-500">
            {value.language}
          </div>
        ) : null}
        <code>{value.code ?? ''}</code>
      </pre>
    </div>
  )
}

function ImageBlock(props: BlockObjectRenderProps): JSX.Element {
  const value = props.node as {src?: string; alt?: string}
  return (
    <div
      {...props.attributes}
      className="my-2 grid grid-cols-[auto_1fr] items-start gap-2 rounded border border-gray-300 p-1 dark:border-gray-600"
    >
      {props.children}
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
        <img
          src={value.src}
          alt={value.alt ?? ''}
          contentEditable={false}
          className="max-h-full max-w-full object-scale-down"
        />
      </div>
      <span className="self-center overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
        {value.alt || value.src}
      </span>
    </div>
  )
}

function InlineImage(props: InlineObjectRenderProps): JSX.Element {
  const value = props.node as {src?: string; alt?: string}
  return (
    <span
      {...props.attributes}
      className="mx-0.5 inline-flex size-5 items-center justify-center overflow-hidden rounded border border-gray-300 align-text-bottom dark:border-gray-600"
    >
      {props.children}
      <img
        src={value.src}
        alt={value.alt ?? ''}
        contentEditable={false}
        className="max-h-full max-w-full object-cover"
      />
    </span>
  )
}

const toneClassName: Record<string, string> = {
  note: 'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  tip: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  important:
    'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
  warning:
    'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  caution:
    'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

const defaultToneClassName = toneClassName.note!

function ToneIcon(props: {tone: string}): JSX.Element {
  const className = 'size-4 shrink-0'
  switch (props.tone) {
    case 'tip':
      return <LightbulbIcon aria-hidden className={className} />
    case 'important':
      return <MessageSquareWarningIcon aria-hidden className={className} />
    case 'warning':
      return <TriangleAlertIcon aria-hidden className={className} />
    case 'caution':
      return <OctagonAlertIcon aria-hidden className={className} />
    default:
      return <InfoIcon aria-hidden className={className} />
  }
}

function CalloutContainer(props: ContainerRenderProps): JSX.Element {
  const tone = typeof props.node.tone === 'string' ? props.node.tone : 'note'
  const toneStyle = toneClassName[tone] ?? defaultToneClassName
  return (
    <aside
      {...props.attributes}
      className={`my-3 flex gap-2.5 rounded-md border-l-4 p-3 ${toneStyle}`}
    >
      <span
        contentEditable={false}
        className="mt-[0.2rem] flex shrink-0 items-center justify-center"
      >
        <ToneIcon tone={tone} />
      </span>
      <div className="min-w-0 flex-1">{props.children}</div>
    </aside>
  )
}
