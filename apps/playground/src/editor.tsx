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
import * as selectors from '@portabletext/editor/selectors'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {OneLinePlugin} from '@portabletext/plugin-one-line'
import {useSelector} from '@xstate/react'
import {createStore} from '@xstate/store'
import {
  BugIcon,
  CopyIcon,
  LinkIcon,
  PencilIcon,
  SeparatorHorizontalIcon,
  TrashIcon,
} from 'lucide-react'
import {useEffect, useState, type JSX} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {reverse} from 'remeda'
import {tv} from 'tailwind-variants'
import {createCodeEditorBehaviors} from './behavior.code-editor'
import {createLinkBehaviors} from './behavior.links'
import {EditorPatchesPreview} from './editor-patches-preview'
import './editor.css'
import {EmojiPickerPlugin} from './emoji-picker'
import type {EditorActorRef} from './playground-machine'
import {
  CommentAnnotationSchema,
  ImageSchema,
  LinkAnnotationSchema,
  playgroundSchemaDefinition,
  StockTickerSchema,
} from './playground-schema-definition'
import {ImageDeserializerPlugin} from './plugin.image-deserializer'
import {TextFileDeserializerPlugin} from './plugin.text-file-deserializer'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {ErrorBoundary} from './primitives/error-boundary'
import {ErrorScreen} from './primitives/error-screen'
import {Separator} from './primitives/separator'
import {Spinner} from './primitives/spinner'
import {Switch} from './primitives/switch'
import {Toolbar} from './primitives/toolbar'
import {Tooltip} from './primitives/tooltip'
import {RangeDecorationButton} from './range-decoration-button'
import {SelectionPreview} from './selection-preview'
import {PortableTextToolbar} from './toolbar/portable-text-toolbar'
import {ValuePreview} from './value-preview'

const featureFlags = createStore({
  context: {
    enableDragHandles: false,
    imageDeserializerPlugin: true,
    textFileDeserializerPlugin: true,
  },
  on: {
    toggleDragHandles: (context) => ({
      ...context,
      enableDragHandles: !context.enableDragHandles,
    }),
    toggleImageDeserializerPlugin: (context) => ({
      ...context,
      imageDeserializerPlugin: !context.imageDeserializerPlugin,
    }),
    toggleTextFileDeserializerPlugin: (context) => ({
      ...context,
      textFileDeserializerPlugin: !context.textFileDeserializerPlugin,
    }),
  },
})

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
  const enableDragHandles = useSelector(
    featureFlags,
    (s) => s.context.enableDragHandles,
  )
  const [enableEmojiPickerPlugin, setEnableEmojiPickerPlugin] = useState(false)

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
            <PortableTextToolbar schemaDefinition={playgroundSchemaDefinition}>
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
            {enableEmojiPickerPlugin ? <EmojiPickerPlugin /> : null}
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{area: 'PortableTextEditable'}}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <PortableTextEditable
                  className={`rounded-b-md outline-none data-[read-only=true]:opacity-50 px-2 h-75 -mx-2 -mb-2 overflow-auto flex-1 ${enableDragHandles ? 'ps-5' : ''}`}
                  rangeDecorations={props.rangeDecorations}
                  renderAnnotation={renderAnnotation}
                  renderBlock={RenderBlock}
                  renderChild={renderChild}
                  renderDecorator={renderDecorator}
                  renderListItem={renderListItem}
                  renderPlaceholder={renderPlaceholder}
                  renderStyle={renderStyle}
                />
              </ErrorBoundary>
              {loading ? <Spinner /> : null}
            </div>
          </Container>
          {debugModeEnabled ? (
            <EditorPlaygroundToolbar
              editorRef={props.editorRef}
              enableEmojiPickerPlugin={enableEmojiPickerPlugin}
              setEnableEmojiPickerPlugin={setEnableEmojiPickerPlugin}
              readOnly={readOnly}
            />
          ) : null}
        </EditorProvider>
      </ErrorBoundary>
    </div>
  )
}

function EditorPlaygroundToolbar(props: {
  editorRef: EditorActorRef
  enableEmojiPickerPlugin: boolean
  setEnableEmojiPickerPlugin: (enable: boolean) => void
  readOnly: boolean
}) {
  const showingPatchesPreview = useSelector(props.editorRef, (s) =>
    s.matches({'patches preview': 'shown'}),
  )
  const showingSelectionPreivew = useSelector(props.editorRef, (s) =>
    s.matches({'selection preview': 'shown'}),
  )
  const showingValuePreview = useSelector(props.editorRef, (s) =>
    s.matches({'value preview': 'shown'}),
  )
  const patchSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'patch subscription': 'active'}),
  )
  const valueSubscriptionActive = useSelector(props.editorRef, (s) =>
    s.matches({'value subscription': 'active'}),
  )
  const patchesReceived = useSelector(props.editorRef, (s) =>
    reverse(s.context.patchesReceived),
  )
  const enableDragHandles = useSelector(
    featureFlags,
    (s) => s.context.enableDragHandles,
  )
  const [enableMarkdownPlugin, setEnableMarkdownPlugin] = useState(false)
  const [enableOneLinePlugin, setEnableOneLinePLugin] = useState(false)
  const [enableCodeEditorPlugin, setEnableCodeEditorPlugin] = useState(false)
  const [enableLinkPlugin, setEnableLinkPlugin] = useState(false)
  const enableImageDeserializerPlugin = useSelector(
    featureFlags,
    (s) => s.context.imageDeserializerPlugin,
  )
  const enableTextFileDeserializerPlugin = useSelector(
    featureFlags,
    (s) => s.context.textFileDeserializerPlugin,
  )

  return (
    <>
      <Container className="flex flex-col gap-2">
        <Toolbar>
          <Switch
            isSelected={patchSubscriptionActive}
            onChange={() => {
              props.editorRef.send({type: 'toggle patch subscription'})
            }}
          >
            Patch subscription
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={valueSubscriptionActive}
            onChange={() => {
              props.editorRef.send({type: 'toggle value subscription'})
            }}
          >
            Value subscription
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={enableDragHandles}
            onChange={() => {
              featureFlags.trigger.toggleDragHandles()
            }}
          >
            Drag handles (experimental)
          </Switch>
        </Toolbar>
        <Separator orientation="horizontal" />
        <Toolbar>
          <Switch
            isSelected={enableMarkdownPlugin}
            onChange={() => {
              setEnableMarkdownPlugin(!enableMarkdownPlugin)
            }}
          >
            Markdown plugin
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={enableOneLinePlugin}
            onChange={() => {
              setEnableOneLinePLugin(!enableOneLinePlugin)
            }}
          >
            One-line plugin
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={props.enableEmojiPickerPlugin}
            onChange={(isSelected) => {
              props.setEnableEmojiPickerPlugin(isSelected)
            }}
          >
            Emoji picker plugin
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={enableCodeEditorPlugin}
            onChange={() => {
              setEnableCodeEditorPlugin(!enableCodeEditorPlugin)
            }}
          >
            Code editor plugin
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={enableLinkPlugin}
            onChange={() => {
              setEnableLinkPlugin(!enableLinkPlugin)
            }}
          >
            Link plugin
          </Switch>
        </Toolbar>
        <Separator orientation="horizontal" />
        <Toolbar>
          <Switch
            isSelected={enableImageDeserializerPlugin}
            onChange={() => {
              featureFlags.trigger.toggleImageDeserializerPlugin()
            }}
          >
            Image deserializer plugin
          </Switch>
        </Toolbar>
        <Toolbar>
          <Switch
            isSelected={enableTextFileDeserializerPlugin}
            onChange={() => {
              featureFlags.trigger.toggleTextFileDeserializerPlugin()
            }}
          >
            Text file deserializer plugin
          </Switch>
        </Toolbar>
        <Separator orientation="horizontal" />
        <Toolbar>
          <Switch
            isSelected={showingPatchesPreview}
            onChange={() => {
              props.editorRef.send({type: 'toggle patches preview'})
            }}
          >
            Patches
          </Switch>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="destructive"
              onPress={() => {
                props.editorRef.send({type: 'clear stored patches'})
              }}
            >
              <TrashIcon className="size-3" />
            </Button>
            <Tooltip>Clear patches</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                props.editorRef.send({type: 'copy patches'})
              }}
            >
              <CopyIcon className="size-3" />
            </Button>
            <Tooltip>Copy</Tooltip>
          </TooltipTrigger>
        </Toolbar>
        {showingPatchesPreview ? (
          <EditorPatchesPreview patches={patchesReceived} />
        ) : null}
        <Toolbar>
          <Switch
            isSelected={showingSelectionPreivew}
            onChange={() => {
              props.editorRef.send({type: 'toggle selection preview'})
            }}
          >
            Selection
          </Switch>
        </Toolbar>
        {showingSelectionPreivew ? (
          <SelectionPreview editorId={props.editorRef.id} />
        ) : null}
        <Toolbar>
          <Switch
            isSelected={showingValuePreview}
            onChange={() => {
              props.editorRef.send({type: 'toggle value preview'})
            }}
          >
            Value
          </Switch>
        </Toolbar>
        {showingValuePreview ? (
          <ValuePreview editorId={props.editorRef.id} />
        ) : null}
        <Separator orientation="horizontal" />
        <div className="flex gap-2 items-center justify-between">
          <TooltipTrigger>
            <Button
              variant="destructive"
              size="sm"
              onPress={() => {
                props.editorRef.send({type: 'remove'})
              }}
            >
              <TrashIcon className="size-3" />
              {props.editorRef.id}
            </Button>
            <Tooltip>Remove editor</Tooltip>
          </TooltipTrigger>
          <ToggleReadOnly readOnly={props.readOnly} />
        </div>
      </Container>
      {enableTextFileDeserializerPlugin ? <TextFileDeserializerPlugin /> : null}
      {enableImageDeserializerPlugin ? <ImageDeserializerPlugin /> : null}
      {enableMarkdownPlugin ? (
        <MarkdownShortcutsPlugin
          boldDecorator={({schema}) =>
            schema.decorators.find((decorator) => decorator.name === 'strong')
              ?.name
          }
          codeDecorator={({schema}) =>
            schema.decorators.find((decorator) => decorator.name === 'code')
              ?.name
          }
          italicDecorator={({schema}) =>
            schema.decorators.find((decorator) => decorator.name === 'em')?.name
          }
          strikeThroughDecorator={({schema}) =>
            schema.decorators.find(
              (decorator) => decorator.name === 'strike-through',
            )?.name
          }
          horizontalRuleObject={({schema}) => {
            const name = schema.blockObjects.find(
              (object) => object.name === 'break',
            )?.name
            return name ? {name} : undefined
          }}
          defaultStyle={({schema}) => schema.styles[0].value}
          headingStyle={({schema, level}) =>
            schema.styles.find((style) => style.name === `h${level}`)?.name
          }
          blockquoteStyle={({schema}) =>
            schema.styles.find((style) => style.name === 'blockquote')?.name
          }
          unorderedList={({schema}) =>
            schema.lists.find((list) => list.name === 'bullet')?.name
          }
          orderedList={({schema}) =>
            schema.lists.find((list) => list.name === 'number')?.name
          }
        />
      ) : null}
      {enableOneLinePlugin ? <OneLinePlugin /> : null}
      {enableCodeEditorPlugin ? <CodeEditorPlugin /> : null}
      {enableLinkPlugin ? <LinkPlugin /> : null}
    </>
  )
}

function CodeEditorPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createCodeEditorBehaviors({
      moveBlockUpShortcut: 'Alt+ArrowUp',
      moveBlockDownShortcut: 'Alt+ArrowDown',
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}

function LinkPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createLinkBehaviors({
      linkAnnotation: ({schema, url}) => {
        const name = schema.annotations.find(
          (annotation) => annotation.name === 'link',
        )?.name
        return name ? {name, value: {href: url}} : undefined
      },
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
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

function ToggleReadOnly(props: {readOnly: boolean}) {
  const editor = useEditor()

  return (
    <Switch
      isSelected={props.readOnly}
      onChange={() => {
        editor.send({type: 'update readOnly', readOnly: !props.readOnly})
      }}
    >
      <code>readOnly</code>
    </Switch>
  )
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
  const enableDragHandles = useSelector(
    featureFlags,
    (s) => s.context.enableDragHandles,
  )
  const editor = useEditor()
  const readOnly = useEditorSelector(editor, (s) => s.context.readOnly)
  const listIndex = useEditorSelector(
    editor,
    selectors.getListIndex({path: props.path}),
  )

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

  return (
    <div
      {...(listIndex !== undefined
        ? {
            'data-list-index': listIndex,
          }
        : {})}
    >
      {children}
    </div>
  )
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
