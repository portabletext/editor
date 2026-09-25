import {
  defineDecoration,
  useEditor,
  useEditorSelector,
  type Decoration,
  type DecorationRenderProps,
} from '@portabletext/editor'
import {
  DecorationWidget,
  useDecorationLayer,
} from '@portabletext/plugin-decorations'
import {useSelector} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import type {EditorActorRef, PlaygroundActorRef} from '../playground-machine'

// No blues: a blue tint at low alpha is indistinguishable from the
// native selection highlight.
const presenceColors = [
  '#f97316',
  '#ec4899',
  '#10b981',
  '#a855f7',
  '#eab308',
  '#ef4444',
]

const CARET_DOT_SIZE = 6

export function getCaretColor(editorId: string): string {
  let hash = 0
  for (let index = 0; index < editorId.length; index++) {
    hash = (hash * 31 + editorId.charCodeAt(index)) % 1000003
  }
  return presenceColors[hash % presenceColors.length]
}

/** Never subscribes to its own layer with `useDecorations`: that would re-render this plugin on every local edit that shifts a peer caret. The Inspector's Decorations tab subscribes instead. */
export function PresencePlugin(props: {
  editorRef: EditorActorRef
  playgroundRef: PlaygroundActorRef
}) {
  const editor = useEditor()
  const selection = useEditorSelector(editor, (s) => s.context.selection)

  useEffect(() => {
    props.playgroundRef.send({
      type: 'update selection',
      editorId: props.editorRef.id,
      selection,
    })
  }, [props.playgroundRef, props.editorRef.id, selection])

  useEffect(() => {
    return () => {
      props.playgroundRef.send({
        type: 'update selection',
        editorId: props.editorRef.id,
        selection: null,
      })
    }
  }, [props.playgroundRef, props.editorRef.id])

  const editors = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.editors,
  )
  const selections = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.selections,
  )

  const decorations = useMemo<Array<Decoration>>(
    () =>
      editors.flatMap((otherEditor) => {
        if (otherEditor.id === props.editorRef.id) {
          return []
        }
        const otherSelection = selections[otherEditor.id]
        if (!otherSelection) {
          return []
        }
        return [
          defineDecoration({
            id: otherEditor.id,
            type: 'range',
            range: {
              anchor: otherSelection.focus,
              focus: otherSelection.focus,
            },
            render: (renderProps) => (
              <PresenceCaret
                {...renderProps}
                color={getCaretColor(otherEditor.id)}
                editorId={otherEditor.id}
              />
            ),
          }),
        ]
      }),
    [editors, selections, props.editorRef.id],
  )

  const layer = useDecorationLayer({decorations})

  useEffect(() => {
    props.playgroundRef.send({
      type: 'register layer',
      editorId: props.editorRef.id,
      kind: 'presence',
      layer,
    })
    return () => {
      props.playgroundRef.send({
        type: 'unregister layer',
        editorId: props.editorRef.id,
        kind: 'presence',
      })
    }
  }, [props.playgroundRef, props.editorRef.id, layer])

  return null
}

function PresenceCaret(
  props: DecorationRenderProps & {color: string; editorId: string},
) {
  return (
    <>
      <DecorationWidget
        style={{borderLeft: `2px solid ${props.color}`, marginLeft: -1}}
      >
        <span
          style={{
            backgroundColor: props.color,
            borderRadius: '50%',
            height: CARET_DOT_SIZE,
            left: -1,
            pointerEvents: 'auto',
            position: 'absolute',
            top: -(CARET_DOT_SIZE - 1),
            transform: 'translateX(-50%)',
            width: CARET_DOT_SIZE,
          }}
          title={props.editorId}
        />
      </DecorationWidget>
      {props.children}
    </>
  )
}
