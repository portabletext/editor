import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
  type EditorSelectionPoint,
  type RangeDecorationRenderProps,
} from '@portabletext/editor'
import {
  defineRangeDecoration,
  useRangeDecorationLayer,
  useRangeDecorations,
  type RangeDecorationLayer,
} from '@portabletext/plugin-range-decorations'
import {useSelector} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import type {EditorActorRef, PlaygroundActorRef} from '../playground-machine'
import {getSelectionText} from '../selection-text'

/**
 * Registers this editor's range-decoration layer for the shared comment
 * list (`useRangeDecorationLayer`, since this module also reads the
 * layer's live positions), registers the same handle on the playground
 * machine for the Inspector's Decorations tab, and renders this editor's
 * live view of the layer.
 *
 * `moved`/`content-changed`/`lost` events are written back to the
 * playground machine only for `origin === 'local'`: the editor that made
 * the edit is the one that reports where its own comments landed and
 * what they now read, so the same edit isn't reported twice when it
 * later arrives at sibling editors as `'remote'` patches.
 */
export function CommentsPlugin(props: {
  editorRef: EditorActorRef
  playgroundRef: PlaygroundActorRef
}) {
  const editor = useEditor()
  const comments = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.comments,
  )

  const layer = useRangeDecorationLayer({
    rangeDecorations: useMemo(
      () =>
        comments
          .filter((comment) => comment.status === 'active')
          .map((comment) =>
            defineRangeDecoration({
              id: comment.id,
              range: comment.range,
              render: (renderProps) => <CommentHighlight {...renderProps} />,
            }),
          ),
      [comments],
    ),
    on: (events) => {
      for (const event of events) {
        if (event.origin !== 'local') {
          continue
        }
        if (event.type === 'moved') {
          props.playgroundRef.send({
            type: 'update comment range',
            id: event.rangeDecoration.id,
            range: event.newRange,
          })
        }
        if (event.type === 'content-changed') {
          const snapshot = editor.getSnapshot()
          props.playgroundRef.send({
            type: 'refresh comment text',
            id: event.rangeDecoration.id,
            text: getSelectionText(
              snapshot.context,
              snapshot.context.value,
              event.range,
            ),
          })
        }
        if (event.type === 'lost') {
          props.playgroundRef.send({
            type: 'orphan comment',
            id: event.rangeDecoration.id,
          })
        }
      }
    },
  })

  useEffect(() => {
    props.playgroundRef.send({
      type: 'register layer',
      editorId: props.editorRef.id,
      kind: 'comments',
      layer,
    })
    return () => {
      props.playgroundRef.send({
        type: 'unregister layer',
        editorId: props.editorRef.id,
        kind: 'comments',
      })
    }
  }, [props.playgroundRef, props.editorRef.id, layer])

  const value = useEditorSelector(editor, (s) => s.context.value)

  useEffect(() => {
    const schema = editor.getSnapshot().context.schema
    for (const comment of comments) {
      if (comment.status !== 'orphaned' || comment.snapshotText === undefined) {
        continue
      }
      const text = getSelectionText({schema}, value, comment.range)
      if (text === comment.snapshotText) {
        props.playgroundRef.send({type: 'reactivate comment', id: comment.id})
      }
    }
  }, [editor, value, comments, props.playgroundRef])

  return <CommentsLiveLine layer={layer} />
}

function CommentHighlight(props: RangeDecorationRenderProps) {
  return (
    <span className="rounded-sm bg-amber-500/15 dark:bg-amber-400/10 border-b-2 border-amber-400 dark:border-amber-500/70">
      {props.children}
    </span>
  )
}

/**
 * Live per-editor read of the shared layer: this is the demo that
 * `useRangeDecorations` reflects edit-adjusted ranges without a round
 * trip through the playground machine.
 */
function CommentsLiveLine(props: {layer: RangeDecorationLayer}) {
  const livePositions = useRangeDecorations(props.layer)

  if (livePositions.length === 0) {
    return null
  }

  const count = livePositions.length

  return (
    <div className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
      {count} comment{count === 1 ? '' : 's'} ·{' '}
      <span className="font-mono">
        {livePositions
          .map((position) => formatRange(position.range))
          .join(' · ')}
      </span>
    </div>
  )
}

export function formatRange(range: NonNullable<EditorSelection>) {
  const anchorKey = blockKey(range.anchor.path)
  const focusKey = blockKey(range.focus.path)
  return anchorKey === focusKey
    ? `${anchorKey} ${range.anchor.offset}–${range.focus.offset}`
    : `${anchorKey} ${range.anchor.offset} – ${focusKey} ${range.focus.offset}`
}

function blockKey(path: EditorSelectionPoint['path']) {
  const segment = path[0]
  return typeof segment === 'object' && segment !== null && '_key' in segment
    ? String(segment._key)
    : '?'
}
