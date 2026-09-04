import {
  useEditor,
  useEditorSelector,
  type RangeDecorationRenderProps,
  type RegistrableRangeDecoration,
} from '@portabletext/editor'
import {
  defineRangeDecoration,
  RangeDecorationWidget,
  useRangeDecorationLayer,
} from '@portabletext/plugin-range-decorations'
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

/**
 * Reports this editor's selection to the playground machine and renders
 * every *other* editor's selection through `useRangeDecorationLayer`.
 * Each peer keystroke changes the `rangeDecorations` array this plugin
 * passes down, which is exactly the reference-swap `update()`
 * re-pointing the hook exists to exercise.
 *
 * The returned layer handle is registered on the playground machine so
 * the Inspector's Decorations tab can read its live positions. This
 * component itself never calls `useRangeDecorations`, so peer movement,
 * which updates the layer's `current` on every settled edit, never
 * re-renders it.
 */
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

  const editors = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.editors,
  )
  const selections = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.selections,
  )

  const rangeDecorations = useMemo<Array<RegistrableRangeDecoration>>(
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
          defineRangeDecoration({
            id: otherEditor.id,
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

  const layer = useRangeDecorationLayer({rangeDecorations})

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
  props: RangeDecorationRenderProps & {color: string; editorId: string},
) {
  return (
    <>
      <RangeDecorationWidget
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
      </RangeDecorationWidget>
      {props.children}
    </>
  )
}
