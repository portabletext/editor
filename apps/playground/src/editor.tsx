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
import {useSelector} from '@xstate/react'
import {
  BugIcon,
  LinkIcon,
  PencilIcon,
  SeparatorHorizontalIcon,
} from 'lucide-react'
import {useContext, useEffect, useState, type JSX} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {DebugMenu} from './debug-menu'
import './editor.css'
import {
  EditorFeatureFlagsContext,
  PlaygroundFeatureFlagsContext,
} from './feature-flags'
import type {EditorActorRef} from './playground-machine'
import {
  CommentAnnotationSchema,
  ImageSchema,
  LinkAnnotationSchema,
  playgroundSchemaDefinition,
  StockTickerSchema,
} from './playground-schema-definition'
import {CodeEditorPlugin} from './plugins/plugin.code-editor'
import {EmojiPickerPlugin} from './plugins/plugin.emoji-picker'
import {ImageDeserializerPlugin} from './plugins/plugin.image-deserializer'
import {LinkPlugin} from './plugins/plugin.link'
import {markdownShortcutsPluginProps} from './plugins/plugin.markdown'
import {TextFileDeserializerPlugin} from './plugins/plugin.text-file-deserializer'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {ErrorBoundary} from './primitives/error-boundary'
import {ErrorScreen} from './primitives/error-screen'
import {Separator} from './primitives/separator'
import {Spinner} from './primitives/spinner'
import {Switch} from './primitives/switch'
import {Tooltip} from './primitives/tooltip'
import {RangeDecorationButton} from './range-decoration-button'
import {PortableTextToolbar} from './toolbar/portable-text-toolbar'

const editorStyle = tv({
  base: 'grid gap-2 items-start',
  variants: {
    debugModeEnabled: {
      true: 'grid-cols-1 md:grid-cols-2',
      false: 'grid-cols-1',
    },
  },
})

export function Editor(props: {
  editorRef: EditorActorRef
  rangeDecorations: RangeDecoration[]
}) {
  const value = useSelector(props.editorRef, (s) => s.context.value)
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s.context.keyGenerator,
  )
  const debugModeEnabled = useSelector(props.editorRef, (s) =>
    s.matches({'debug mode': 'shown'}),
  )
  const [loading, setLoading] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const playgroundFeatureFlags = useContext(PlaygroundFeatureFlagsContext)
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s.context.featureFlags,
  )

  return (
    <div
      data-testid={props.editorRef.id}
      className={editorStyle({debugModeEnabled})}
    >
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
          <Container className="flex flex-col gap-4 overflow-clip">
            {playgroundFeatureFlags.toolbar ? (
              <PortableTextToolbar
                schemaDefinition={playgroundSchemaDefinition}
              >
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
                <Separator orientation="vertical" />
                <TooltipTrigger>
                  <Switch
                    isSelected={debugModeEnabled}
                    onChange={() => {
                      props.editorRef.send({type: 'toggle debug mode'})
                    }}
                  >
                    <BugIcon className="size-4" />
                  </Switch>
                  <Tooltip>Toggle debug mode</Tooltip>
                </TooltipTrigger>
              </PortableTextToolbar>
            ) : null}
            {featureFlags.emojiPickerPlugin ? <EmojiPickerPlugin /> : null}
            {featureFlags.codeEditorPlugin ? <CodeEditorPlugin /> : null}
            {featureFlags.linkPlugin ? <LinkPlugin /> : null}
            {featureFlags.imageDeserializerPlugin ? (
              <ImageDeserializerPlugin />
            ) : null}
            {featureFlags.textFileDeserializerPlugin ? (
              <TextFileDeserializerPlugin />
            ) : null}
            {featureFlags.markdownPlugin ? (
              <MarkdownShortcutsPlugin {...markdownShortcutsPluginProps} />
            ) : null}
            {featureFlags.oneLinePlugin ? <OneLinePlugin /> : null}
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
          </Container>
          {debugModeEnabled ? (
            <DebugMenu editorRef={props.editorRef} readOnly={readOnly} />
          ) : null}
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
    return <span className="bg-yellow-300">{props.children}</span>
  }

  if (LinkAnnotationSchema.safeParse(props).success) {
    return <span className="text-blue-800 underline">{props.children}</span>
  }

  return props.children
}

const breakStyle = tv({
  base: 'my-1 p-1 flex items-center justify-center gap-1 border-2 border-gray-300 rounded',
  variants: {
    selected: {
      true: 'border-blue-300',
    },
    focused: {
      true: 'bg-blue-50',
    },
  },
})

const imageStyle = tv({
  base: 'grid grid-cols-[auto_1fr] my-1 items-start gap-1 border-2 border-gray-300 rounded text-sm',
  variants: {
    selected: {
      true: 'border-blue-300',
    },
    focused: {
      true: 'bg-blue-50',
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
        <div className="bg-gray-200 size-20 overflow-clip flex items-center justify-center">
          <img
            className="object-scale-down max-w-full"
            src={image.value.url}
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
                <span className="wrap-anywhere">{image.value.url}</span>
              </Tooltip>
            </TooltipTrigger>
            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
              {image.value.url}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PencilIcon className="size-3 shrink-0" />
            <span className="text-xs text-slate-500">{image.value.alt}</span>
          </div>
        </div>
      </div>
    )
  }

  if (props.level === undefined && enableDragHandles) {
    // Don't render drag handle on other levels right now since the styling is off
    return (
      <div className="me-1 relative hover:bg-red">
        <div
          contentEditable={false}
          draggable={!readOnly}
          className={`absolute top-0 -left-3 bottom-0 w-1.5 bg-slate-300 rounded cursor-grab`}
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
  base: 'border-2 border-gray-300 rounded px-1 font-mono text-sm',
  variants: {
    selected: {
      true: 'border-blue-300',
    },
  },
})

const renderChild: RenderChildFunction = (props) => {
  const stockTicker = StockTickerSchema.safeParse(props).data

  if (stockTicker) {
    return (
      <span className={stockTickerStyle({selected: props.selected})}>
        {stockTicker.value.symbol}
      </span>
    )
  }

  return props.children
}

const renderListItem: RenderListItemFunction = (props) => {
  return props.children
}

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-slate-400 px-2">Type something</span>
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
        <blockquote className="my-1 pl-2 py-1 border-slate-300 border-l-4">
          {props.children}
        </blockquote>
      ),
    ],
  ])
