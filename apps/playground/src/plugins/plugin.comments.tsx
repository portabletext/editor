import {
  defineDecoration,
  useEditor,
  useEditorSelector,
  type DecorationRenderProps,
  type EditorSelection,
  type EditorSelectionPoint,
} from '@portabletext/editor'
import {
  useDecorationLayer,
  useDecorations,
  type DecorationLayer,
} from '@portabletext/plugin-decorations'
import {useSelector} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import type {EditorActorRef, PlaygroundActorRef} from '../playground-machine'
import {getSelectionText} from '../selection-text'

export function CommentsPlugin(props: {
  editorRef: EditorActorRef
  playgroundRef: PlaygroundActorRef
}) {
  const editor = useEditor()
  const comments = useSelector(
    props.playgroundRef,
    (snapshot) => snapshot.context.comments,
  )

  const layer = useDecorationLayer({
    decorations: useMemo(
      () =>
        comments
          .filter((comment) => comment.status === 'active')
          .map((comment) =>
            defineDecoration({
              id: comment.id,
              type: 'range',
              range: comment.range,
              render: (renderProps) => <CommentHighlight {...renderProps} />,
            }),
          ),
      [comments],
    ),
    on: (events) => {
      for (const event of events) {
        if (event.origin !== 'local') {
          // An echo of an edit the originating editor already reported as
          // `'local'`. Reporting it here would write it to the machine twice.
          continue
        }
        if (event.type === 'moved') {
          props.playgroundRef.send({
            type: 'update comment range',
            id: event.decoration.id,
            range: event.newRange,
          })
        }
        if (event.type === 'content-changed') {
          const snapshot = editor.getSnapshot()
          props.playgroundRef.send({
            type: 'refresh comment text',
            id: event.decoration.id,
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
            id: event.decoration.id,
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
      // The last text seen at the range, not the creation snapshot: an edit
      // inside the comment moves `currentText` on, and undoing the edit that
      // destroyed it restores that text, never the original.
      const lastKnownText = comment.currentText ?? comment.snapshotText
      if (comment.status !== 'orphaned' || lastKnownText === undefined) {
        continue
      }
      const text = getSelectionText({schema}, value, comment.range)
      if (text === lastKnownText) {
        props.playgroundRef.send({
          type: 'reactivate comment',
          id: comment.id,
          text,
        })
      }
    }
  }, [editor, value, comments, props.playgroundRef])

  return <CommentsLiveLine layer={layer} />
}

function CommentHighlight(props: DecorationRenderProps) {
  return (
    <span className="rounded-sm bg-amber-500/15 dark:bg-amber-400/10 border-b-2 border-amber-400 dark:border-amber-500/70">
      {props.children}
    </span>
  )
}

function CommentsLiveLine(props: {layer: DecorationLayer}) {
  const livePositions = useDecorations(props.layer)

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
