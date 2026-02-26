import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type BlockDecoratorRenderProps,
  type BlockRenderProps,
  type BlockStyleRenderProps,
  type EditorEmittedEvent,
  type PortableTextBlock,
  type RangeDecoration,
  type RenderAnnotationFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
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
  AtSignIcon,
  BracesIcon,
  CheckIcon,
  CopyIcon,
  FileJsonIcon,
  LinkIcon,
  MousePointerIcon,
  PencilIcon,
  PencilOffIcon,
  SeparatorHorizontalIcon,
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
} from './feature-flags'
import {highlightMachine} from './highlight-json-machine'
import {MentionPickerPlugin} from './mention-picker'
import type {EditorActorRef} from './playground-machine'
import {
  CommentAnnotationSchema,
  ImageSchema,
  InlineImageSchema,
  LinkAnnotationSchema,
  MentionSchema,
  playgroundSchemaDefinition,
  StockTickerSchema,
} from './playground-schema-definition'
import {CodeEditorPlugin} from './plugins/plugin.code-editor'
import {HtmlDeserializerPlugin} from './plugins/plugin.html-deserializer'
import {ImageDeserializerPlugin} from './plugins/plugin.image-deserializer'
import {markdownShortcutsPluginProps} from './plugins/plugin.markdown'
import {TextFileDeserializerPlugin} from './plugins/plugin.text-file-deserializer'
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
import {PlaygroundYjsPlugin} from './yjs-plugin'

export function Editor(props: {
  editorRef: EditorActorRef
  editorIndex: number
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
        <EditorProvider
          initialConfig={{
            initialValue: value,
            keyGenerator,
            readOnly,
            schemaDefinition: playgroundSchemaDefinition,
          }}
        >
          <PlaygroundYjsPlugin
            enabled={playgroundFeatureFlags.yjsMode}
            editorIndex={props.editorIndex}
            useLatency={playgroundFeatureFlags.yjsLatency > 0}
          />
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
            <div className="mb-2">
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
            </div>
          ) : null}
          <Container className="flex flex-col overflow-clip">
            {featureFlags.emojiPickerPlugin ? <EmojiPickerPlugin /> : null}
            {featureFlags.mentionPickerPlugin ? <MentionPickerPlugin /> : null}
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
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{area: 'PortableTextEditable'}}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <EditorFeatureFlagsContext.Provider value={featureFlags}>
                  <PortableTextEditable
                    className={`rounded-b-md outline-none data-[read-only=true]:opacity-50 px-2 h-75 -mx-2 -mb-2 overflow-auto flex-1 ${featureFlags.dragHandles ? 'ps-5' : ''}`}
                    rangeDecorations={props.rangeDecorations}
                    renderAnnotation={renderAnnotation}
                    renderBlock={RenderBlock}
                    renderChild={renderChild}
                    renderDecorator={renderDecorator}
                    renderListItem={renderListItem}
                    renderPlaceholder={renderPlaceholder}
                    renderStyle={renderStyle}
                  />
                </EditorFeatureFlagsContext.Provider>
              </ErrorBoundary>
              {loading ? <Spinner /> : null}
            </div>
            <EditorFooter editorRef={props.editorRef} readOnly={readOnly} />
          </Container>
        </EditorProvider>
      </ErrorBoundary>
    </div>
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
  base: 'my-1 p-1 flex items-center justify-center gap-1 border-2 border-gray-300 dark:border-gray-600 rounded',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-50 dark:bg-blue-900/30',
    },
  },
})

const imageStyle = tv({
  base: 'grid grid-cols-[auto_1fr] my-1 items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-50 dark:bg-blue-900/30',
    },
  },
})

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
        <SeparatorHorizontalIcon className="size-4" />
      </div>
    )
  }

  const image = ImageSchema.safeParse(props).data

  if (image) {
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
            src={image.value.src}
            alt={image.value.alt ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1 p-1 overflow-hidden">
          <div className="flex items-center gap-1">
            <TooltipTrigger>
              <Button variant="ghost" size="sm">
                <LinkIcon className="size-3 shrink-0" />
              </Button>
              <Tooltip className="max-w-120">
                <span className="wrap-anywhere">{image.value.src}</span>
              </Tooltip>
            </TooltipTrigger>
            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
              {image.value.src}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PencilIcon className="size-3 shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {image.value.alt}
            </span>
          </div>
        </div>
      </div>
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

const stockTickerStyle = tv({
  base: 'max-w-30 inline-flex items-center gap-1 border-2 border-gray-300 dark:border-gray-600 rounded px-1 font-mono text-xs',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-100 dark:bg-blue-800/60',
    },
  },
})

const mentionStyle = tv({
  base: 'inline-flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded px-1 text-sm',
  variants: {
    selected: {
      true: 'ring-2 ring-blue-300 dark:ring-blue-600',
    },
    focused: {
      true: 'bg-blue-200 dark:bg-blue-700/70',
    },
  },
})

const inlineImageStyle = tv({
  base: 'max-w-35 grid grid-cols-[auto_1fr] items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-100 dark:bg-blue-800/60',
    },
  },
})

const renderChild: RenderChildFunction = (props) => {
  const stockTicker = StockTickerSchema.safeParse(props).data

  if (stockTicker) {
    return (
      <span
        className={stockTickerStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <ActivityIcon className="size-3 shrink-0" />
        {stockTicker.value.symbol}
      </span>
    )
  }

  const mention = MentionSchema.safeParse(props).data

  if (mention) {
    return (
      <span
        className={mentionStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <AtSignIcon className="size-3" />
        {mention.value.username}
      </span>
    )
  }

  const image = InlineImageSchema.safeParse(props).data

  if (image) {
    return (
      <span
        className={inlineImageStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <span className="bg-gray-100 dark:bg-gray-700 size-5 overflow-clip flex items-center justify-center">
          <img
            className="object-scale-down max-w-full"
            src={image.value.src}
            alt={image.value.alt ?? ''}
          />
        </span>
        <span className="text-ellipsis overflow-hidden whitespace-nowrap">
          {image.value.src}
        </span>
      </span>
    )
  }

  return props.children
}

const renderListItem: RenderListItemFunction = (props) => {
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
  ['code', (props) => <code>{props.children}</code>],
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
      (props) => <h1 className="my-1 font-bold text-5xl">{props.children}</h1>,
    ],
    [
      'h2',
      (props) => <h2 className="my-1 font-bold text-4xl">{props.children}</h2>,
    ],
    [
      'h3',
      (props) => <h3 className="my-1 font-bold text-3xl">{props.children}</h3>,
    ],
    [
      'h4',
      (props) => <h4 className="my-1 font-bold text-2xl">{props.children}</h4>,
    ],
    [
      'h5',
      (props) => <h5 className="my-1 font-bold text-xl">{props.children}</h5>,
    ],
    [
      'h6',
      (props) => <h6 className="my-1 font-bold text-lg">{props.children}</h6>,
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
