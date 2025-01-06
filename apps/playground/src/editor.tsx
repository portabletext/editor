import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type BlockDecoratorRenderProps,
  type BlockStyleRenderProps,
  type EditorEmittedEvent,
  type PortableTextBlock,
  type RenderAnnotationFunction,
  type RenderBlockFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {
  createCodeEditorBehaviors,
  createEmojiPickerBehaviors,
  createLinkBehaviors,
  createMarkdownBehaviors,
} from '@portabletext/editor/behaviors'
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
import {EmojiListBox} from './emoji-picker'
import {matchEmojis, type EmojiMatch} from './emoji-search'
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
import {wait} from './wait'

export function Editor(props: {editorRef: EditorActorRef}) {
  const showingPatchesPreview = useSelector(props.editorRef, (s) =>
    s.matches({'patches preview': 'shown'}),
  )
  const showingSelectionPreivew = useSelector(props.editorRef, (s) =>
    s.matches({'selection preview': 'shown'}),
  )
  const color = useSelector(props.editorRef, (s) => s.context.color)
  const value = useSelector(props.editorRef, (s) => s.context.value)
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s.context.keyGenerator,
  )
  const [loading, setLoading] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const patchesReceived = useSelector(props.editorRef, (s) =>
    reverse(s.context.patchesReceived),
  )
  const [enableMarkdownPlugin, setEnableMarkdownPlugin] = useState(false)
  const [enableEmojiPickerPlugin, setEnableEmojiPickerPlugin] = useState(false)
  const [enableCodeEditorPlugin, setEnableCodeEditorPlugin] = useState(false)
  const [enableLinkPlugin, setEnableLinkPlugin] = useState(false)

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
          {enableMarkdownPlugin ? <MarkdownPlugin /> : null}
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
            {enableCodeEditorPlugin ? <CodeEditorPlugin /> : null}
            {enableLinkPlugin ? <LinkPlugin /> : null}
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{area: 'PortableTextEditable'}}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <PortableTextEditable
                  className="flex-1 p-2 border"
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
                  renderBlock={renderBlock}
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
          <div className="flex flex-col gap-2">
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
                isSelected={enableEmojiPickerPlugin}
                onChange={() => {
                  setEnableEmojiPickerPlugin(!enableEmojiPickerPlugin)
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
          </div>
        </EditorProvider>
      </ErrorBoundary>
    </div>
  )
}

function MarkdownPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createMarkdownBehaviors({
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
        schema.styles.find((style) => style.value === 'blockquote')?.value,
      unorderedListStyle: ({schema}) =>
        schema.lists.find((list) => list.value === 'bullet')?.value,
      orderedListStyle: ({schema}) =>
        schema.lists.find((list) => list.value === 'number')?.value,
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

function EmojiPickerPlugin() {
  const editor = useEditor()
  const [emojiMatches, setEmojiMatches] = useState<Array<EmojiMatch>>([])
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0)

  useEffect(() => {
    const behaviors = createEmojiPickerBehaviors({
      matchEmojis: ({keyword}) => matchEmojis(keyword),
      onMatchesChanged: ({matches}) => {
        setEmojiMatches(matches)
      },
      onSelectedIndexChanged: ({selectedIndex}) => {
        setSelectedEmojiIndex(selectedIndex)
      },
      parseMatch: ({match}) => match.emoji,
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

  return (
    <EmojiListBox matches={emojiMatches} selectedIndex={selectedEmojiIndex} />
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
  const editor = useEditor()

  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      editor.send(event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorRef, editor])

  useEffect(() => {
    const subscription = editor.on('*', props.on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.on])

  useEffect(() => {
    editor.send({
      type: 'update value',
      value: props.value,
    })
  }, [editor, props.value])

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

const renderBlock: RenderBlockFunction = (props) => {
  if (props.schemaType.name === 'break') {
    return (
      <Separator
        orientation="horizontal"
        className={`h-1 my-2${props.selected ? ' bg-blue-300 ' : ''}`}
      />
    )
  }

  const image = ImageSchema.safeParse(props).data

  if (image) {
    return (
      <div
        className={`flex items-center gap-1 border-2 rounded px-1 text-sm my-2${props.selected ? ' border-blue-300' : ''}`}
      >
        <ImageIcon className="size-4" />
        {image.value.url}
      </div>
    )
  }

  return props.children
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
