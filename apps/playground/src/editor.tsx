import {
  BlockDecoratorRenderProps,
  Patch,
  PortableTextEditable,
  PortableTextEditor,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderListItemFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
} from '@portabletext/editor'
import {PortableTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import {TrashIcon} from 'lucide-react'
import {useEffect, useMemo, useState} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {reverse} from 'remeda'
import {Subject} from 'rxjs'
import {Button} from './components/button'
import {Spinner} from './components/spinner'
import {Switch} from './components/switch'
import {Toolbar} from './components/toolbar'
import {Tooltip} from './components/tooltip'
import {EditorPatchesPreview} from './editor-patches-preview'
import {EditorPortableTextPreview} from './editor-portable-text-preview'
import {EditorActorRef} from './playground-machine'
import {PortableTextToolbar} from './portable-text-toolbar'
import {LinkAnnotationSchema, schema} from './schema'
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
  const patchesReceived = useSelector(props.editorRef, (s) => reverse(s.context.patchesReceived))
  const patches$ = useMemo(
    () =>
      new Subject<{
        patches: Array<Patch>
        snapshot: Array<PortableTextBlock> | undefined
      }>(),
    [],
  )
  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      patches$.next({
        patches: event.patches,
        snapshot: event.snapshot,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [patches$, props.editorRef])
  const [loading, setLoading] = useState(false)

  return (
    <div
      data-testid={props.editorRef.id}
      className="grid gap-2 items-start grid-cols-1 md:grid-cols-2 border p-2 shadow-sm"
    >
      <PortableTextEditor
        value={value}
        patches$={patches$}
        onChange={(change) => {
          if (change.type === 'mutation') {
            props.editorRef.send(change)
          }
          if (change.type === 'loading') {
            setLoading(change.isLoading)
          }
        }}
        schemaType={schema}
      >
        <div className="flex flex-col gap-2">
          <PortableTextToolbar />
          <div className="flex gap-2 items-center">
            <div className="flex-1 p-2 border">
              <PortableTextEditable
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
            </div>
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
          <Toolbar className="justify-end">
            <Switch
              isSelected={showingPatchesPreview}
              onChange={() => {
                props.editorRef.send({type: 'toggle patches preview'})
              }}
            >
              Patches
            </Switch>
            <Switch
              isSelected={showingValuePreview}
              onChange={() => {
                props.editorRef.send({type: 'toggle value preview'})
              }}
            >
              Value
            </Switch>
            <Switch
              isSelected={showingSelectionPreivew}
              onChange={() => {
                props.editorRef.send({type: 'toggle selection preview'})
              }}
            >
              Selection
            </Switch>
          </Toolbar>
          {showingPatchesPreview ? <EditorPatchesPreview patches={patchesReceived} /> : null}
          {showingValuePreview ? (
            <EditorPortableTextPreview editorId={props.editorRef.id} value={value} />
          ) : null}
          {showingSelectionPreivew ? <SelectionPreview editorId={props.editorRef.id} /> : null}
        </div>
      </PortableTextEditor>
    </div>
  )
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  const linkAnnotation = LinkAnnotationSchema.safeParse(props).data

  if (linkAnnotation) {
    return (
      <a className="text-blue-800 underline" href={linkAnnotation.value.href}>
        {props.children}
      </a>
    )
  } else {
    return props.children
  }
}

const renderBlock: RenderBlockFunction = (props) => {
  return props.children
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  return (decoratorMap.get(props.value) ?? ((props) => props.children))(props)
}

const renderChild: RenderChildFunction = (props) => {
  return props.children
}

const renderListItem: RenderListItemFunction = (props) => {
  return props.children
}

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-slate-400">Type something</span>
)

const renderStyle: RenderStyleFunction = (props) => {
  return props.children
}

const decoratorMap: Map<string, (props: BlockDecoratorRenderProps) => JSX.Element> = new Map([
  ['strong', (props) => <strong>{props.children}</strong>],
  ['em', (props) => <em>{props.children}</em>],
  ['code', (props) => <code>{props.children}</code>],
  ['underline', (props) => <span style={{textDecoration: 'underline'}}>{props.children}</span>],
  [
    'strike-through',
    (props) => <span style={{textDecorationLine: 'line-through'}}>{props.children}</span>,
  ],
])
