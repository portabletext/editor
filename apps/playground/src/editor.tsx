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
import {useEffect, useMemo, useState} from 'react'
import {Group} from 'react-aria-components'
import {reverse} from 'remeda'
import {Subject} from 'rxjs'
import {Button} from './components/button'
import {Separator} from './components/separator'
import {Spinner} from './components/spinner'
import {ToggleButton} from './components/toggle-button'
import {Toolbar} from './components/toolbar'
import {handlePaste} from './custom-paste-handler'
import {EditorPatchesPreview} from './editor-patches-preview'
import {EditorPortableTextPreview} from './editor-portable-text-preview'
import {EditorActorRef} from './playground-machine'
import {PortableTextToolbar} from './portable-text-toolbar'
import {LinkAnnotationSchema, schema} from './schema'
import {SelectionPreview} from './selection-preview'

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
    <div data-testid={props.editorRef.id} className="p-2 border-2 shadow-sm">
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
          <div className="flex justify-between gap-2 items-center flex-wrap">
            <span
              style={{backgroundColor: color}}
              className="py-1 px-2 rounded-lg text-sm shrink-0"
            >
              ID: {props.editorRef.id}
            </span>
            <Toolbar>
              <Group className="contents">
                <Button
                  variant="destructive"
                  onPress={() => {
                    props.editorRef.send({type: 'remove'})
                  }}
                >
                  Remove
                </Button>
              </Group>
              <Separator orientation="vertical" />
              <Group className="contents">
                <ToggleButton
                  isSelected={showingPatchesPreview}
                  onPress={() => {
                    props.editorRef.send({type: 'toggle patches preview'})
                  }}
                >
                  Patches
                </ToggleButton>
                <ToggleButton
                  isSelected={showingValuePreview}
                  onPress={() => {
                    props.editorRef.send({type: 'toggle value preview'})
                  }}
                >
                  Value
                </ToggleButton>
                <ToggleButton
                  isSelected={showingSelectionPreivew}
                  onPress={() => {
                    props.editorRef.send({type: 'toggle selection preview'})
                  }}
                >
                  Selection
                </ToggleButton>
              </Group>
            </Toolbar>
          </div>
          <Separator />
          <PortableTextToolbar />
          <div className="flex gap-2 items-center">
            <div className="flex-1 p-2 border">
              <PortableTextEditable
                onPaste={handlePaste}
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
