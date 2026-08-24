import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
  type RangeDecoration,
} from '@portabletext/editor'
import {
  getSelectedTextBlocks,
  getSelection,
} from '@portabletext/editor/selectors'
import {isEqualSelections} from '@portabletext/editor/utils'
import {stringifyPath} from '@sanity/json-match'
import {
  useCommentActions,
  useComments,
  type Comment,
  type CommentMessage,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import {
  relativeCommentPath,
  resolveCommentSelections,
  type AnchoredComment,
} from './comments-anchoring'
import {
  buildStoredSelection,
  type SelectedTextBlock,
} from './comments-selection'
import {arrayifyPath} from './plugin.sdk-value'

const NO_MOVES: Record<string, EditorSelection> = {}

/**
 * Anchors count as unchanged when every comment still sits at the same spot,
 * so resolving on each editor emission only re-renders when a highlight
 * actually needs to draw somewhere else.
 */
function sameAnchors(a: AnchoredComment[], b: AnchoredComment[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((anchor, index) => {
    const other = b[index]
    return (
      anchor.commentId === other.commentId &&
      samePoint(anchor.selection.anchor, other.selection.anchor) &&
      samePoint(anchor.selection.focus, other.selection.focus)
    )
  })
}

function samePoint(
  a: {path: unknown[]; offset: number},
  b: {path: unknown[]; offset: number},
): boolean {
  if (a.offset !== b.offset || a.path.length !== b.path.length) {
    return false
  }
  return a.path.every((segment, index) => {
    const other = b.path[index]
    if (
      typeof segment === 'object' &&
      segment !== null &&
      typeof other === 'object' &&
      other !== null
    ) {
      return (
        (segment as {_key?: string})._key === (other as {_key?: string})._key
      )
    }
    return segment === other
  })
}

/**
 * Draws one comment's highlight. The plugin has no opinion about how a
 * highlight looks, so it is the caller's to provide, the same way presence
 * takes `renderCursor`.
 *
 * @public
 */
export type RenderCommentDecorationFunction = (
  comment: Comment,
) => (props: PropsWithChildren) => ReactElement

/**
 * Options for {@link useSDKCommentDecorations}.
 *
 * @public
 */
export interface UseSDKCommentDecorationsOptions extends DocumentHandle {
  /**
   * The document path of the Portable Text field, for example `content`. The
   * same form `SDKValuePlugin` takes.
   */
  path: string
  renderDecoration: RenderCommentDecorationFunction
}

/**
 * Inline comment highlights for a Portable Text field, as range decorations.
 *
 * Pass the result to `<PortableTextEditable rangeDecorations={...} />`. Each
 * thread's first comment that carries a text anchor on this field gets one
 * decoration. Highlights stay put while the local user types, and a highlight
 * whose text has been deleted or rewritten beyond recognition is dropped
 * rather than drawn on the wrong words.
 *
 * Suspends while the document's comments load, like every SDK read hook.
 *
 * Resolved threads draw nothing: this mirrors the Studio, where resolving a
 * thread removes its highlight from the text.
 *
 * @public
 */
export function useSDKCommentDecorations(
  options: UseSDKCommentDecorationsOptions,
): RangeDecoration[] {
  const {path, renderDecoration, ...handle} = options
  const editor = useEditor()
  const {comments} = useComments({...handle})

  const inline = useMemo(() => {
    const basePath = arrayifyPath(path)
    return comments.flatMap((comment) => {
      if (
        comment.parentCommentId ||
        !comment.selection ||
        comment.status !== 'open'
      ) {
        return []
      }
      const relativePath = relativeCommentPath(basePath, comment.fieldPath)
      if (relativePath === undefined) {
        return []
      }
      return [{comment, relativePath, selection: comment.selection}]
    })
  }, [comments, path])

  // Resolved inside the selector so every resolution reads the text as it is
  // right now. Anything less fresh mis-anchors a comment written on text typed
  // since the staler reading, and on first load finds nothing at all, since
  // the field's value can arrive after the comments do. The anchor equality
  // keeps re-renders to actual highlight changes, and positions the editor is
  // already tracking through `onMoved` win over these resolutions anyway.
  const resolveAnchors = useCallback(
    (snapshot: {context: {value: unknown[]}}) =>
      resolveCommentSelections({
        value: snapshot.context.value,
        comments: inline.map(({comment, relativePath, selection}) => ({
          commentId: comment.id,
          relativePath,
          selection,
        })),
      }),
    [inline],
  )
  const anchored = useEditorSelector(editor, resolveAnchors, sameAnchors)

  // Moves are remembered against the comment list they were reported for, so a
  // re-resolution wins over stale positions without a state reset.
  const [moved, setMoved] = useState<{
    forComments: typeof inline
    selections: Record<string, EditorSelection>
  }>({forComments: inline, selections: {}})
  const movedSelections =
    moved.forComments === inline ? moved.selections : NO_MOVES

  return useMemo(() => {
    const commentsById = new Map(
      inline.map(({comment}) => [comment.id, comment]),
    )

    return anchored.flatMap((anchor) => {
      const comment = commentsById.get(anchor.commentId)
      if (!comment) {
        return []
      }

      const movedSelection = movedSelections[anchor.commentId]
      const selection =
        movedSelection === undefined ? anchor.selection : movedSelection
      if (selection === null) {
        // The editor reported the range lost, for example its text was deleted.
        return []
      }

      return [
        {
          component: renderDecoration(comment),
          selection,
          onMoved: ({newSelection}) => {
            setMoved((previous) => ({
              forComments: inline,
              selections: {
                ...(previous.forComments === inline ? previous.selections : {}),
                [anchor.commentId]: newSelection,
              },
            }))
          },
          payload: {commentId: anchor.commentId},
        } satisfies RangeDecoration,
      ]
    })
  }, [anchored, inline, movedSelections, renderDecoration])
}

/**
 * Options for {@link useSDKCommentAuthoring}.
 *
 * @public
 */
export interface UseSDKCommentAuthoringOptions extends DocumentHandle {
  /**
   * The document path of the Portable Text field, for example `content`.
   */
  path: string
}

/**
 * What {@link useSDKCommentAuthoring} returns.
 *
 * @public
 */
export interface SDKCommentAuthoring {
  /**
   * The current selection when it can take a comment, `null` otherwise. Show
   * the comment affordance when this is set, and position it off the
   * selection. A selection can take a comment when it is expanded, contains
   * text, and stays within one array of blocks.
   */
  commentableSelection: EditorSelection
  /**
   * Starts a comment thread anchored to the text selected right now.
   *
   * The anchor is captured from the live selection at call time, so call this
   * from the affordance while the selection still stands. Rejects when nothing
   * commentable is selected.
   */
  createInlineComment: (options: {
    message: CommentMessage
    /** Reuse the id of a failed comment to retry it. */
    commentId?: string
  }) => Promise<Comment>
}

/** Reports the selection when it can take a comment, `null` otherwise. */
function getCommentableSelection(
  snapshot: Parameters<typeof getSelection>[0],
): EditorSelection {
  const selection = getSelection(snapshot)
  const built = buildStoredSelection({
    selection,
    selectedBlocks: getSelectedTextBlocks(snapshot) as SelectedTextBlock[],
  })
  return built ? selection : null
}

/**
 * Lets the app author inline comments on a Portable Text field.
 *
 * The plugin captures the selection and writes the comment; the composer UI is
 * the app's, the same split the Studio and Canvas use. Comments are written in
 * the shape the Studio stores, so a thread started here shows up there.
 *
 * @public
 */
export function useSDKCommentAuthoring(
  options: UseSDKCommentAuthoringOptions,
): SDKCommentAuthoring {
  const {path, ...handle} = options
  const editor = useEditor()
  const {createComment} = useCommentActions()

  const commentableSelection = useEditorSelector(
    editor,
    getCommentableSelection,
    isEqualSelections,
  )

  return {
    commentableSelection,
    createInlineComment: ({message, commentId}) => {
      const snapshot = editor.getSnapshot()
      const built = buildStoredSelection({
        selection: getSelection(snapshot),
        selectedBlocks: getSelectedTextBlocks(snapshot) as SelectedTextBlock[],
      })
      if (!built) {
        return Promise.reject(
          new Error(
            'Nothing commentable is selected, so there is nothing to anchor the comment to.',
          ),
        )
      }

      return createComment({
        ...handle,
        fieldPath: stringifyPath([
          ...arrayifyPath(path),
          ...built.containerPath,
        ]),
        selection: built.selection,
        message,
        ...(commentId === undefined ? {} : {commentId}),
      })
    },
  }
}
