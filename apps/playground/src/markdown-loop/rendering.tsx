import {
  defineAnnotation,
  defineBlockObject,
  defineDecorator,
  defineTextBlock,
  useEditor,
  type AnnotationRenderProps,
  type BlockObjectRenderProps,
  type BlockPath,
  type DecoratorRenderProps,
  type RenderPlaceholderFunction,
  type TextBlockRenderProps,
} from '@portabletext/editor'
import {CheckIcon} from 'lucide-react'
import type {JSX} from 'react'
import {tv} from 'tailwind-variants'
import {
  CommentAnnotationSchema,
  LinkAnnotationSchema,
} from '../playground-schema-definition'
import {ListItemBlock} from '../plugins/list-item-block'

/**
 * Page-local mirrors of `editor.tsx`'s style, decorator, annotation and
 * block-object renders. Selection/focus styling needs nothing from the
 * playground machine: `selected`/`focused` arrive on every block's own
 * render props, so it is reproduced here directly. The actual machine
 * coupling in `editor.tsx` is the *toggling*: `enableDragHandles`,
 * `flags.dndPlugin`, and which block-type plugins mount at all read the
 * playground machine's `featureFlags` context, which this standalone
 * loop has none of, so it hardcodes one fixed set instead.
 */

export const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-gray-400 dark:text-gray-500">Type something</span>
)

const styleRenderers = new Map<
  string,
  (props: {
    attributes?: TextBlockRenderProps['attributes']
    children: React.ReactNode
  }) => JSX.Element
>([
  [
    'normal',
    (props) => (
      <p {...props.attributes} className="my-1">
        {props.children}
      </p>
    ),
  ],
  [
    'h1',
    (props) => (
      <h1 {...props.attributes} className="my-1 font-bold text-3xl">
        {props.children}
      </h1>
    ),
  ],
  [
    'h2',
    (props) => (
      <h2 {...props.attributes} className="my-1 font-bold text-2xl">
        {props.children}
      </h2>
    ),
  ],
  [
    'h3',
    (props) => (
      <h3 {...props.attributes} className="my-1 font-bold text-xl">
        {props.children}
      </h3>
    ),
  ],
  [
    'h4',
    (props) => (
      <h4 {...props.attributes} className="my-1 font-bold text-lg">
        {props.children}
      </h4>
    ),
  ],
  [
    'h5',
    (props) => (
      <h5 {...props.attributes} className="my-1 font-bold text-base">
        {props.children}
      </h5>
    ),
  ],
  [
    'h6',
    (props) => (
      <h6 {...props.attributes} className="my-1 font-bold text-sm">
        {props.children}
      </h6>
    ),
  ],
  [
    'blockquote',
    (props) => (
      <blockquote
        {...props.attributes}
        className="my-1 pl-2 py-1 border-gray-300 dark:border-gray-600 border-l-4"
      >
        {props.children}
      </blockquote>
    ),
  ],
])

function TaskListCheckbox(props: {
  block: TextBlockRenderProps['node']
  path: BlockPath
}): JSX.Element {
  const editor = useEditor()
  const checked = (props.block as {checked?: boolean}).checked === true

  return (
    <button
      type="button"
      contentEditable={false}
      className="inline-flex items-center justify-center size-4 align-middle shrink-0 border border-gray-400 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors data-[checked=true]:bg-blue-500 data-[checked=true]:border-blue-500 data-[checked=true]:text-white"
      data-checked={checked}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={() => {
        editor.send({
          type: 'block.set',
          props: {checked: !checked},
          at: props.path,
        })
      }}
      aria-label={checked ? 'Mark task as not done' : 'Mark task as done'}
    >
      {checked ? <CheckIcon className="size-3" /> : null}
    </button>
  )
}

export const markdownLoopTextBlock = defineTextBlock({
  type: 'block',
  render: (props) => <MarkdownLoopTextBlock {...props} />,
})

function MarkdownLoopTextBlock(props: TextBlockRenderProps): JSX.Element {
  if (props.path.length > 1) {
    return <div {...props.attributes}>{props.children}</div>
  }

  const style = styleRenderers.get(props.node.style ?? 'normal')

  if (props.node.listItem !== undefined) {
    const styledChildren = style
      ? style({children: props.children})
      : props.children
    const checked = (props.node as {checked?: boolean}).checked === true
    const children =
      props.node.listItem === 'task' ? (
        <span
          className="flex items-center gap-2 data-[checked=true]:text-gray-400 data-[checked=true]:line-through [&>*:last-child]:flex-1"
          data-checked={checked}
        >
          <TaskListCheckbox block={props.node} path={props.path as BlockPath} />
          {styledChildren}
        </span>
      ) : (
        styledChildren
      )

    return (
      <ListItemBlock
        attributes={props.attributes}
        node={props.node}
        path={props.path}
      >
        {children}
      </ListItemBlock>
    )
  }

  // The wrapper is unconditional: the engine's placeholder anchors
  // `absolute` to the nearest positioned ancestor.
  return (
    <div {...props.attributes} className="relative">
      {style ? style({children: props.children}) : props.children}
    </div>
  )
}

const breakLineStyle = tv({
  base: 'h-px w-full max-w-md bg-gray-300 dark:bg-gray-600 transition-colors',
  variants: {
    selected: {
      true: 'h-0.5 bg-blue-400 dark:bg-blue-500',
    },
    focused: {
      true: 'h-0.5 bg-blue-500 dark:bg-blue-400',
    },
  },
})

const imageStyle = tv({
  base: 'grid grid-cols-[auto_1fr] my-1 items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-50 dark:bg-blue-900/30'},
  },
})

export const blockObjectFallback = defineBlockObject({
  type: '*',
  render: (props) => <MarkdownLoopBlockObject {...props} />,
})

function MarkdownLoopBlockObject(props: BlockObjectRenderProps): JSX.Element {
  if (props.node._type === 'break') {
    return (
      <div {...props.attributes}>
        {props.children}
        <div
          contentEditable={false}
          className="my-6 flex items-center justify-center"
        >
          <div
            className={breakLineStyle({
              selected: props.selected,
              focused: props.focused,
            })}
          />
        </div>
      </div>
    )
  }

  if (props.node._type === 'image') {
    const image = props.node as {src?: string; alt?: string}
    return (
      <div {...props.attributes}>
        {props.children}
        <div
          contentEditable={false}
          className={imageStyle({
            selected: props.selected,
            focused: props.focused,
          })}
        >
          <div className="bg-gray-100 dark:bg-gray-700 size-20 overflow-clip flex items-center justify-center">
            <img
              className="object-scale-down max-w-full"
              src={image.src}
              alt={image.alt ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1 p-1 overflow-hidden">
            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
              {image.src}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {image.alt}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return props.renderDefault(props)
}

const decoratorRenderers = new Map<
  string,
  (props: DecoratorRenderProps) => JSX.Element
>([
  ['strong', (props) => <strong>{props.children}</strong>],
  ['em', (props) => <em>{props.children}</em>],
  [
    'code',
    (props) => (
      <code className="font-mono text-sm bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded px-1 py-0.5 border border-gray-200 dark:border-gray-700">
        {props.children}
      </code>
    ),
  ],
  [
    'underline',
    (props) => (
      <span style={{textDecoration: 'underline'}}>{props.children}</span>
    ),
  ],
  [
    'strike-through',
    (props) => (
      <span style={{textDecorationLine: 'line-through'}}>{props.children}</span>
    ),
  ],
  ['subscript', (props) => <sub>{props.children}</sub>],
  ['superscript', (props) => <sup>{props.children}</sup>],
])

export const decoratorNode = defineDecorator({
  type: '*',
  render: (props) =>
    (
      decoratorRenderers.get(props.decorator) ??
      ((fallback) => fallback.children)
    )(props),
})

export const annotationNode = defineAnnotation({
  type: '*',
  render: (props: AnnotationRenderProps) => {
    if (
      CommentAnnotationSchema.safeParse({
        schemaType: {name: props.annotation._type},
        value: props.annotation,
      }).success
    ) {
      return (
        <span className="bg-yellow-300 dark:bg-yellow-700">
          {props.children}
        </span>
      )
    }

    if (
      LinkAnnotationSchema.safeParse({
        schemaType: {name: props.annotation._type},
        value: props.annotation,
      }).success
    ) {
      return (
        <span className="text-blue-800 dark:text-blue-400 underline">
          {props.children}
        </span>
      )
    }

    return props.children
  },
})
