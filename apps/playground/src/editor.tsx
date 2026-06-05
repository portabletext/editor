import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type BlockDecoratorRenderProps,
  type BlockListItemRenderProps,
  type BlockPath,
  type BlockRenderProps,
  type BlockStyleRenderProps,
  type EditorEmittedEvent,
  type PortableTextBlock,
  type RangeDecoration,
  type RenderAnnotationFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {portableTextToMarkdown} from '@portabletext/markdown'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {OneLinePlugin} from '@portabletext/plugin-one-line'
import {PasteLinkPlugin} from '@portabletext/plugin-paste-link'
import {
  createDecoratorGuard,
  TypographyPlugin,
} from '@portabletext/plugin-typography'
import {useActorRef, useSelector} from '@xstate/react'
import {
  ActivityIcon,
  BracesIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  FileJsonIcon,
  InfoIcon,
  LayersIcon,
  LinkIcon,
  MousePointerIcon,
  PencilIcon,
  PencilOffIcon,
  TableIcon,
  XIcon,
} from 'lucide-react'
import {useContext, useEffect, useState, type JSX} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import './editor.css'
import {EditorSettingsPopover} from './editor-settings-popover'
import {EmojiPickerPlugin} from './emoji-picker'
import {
  EditorFeatureFlagsContext,
  PlaygroundFeatureFlagsContext,
  type EditorFeatureFlags,
} from './feature-flags'
import {FullscreenProvider, FullscreenToggle, useFullscreen} from './fullscreen'
import {highlightMachine} from './highlight-json-machine'
import {MentionPickerPlugin} from './mention-picker'
import type {EditorActorRef} from './playground-machine'
import {
  CommentAnnotationSchema,
  LinkAnnotationSchema,
  playgroundSchemaDefinition,
} from './playground-schema-definition'
import {CalloutPlugin} from './plugins/plugin.callout'
import {CodeBlockPlugin} from './plugins/plugin.code-block'
import {CodeEditorPlugin} from './plugins/plugin.code-editor'
import {FactBoxPlugin} from './plugins/plugin.fact-box'
import {HtmlDeserializerPlugin} from './plugins/plugin.html-deserializer'
import {ImageDeserializerPlugin} from './plugins/plugin.image-deserializer'
import {InlineObjectsPlugin} from './plugins/plugin.inline-objects'
import {markdownShortcutsPluginProps} from './plugins/plugin.markdown'
import {MarkdownDeserializerPlugin} from './plugins/plugin.markdown-deserializer'
import {PlaygroundTablePlugin} from './plugins/plugin.table-ui'
import {TextFileDeserializerPlugin} from './plugins/plugin.text-file-deserializer'
import {markdownOptions} from './previews/markdown-options'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {ErrorBoundary} from './primitives/error-boundary'
import {ErrorScreen} from './primitives/error-screen'
import {Spinner} from './primitives/spinner'
import {ToggleButton} from './primitives/toggle-button'
import {Tooltip} from './primitives/tooltip'
import {RangeDecorationButton} from './range-decoration-button'
import {SlashCommandPickerPlugin} from './slash-command-picker'
import {PortableTextToolbar} from './toolbar/portable-text-toolbar'

export function Editor(props: {
  editorRef: EditorActorRef
  rangeDecorations: RangeDecoration[]
}) {
  const value = useSelector(props.editorRef, (s) => s.context.value)
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s.context.keyGenerator,
  )
  const [loading, setLoading] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const playgroundFeatureFlags = useContext(PlaygroundFeatureFlagsContext)
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s.context.featureFlags,
  )

  return (
    <div data-testid={props.editorRef.id}>
      <ErrorBoundary
        fallbackProps={{area: 'PortableTextEditor'}}
        fallback={ErrorScreen}
        onError={console.error}
      >
        <FullscreenProvider>
          <EditorProvider
            initialConfig={{
              initialValue: value,
              keyGenerator,
              readOnly,
              schemaDefinition: playgroundSchemaDefinition,
            }}
          >
            <EditorEventListener
              editorRef={props.editorRef}
              value={value}
              on={(event) => {
                if (event.type === 'mutation') {
                  props.editorRef.send(event)
                }
                if (event.type === 'loading') {
                  setLoading(true)
                }
                if (event.type === 'done loading') {
                  setLoading(false)
                }
                if (event.type === 'editable') {
                  setReadOnly(false)
                }
                if (event.type === 'read only') {
                  setReadOnly(true)
                }
              }}
            />
            {playgroundFeatureFlags.toolbar ? (
              <FullscreenAwareToolbarWrapper>
                <PortableTextToolbar>
                  <RangeDecorationButton
                    onAddRangeDecoration={(rangeDecoration) => {
                      props.editorRef.send({
                        type: 'add range decoration',
                        rangeDecoration,
                      })
                    }}
                    onRangeDecorationMoved={(details) => {
                      props.editorRef.send({
                        type: 'move range decoration',
                        details,
                      })
                    }}
                  />
                </PortableTextToolbar>
              </FullscreenAwareToolbarWrapper>
            ) : null}
            <FullscreenAwareContainer>
              {featureFlags.codeBlockPlugin ? <CodeBlockPlugin /> : null}
              {featureFlags.calloutPlugin ? <CalloutPlugin /> : null}
              {featureFlags.factBoxPlugin ? <FactBoxPlugin /> : null}
              {featureFlags.tablePlugin ? <PlaygroundTablePlugin /> : null}
              <InlineObjectsPlugin />
              {featureFlags.emojiPickerPlugin ? <EmojiPickerPlugin /> : null}
              {featureFlags.mentionPickerPlugin ? (
                <MentionPickerPlugin />
              ) : null}
              {featureFlags.slashCommandPlugin ? (
                <SlashCommandPickerPlugin />
              ) : null}
              {featureFlags.codeEditorPlugin ? <CodeEditorPlugin /> : null}
              {featureFlags.linkPlugin ? <PasteLinkPlugin /> : null}
              {featureFlags.imageDeserializerPlugin ? (
                <ImageDeserializerPlugin />
              ) : null}
              {featureFlags.htmlDeserializerPlugin ? (
                <HtmlDeserializerPlugin />
              ) : null}
              {featureFlags.textFileDeserializerPlugin ? (
                <TextFileDeserializerPlugin />
              ) : null}
              {featureFlags.markdownDeserializerPlugin ? (
                <MarkdownDeserializerPlugin />
              ) : null}
              {featureFlags.markdownPlugin ? (
                <MarkdownShortcutsPlugin {...markdownShortcutsPluginProps} />
              ) : null}
              {featureFlags.oneLinePlugin ? <OneLinePlugin /> : null}
              {featureFlags.typographyPlugin ? (
                <TypographyPlugin
                  guard={createDecoratorGuard({
                    decorators: ({context}) =>
                      context.schema.decorators.flatMap((decorator) =>
                        decorator.name === 'code' ? [] : [decorator.name],
                      ),
                  })}
                />
              ) : null}
              <FullscreenAwareEditable
                rangeDecorations={props.rangeDecorations}
                featureFlags={featureFlags}
                loading={loading}
              />
              <EditorFooter editorRef={props.editorRef} readOnly={readOnly} />
            </FullscreenAwareContainer>
          </EditorProvider>
        </FullscreenProvider>
      </ErrorBoundary>
    </div>
  )
}

function FullscreenAwareEditable(props: {
  rangeDecorations: RangeDecoration[]
  featureFlags: EditorFeatureFlags
  loading: boolean
}) {
  const {isFullscreen} = useFullscreen()
  const wrapperClasses = isFullscreen
    ? 'flex gap-2 items-stretch flex-1 min-h-0'
    : 'flex gap-2 items-center'
  const editableClasses = isFullscreen
    ? `rounded-b-md outline-none data-[read-only=true]:opacity-50 px-2 -mx-2 -mb-2 overflow-auto flex-1 ${props.featureFlags.dragHandles ? 'ps-5' : ''}`
    : `rounded-b-md outline-none data-[read-only=true]:opacity-50 px-2 h-75 -mx-2 -mb-2 overflow-auto flex-1 ${props.featureFlags.dragHandles ? 'ps-5' : ''}`
  return (
    <div className={wrapperClasses}>
      <ErrorBoundary
        fallbackProps={{area: 'PortableTextEditable'}}
        fallback={ErrorScreen}
        onError={console.error}
      >
        <EditorFeatureFlagsContext.Provider value={props.featureFlags}>
          <PortableTextEditable
            className={editableClasses}
            rangeDecorations={props.rangeDecorations}
            renderAnnotation={renderAnnotation}
            renderBlock={RenderBlock}
            renderDecorator={renderDecorator}
            renderListItem={renderListItem}
            renderPlaceholder={renderPlaceholder}
            renderStyle={renderStyle}
          />
        </EditorFeatureFlagsContext.Provider>
      </ErrorBoundary>
      {props.loading ? <Spinner /> : null}
    </div>
  )
}

function FullscreenAwareToolbarWrapper(props: {children: React.ReactNode}) {
  const {isFullscreen} = useFullscreen()
  if (isFullscreen) {
    return <Container className="mb-2">{props.children}</Container>
  }
  return <div className="mb-2">{props.children}</div>
}

function FullscreenAwareContainer(props: {children: React.ReactNode}) {
  const {isFullscreen} = useFullscreen()
  const containerClasses = isFullscreen
    ? 'relative flex flex-col overflow-clip flex-1 min-h-0'
    : 'relative flex flex-col overflow-clip'
  return (
    <Container className={containerClasses}>
      <div className="absolute top-2 right-2 z-10">
        <FullscreenToggle />
      </div>
      {props.children}
    </Container>
  )
}

function EditorEventListener(props: {
  editorRef: EditorActorRef
  on: (event: EditorEmittedEvent) => void
  value: Array<PortableTextBlock> | undefined
}) {
  const patchSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'patch subscription': 'active'}),
  )
  const valueSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'value subscription': 'active'}),
  )
  const editor = useEditor()

  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      if (patchSubscriptionActive) {
        editor.send(event)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorRef, editor, patchSubscriptionActive])

  useEffect(() => {
    const subscription = editor.on('*', props.on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.on])

  useEffect(() => {
    if (valueSubscriptionActive) {
      editor.send({
        type: 'update value',
        value: props.value,
      })
    }
  }, [editor, props.value, valueSubscriptionActive])

  return null
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  if (CommentAnnotationSchema.safeParse(props).success) {
    return (
      <span className="bg-yellow-300 dark:bg-yellow-700">{props.children}</span>
    )
  }

  if (LinkAnnotationSchema.safeParse(props).success) {
    return (
      <span className="text-blue-800 dark:text-blue-400 underline">
        {props.children}
      </span>
    )
  }

  return props.children
}

const breakStyle = tv({
  base: 'my-6 flex items-center justify-center',
  variants: {
    selected: {
      true: '',
    },
    focused: {
      true: '',
    },
  },
})

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

const fallbackBlockStyle = tv({
  base: 'my-2 rounded border border-dashed border-gray-300 px-3 py-2 text-sm dark:border-gray-600',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-50 dark:bg-blue-900/30'},
  },
})

/**
 * Read-only fallback for new-pipeline block-objects whose `NodePlugin`
 * has been toggled off in the playground feature flags. Renders the
 * block through `@portabletext/markdown` and shows the resulting
 * markdown source. Honest representation: when no consumer-provided
 * render is registered, the block is shown as the markdown it would
 * serialize to. No content cropping; full structure preserved.
 */
function MarkdownFallback(props: {
  value: unknown
  label: string
  icon: JSX.Element
  selected: boolean
  focused: boolean
}) {
  const markdown = portableTextToMarkdown(
    [props.value as PortableTextBlock],
    markdownOptions,
  )
  return (
    <div
      className={fallbackBlockStyle({
        selected: props.selected,
        focused: props.focused,
      })}
    >
      <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {props.icon}
        <span>{props.label}</span>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-gray-200">
        {markdown}
      </pre>
    </div>
  )
}

const RenderBlock = (props: BlockRenderProps) => {
  const enableDragHandles = useContext(EditorFeatureFlagsContext).dragHandles
  const editor = useEditor()
  const readOnly = useEditorSelector(editor, (s) => s.context.readOnly)

  let children = props.children

  if (props.schemaType.name === 'break') {
    children = (
      <div
        className={breakStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <div
          className={breakLineStyle({
            selected: props.selected,
            focused: props.focused,
          })}
        />
      </div>
    )
  }

  if (props.schemaType.name === 'image') {
    const image = props.value as {src?: string; alt?: string}
    children = (
      <div
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
          <div className="flex items-center gap-1">
            <TooltipTrigger>
              <Button variant="ghost" size="sm">
                <LinkIcon className="size-3 shrink-0" />
              </Button>
              <Tooltip className="max-w-120">
                <span className="wrap-anywhere">{image.src}</span>
              </Tooltip>
            </TooltipTrigger>
            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
              {image.src}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PencilIcon className="size-3 shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {image.alt}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (props.schemaType.name === 'callout') {
    const tone = (props.value as unknown as {tone?: string}).tone
    children = (
      <MarkdownFallback
        value={props.value}
        label={`Callout${tone ? ` · ${tone}` : ''}`}
        icon={<InfoIcon className="size-3.5" />}
        selected={props.selected}
        focused={props.focused}
      />
    )
  }

  if (props.schemaType.name === 'fact-box') {
    children = (
      <MarkdownFallback
        value={props.value}
        label="Fact box"
        icon={<LayersIcon className="size-3.5" />}
        selected={props.selected}
        focused={props.focused}
      />
    )
  }

  if (props.schemaType.name === 'code-block') {
    const language = (props.value as unknown as {language?: string}).language
    children = (
      <MarkdownFallback
        value={props.value}
        label={`Code block${language ? ` · ${language}` : ''}`}
        icon={<CodeIcon className="size-3.5" />}
        selected={props.selected}
        focused={props.focused}
      />
    )
  }

  if (props.schemaType.name === 'table') {
    children = (
      <MarkdownFallback
        value={props.value}
        label="Table"
        icon={<TableIcon className="size-3.5" />}
        selected={props.selected}
        focused={props.focused}
      />
    )
  }

  if (props.level === undefined && enableDragHandles) {
    // Don't render drag handle on other levels right now since the styling is off
    return (
      <div className="me-1 relative">
        <div
          contentEditable={false}
          draggable={!readOnly}
          className="absolute top-0 -left-3 bottom-0 w-1.5 bg-gray-300 dark:bg-gray-600 rounded cursor-grab"
        >
          <span />
        </div>
        <div>{children}</div>
      </div>
    )
  }

  return children
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  return (decoratorMap.get(props.value) ?? ((props) => props.children))(props)
}

function TaskListCheckbox(props: {
  block: BlockListItemRenderProps['block']
  path: BlockPath
}) {
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

const renderListItem: RenderListItemFunction = (props) => {
  if (props.value === 'task') {
    const checked = (props.block as {checked?: boolean}).checked === true
    return (
      <span
        className="flex items-center gap-2 data-[checked=true]:text-gray-400 data-[checked=true]:line-through [&>*:last-child]:flex-1"
        data-checked={checked}
      >
        <TaskListCheckbox block={props.block} path={props.path} />
        {props.children}
      </span>
    )
  }
  return props.children
}

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-gray-400 dark:text-gray-500 px-2">Type something</span>
)

const renderStyle: RenderStyleFunction = (props) => {
  return (styleMap.get(props.value) ?? ((props) => props.children))(props)
}

const decoratorMap: Map<
  string,
  (props: BlockDecoratorRenderProps) => JSX.Element
> = new Map([
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

const styleMap: Map<string, (props: BlockStyleRenderProps) => JSX.Element> =
  new Map([
    ['normal', (props) => <p className="my-1">{props.children}</p>],
    [
      'h1',
      (props) => <h1 className="my-1 font-bold text-3xl">{props.children}</h1>,
    ],
    [
      'h2',
      (props) => <h2 className="my-1 font-bold text-2xl">{props.children}</h2>,
    ],
    [
      'h3',
      (props) => <h3 className="my-1 font-bold text-xl">{props.children}</h3>,
    ],
    [
      'h4',
      (props) => <h4 className="my-1 font-bold text-lg">{props.children}</h4>,
    ],
    [
      'h5',
      (props) => <h5 className="my-1 font-bold text-base">{props.children}</h5>,
    ],
    [
      'h6',
      (props) => <h6 className="my-1 font-bold text-sm">{props.children}</h6>,
    ],
    [
      'blockquote',
      (props) => (
        <blockquote className="my-1 pl-2 py-1 border-gray-300 dark:border-gray-600 border-l-4">
          {props.children}
        </blockquote>
      ),
    ],
  ])

function EditorFooter(props: {editorRef: EditorActorRef; readOnly: boolean}) {
  const editor = useEditor()
  const patchesActive = useSelector(props.editorRef, (s) =>
    s.matches({'patch subscription': 'active'}),
  )
  const valueActive = useSelector(props.editorRef, (s) =>
    s.matches({'value subscription': 'active'}),
  )
  const selection = useEditorSelector(editor, (s) => s.context.selection)
  const value = useEditorSelector(editor, (s) => s.context.value)
  const [showSelection, setShowSelection] = useState(false)
  const [showValue, setShowValue] = useState(false)

  const isExpanded = showSelection || showValue

  return (
    <div className={isExpanded ? 'pt-3 space-y-2' : 'pt-1'}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          {props.editorRef.id}
        </span>
        <div className="flex items-center gap-0.5">
          <EditorSettingsPopover editorRef={props.editorRef} />
          <TooltipTrigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isSelected={showSelection}
              onChange={setShowSelection}
            >
              <MousePointerIcon className="size-3" />
            </ToggleButton>
            <Tooltip>
              {showSelection ? 'Hide selection' : 'Show selection'}
            </Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isSelected={showValue}
              onChange={setShowValue}
            >
              <BracesIcon className="size-3" />
            </ToggleButton>
            <Tooltip>{showValue ? 'Hide value' : 'Show value'}</Tooltip>
          </TooltipTrigger>
        </div>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-0.5">
          <TooltipTrigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isSelected={!props.readOnly}
              onChange={() =>
                editor.send({
                  type: 'update readOnly',
                  readOnly: !props.readOnly,
                })
              }
            >
              {props.readOnly ? (
                <PencilOffIcon className="size-3" />
              ) : (
                <PencilIcon className="size-3" />
              )}
            </ToggleButton>
            <Tooltip>{props.readOnly ? 'Read-only' : 'Editable'}</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isSelected={patchesActive}
              onChange={() =>
                props.editorRef.send({type: 'toggle patch subscription'})
              }
            >
              <ActivityIcon className="size-3" />
            </ToggleButton>
            <Tooltip>
              {patchesActive ? 'Receiving patches' : 'Not receiving patches'}
            </Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isSelected={valueActive}
              onChange={() =>
                props.editorRef.send({type: 'toggle value subscription'})
              }
            >
              <FileJsonIcon className="size-3" />
            </ToggleButton>
            <Tooltip>
              {valueActive
                ? 'Receiving value updates'
                : 'Not receiving value updates'}
            </Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => props.editorRef.send({type: 'remove'})}
            >
              <XIcon className="size-3" />
            </Button>
            <Tooltip>Remove editor</Tooltip>
          </TooltipTrigger>
        </div>
      </div>
      {isExpanded && (
        <div
          className={`grid gap-2 ${showSelection && showValue ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {showSelection && <JsonPane label="Selection" data={selection} />}
          {showValue && <JsonPane label="Value" data={value} />}
        </div>
      )}
    </div>
  )
}

function JsonPane(props: {label: string; data: unknown}) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(props.data ?? null)
  const highlightRef = useActorRef(highlightMachine, {
    input: {code: json, variant: 'ghost'},
  })
  const highlightedCode = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )

  useEffect(() => {
    highlightRef.send({type: 'update code', code: json})
  }, [json, highlightRef])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(props.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {props.label}
        </span>
        <TooltipTrigger>
          <Button variant="ghost" size="sm" onPress={handleCopy}>
            {copied ? (
              <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
            ) : (
              <CopyIcon className="size-3" />
            )}
          </Button>
          <Tooltip>{copied ? 'Copied!' : 'Copy'}</Tooltip>
        </TooltipTrigger>
      </div>
      <div
        className="max-h-48 overflow-auto text-xs [&>pre]:p-2 [&>pre]:m-0"
        dangerouslySetInnerHTML={{__html: highlightedCode ?? ''}}
      />
    </div>
  )
}
