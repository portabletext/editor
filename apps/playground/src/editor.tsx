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
  type RenderAnnotationFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {
  createCodeEditorBehaviors,
  createLinkBehaviors,
} from '@portabletext/editor/behaviors'
import {MarkdownPlugin, OneLinePlugin} from '@portabletext/editor/plugins'
import {useSelector} from '@xstate/react'
import {CopyIcon, ImageIcon, TrashIcon} from 'lucide-react'
import {useEffect, useState, type JSX} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {reverse} from 'remeda'
import {Button} from './components/button'
import {ErrorBoundary} from './components/error-boundary'
import {ErrorScreen} from './components/error-screen'
import {Separator} from './components/separator'
import {Spinner} from './components/spinner'
import {Switch} from './components/switch'
import {Toolbar} from './components/toolbar'
import {Tooltip} from './components/tooltip'
import {EditorPatchesPreview} from './editor-patches-preview'
import './editor.css'
import {createStore} from '@xstate/store'
import {EmojiPickerPlugin} from './emoji-picker'
import type {EditorActorRef} from './playground-machine'
import {PortableTextToolbar} from './portable-text-toolbar'
import {
  CommentAnnotationSchema,
  ImageSchema,
  LinkAnnotationSchema,
  schemaDefinition,
  StockTickerSchema,
} from './schema'
import {SelectionPreview} from './selection-preview'
import {ValuePreview} from './value-preview'
import {wait} from './wait'

const featureFlags = createStore({
  context: {
    enableDragHandles: false,
  },
  on: {
    toggleDragHandles: (context) => ({
      ...context,
      enableDragHandles: !context.enableDragHandles,
    }),
  },
})

export function Editor(props: {editorRef: EditorActorRef}) {
  const color = useSelector(props.editorRef, (s) => s.context.color)
  const value = useSelector(props.editorRef, (s) => s.context.value)
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s.context.keyGenerator,
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
      className="grid gap-2 items-start grid-cols-1 md:grid-cols-2 border p-2 shadow-sm"
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
            schemaDefinition,
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
          <div className="flex flex-col gap-2">
            <PortableTextToolbar schemaDefinition={schemaDefinition} />
            {enableEmojiPickerPlugin ? <EmojiPickerPlugin /> : null}
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{area: 'PortableTextEditable'}}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <PortableTextEditable
                  className={`flex-1 p-2 ${enableDragHandles ? 'ps-5' : ''} border`}
                  style={{maxHeight: '50vh', overflowY: 'auto'}}
                  onPaste={(data) => {
                    const text = data.event.clipboardData.getData('text')
                    if (text === 'heading') {
                      return wait(2000).then(() => ({
                        insert: [
                          {
                            _type: 'block',
                            children: [{_type: 'span', text: 'heading'}],
                            style: 'h1',
                          },
                        ],
                      }))
                    }
                  }}
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
            <div className="flex gap-2 items-center">
              <span
                style={{backgroundColor: color}}
                className="py-0.5 border px-2 rounded-full text-xs shrink-0 self-start font-mono"
              >
                ID: <strong>{props.editorRef.id}</strong>
              </span>
              <TooltipTrigger>
                <Button
                  size="sm"
                  variant="destructive"
                  onPress={() => {
                    props.editorRef.send({type: 'remove'})
                  }}
                >
                  <TrashIcon className="w-3 h-3" />
                </Button>
                <Tooltip>Remove editor</Tooltip>
              </TooltipTrigger>
              <ToggleReadOnly readOnly={readOnly} />
            </div>
          </div>
          <EditorPlaygroundToolbar
            editorRef={props.editorRef}
            enableEmojiPickerPlugin={enableEmojiPickerPlugin}
            setEnableEmojiPickerPlugin={setEnableEmojiPickerPlugin}
          />
        </EditorProvider>
      </ErrorBoundary>
    </div>
  )
}

function EditorPlaygroundToolbar(props: {
  editorRef: EditorActorRef
  enableEmojiPickerPlugin: boolean
  setEnableEmojiPickerPlugin: (enable: boolean) => void
}) {
  const editor = useEditor()
  const provokeDuplicateKeys = useSelector(props.editorRef, (s) =>
    s.matches({'key generator': 'duplicate'}),
  )
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

  return (
    <>
      <div className="flex flex-col gap-2">
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
            isSelected={provokeDuplicateKeys}
            onChange={(isSelected) => {
              props.editorRef.send({type: 'toggle key generator'})
              if (isSelected) {
                editor.send({
                  type: 'update key generator',
                  keyGenerator: () => 'key',
                })
              } else {
                editor.send({
                  type: 'update key generator',
                  keyGenerator:
                    props.editorRef.getSnapshot().context.keyGenerator,
                })
              }
            }}
          >
            Provoke duplicate keys
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
      </div>
      {enableMarkdownPlugin ? (
        <MarkdownPlugin
          config={{
            boldDecorator: ({schema}) =>
              schema.decorators.find(
                (decorator) => decorator.value === 'strong',
              )?.value,
            codeDecorator: ({schema}) =>
              schema.decorators.find((decorator) => decorator.value === 'code')
                ?.value,
            italicDecorator: ({schema}) =>
              schema.decorators.find((decorator) => decorator.value === 'em')
                ?.value,
            strikeThroughDecorator: ({schema}) =>
              schema.decorators.find(
                (decorator) => decorator.value === 'strike-through',
              )?.value,
            horizontalRuleObject: ({schema}) => {
              const name = schema.blockObjects.find(
                (object) => object.name === 'break',
              )?.name
              return name ? {name} : undefined
            },
            defaultStyle: ({schema}) => schema.styles[0].value,
            headingStyle: ({schema, level}) =>
              schema.styles.find((style) => style.value === `h${level}`)?.value,
            blockquoteStyle: ({schema}) =>
              schema.styles.find((style) => style.value === 'blockquote')
                ?.value,
            unorderedListStyle: ({schema}) =>
              schema.lists.find((list) => list.value === 'bullet')?.value,
            orderedListStyle: ({schema}) =>
              schema.lists.find((list) => list.value === 'number')?.value,
          }}
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

const RenderBlock = (props: BlockRenderProps) => {
  const enableDragHandles = useSelector(
    featureFlags,
    (s) => s.context.enableDragHandles,
  )
  const editor = useEditor()
  const readOnly = useEditorSelector(editor, (s) => s.context.readOnly)

  let children = props.children

  if (props.schemaType.name === 'break') {
    children = (
      <Separator
        orientation="horizontal"
        className={`h-1 my-2${props.selected ? ' bg-blue-300 ' : ''}`}
      />
    )
  }

  const image = ImageSchema.safeParse(props).data

  if (image) {
    children = (
      <div
        className={`flex items-center gap-1 border-2 rounded px-1 text-sm my-2${props.selected ? ' border-blue-300' : ''}`}
      >
        <ImageIcon className="size-4" />
        {image.value.url}
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
        />
        <div>{children}</div>
      </div>
    )
  }

  return children
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  return (decoratorMap.get(props.value) ?? ((props) => props.children))(props)
}

const renderChild: RenderChildFunction = (props) => {
  const stockTicker = StockTickerSchema.safeParse(props).data

  if (stockTicker) {
    return (
      <span
        className={`border-2 rounded px-1 font-mono text-sm${props.selected ? ' border-blue-300' : ''}`}
      >
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
    ['normal', (props) => <p className="mb-1">{props.children}</p>],
    [
      'h1',
      (props) => <h1 className="mb-1 font-bold text-5xl">{props.children}</h1>,
    ],
    [
      'h2',
      (props) => <h2 className="mb-1 font-bold text-4xl">{props.children}</h2>,
    ],
    [
      'h3',
      (props) => <h3 className="mb-1 font-bold text-3xl">{props.children}</h3>,
    ],
    [
      'h4',
      (props) => <h4 className="mb-1 font-bold text-2xl">{props.children}</h4>,
    ],
    [
      'h5',
      (props) => <h5 className="mb-1 font-bold text-xl">{props.children}</h5>,
    ],
    [
      'h6',
      (props) => <h6 className="mb-1 font-bold text-lg">{props.children}</h6>,
    ],
    [
      'blockquote',
      (props) => (
        <blockquote className="mb-1 pl-2 py-1 border-slate-300 border-l-4">
          {props.children}
        </blockquote>
      ),
    ],
  ])
