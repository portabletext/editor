import {
  createMarkdownBehaviors,
  PortableTextEditable,
  PortableTextEditor,
  useEditor,
  type BlockDecoratorRenderProps,
  type BlockStyleRenderProps,
  type RenderAnnotationFunction,
  type RenderBlockFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {useSelector} from '@xstate/react'
import {CopyIcon, ImageIcon, TrashIcon} from 'lucide-react'
import {useEffect, useState} from 'react'
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
import {EditorPortableTextPreview} from './editor-portable-text-preview'
import './editor.css'
import type {EditorActorRef} from './playground-machine'
import {PortableTextToolbar} from './portable-text-toolbar'
import {
  CommentAnnotationSchema,
  ImageSchema,
  LinkAnnotationSchema,
  schema,
  StockTickerSchema,
} from './schema'
import {SelectionPreview} from './selection-preview'
import {wait} from './wait'

export function Editor(props: {editorRef: EditorActorRef}) {
  const showingPatchesPreview = useSelector(props.editorRef, (s) =>
    s.matches({'patches preview': 'shown'}),
  )
  const showingValuePreview = useSelector(props.editorRef, (s) =>
    s.matches({'value preview': 'shown'}),
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
  const editor = useEditor({
    behaviors: createMarkdownBehaviors({
      mapDefaultStyle: (schema) => schema.styles[0].value,
      mapHeadingStyle: (schema, level) => schema.styles[level]?.value,
      mapBlockquoteStyle: (schema) =>
        schema.styles.find((style) => style.value === 'blockquote')?.value,
      mapUnorderedListStyle: (schema) =>
        schema.lists.find((list) => list.value === 'bullet')?.value,
      mapOrderedListStyle: (schema) =>
        schema.lists.find((list) => list.value === 'number')?.value,
    }),
    keyGenerator,
    schema,
  })
  const patchesReceived = useSelector(props.editorRef, (s) =>
    reverse(s.context.patchesReceived),
  )
  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      editor.send(event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorRef, editor])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const subscription = editor.on('*', (event) => {
      if (event.type === 'mutation') {
        props.editorRef.send(event)
      }
      if (event.type === 'loading') {
        setLoading(true)
      }
      if (event.type === 'done loading') {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, setLoading, props.editorRef])

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
        <PortableTextEditor editor={editor} value={value}>
          <div className="flex flex-col gap-2">
            <PortableTextToolbar />
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{area: 'PortableTextEditable'}}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <PortableTextEditable
                  className="flex-1 p-2 border"
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
            </div>
          </div>
          <div className="flex flex-col gap-2">
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
                isSelected={showingValuePreview}
                onChange={() => {
                  props.editorRef.send({type: 'toggle value preview'})
                }}
              >
                Value
              </Switch>
            </Toolbar>
            {showingValuePreview ? (
              <EditorPortableTextPreview
                editorId={props.editorRef.id}
                value={value}
              />
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
        </PortableTextEditor>
      </ErrorBoundary>
    </div>
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
