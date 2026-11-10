import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
} from '@portabletext/editor'
import {
  getSelectedTextBlocks,
  getSelection,
} from '@portabletext/editor/selectors'
import {
  isEqualSelectionPoints,
  isEqualSelections,
} from '@portabletext/editor/utils'
import {
  useDecorationLayer,
  type DecorationEvent,
  type DecorationLayer,
} from '@portabletext/plugin-decorations'
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
  useLayoutEffect,
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
      anchor.blockKey === other.blockKey &&
      anchor.memberIndex === other.memberIndex &&
      isEqualSelectionPoints(anchor.selection.anchor, other.selection.anchor) &&
      isEqualSelectionPoints(anchor.selection.focus, other.selection.focus)
    )
  })
}

/**
 * Draws one comment's highlight. The plugin has no opinion about how a
 * highlight looks, so it is the caller's to provide, the same way presence
 * takes `renderCursor`.
 *
 * The returned render is a plain function call, not a component: do not call
 * hooks in it. When you need hooks, return an element of your own component.
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
  /**
   * Returns the render for a comment's highlight. It is read when a highlight
   * is drawn, so a highlight already on screen keeps its look until it is
   * drawn again. A look that changes with app state belongs in your own
   * component, which can use hooks.
   */
  renderDecoration: RenderCommentDecorationFunction
}

/**
 * Props for {@link SDKCommentsPlugin}.
 *
 * @public
 */
export type SDKCommentsPluginProps = UseSDKCommentDecorationsOptions

/**
 * Draws inline comment highlights for a Portable Text field.
 *
 * Place it inside `EditorProvider`, next to `PortableTextEditable`, the way
 * `SDKValuePlugin` and `SDKPresencePlugin` are placed. It suspends while the
 * document's comments load, so wrap it in `Suspense` where the app should show
 * a fallback. Use `useSDKCommentDecorations` instead when a component of your
 * own needs the `DecorationLayer`.
 *
 * @public
 */
export function SDKCommentsPlugin(props: SDKCommentsPluginProps) {
  useSDKCommentDecorations(props)
  return null
}

/**
 * Registers and returns a decoration layer containing inline comment
 * highlights for a Portable Text field. Each thread's first comment that
 * carries a text anchor on this field gets one decoration per anchored block.
 * A highlight follows edits while its stored text still resolves. If that text
 * can no longer be found, the highlight stays hidden until any content in the
 * comment list changes, including replies and reactions. A content change
 * resolves and places every anchor again from its stored text.
 *
 * Suspends while the document's comments load, like every SDK read hook.
 *
 * Resolved threads draw nothing: this mirrors the Studio, where resolving a
 * thread removes its highlight from the text.
 *
 * Must run inside `EditorProvider`.
 *
 * @public
 */
export function useSDKCommentDecorations(
  options: UseSDKCommentDecorationsOptions,
): DecorationLayer {
  const {path, renderDecoration, ...handle} = options
  const editor = useEditor()
  const {comments} = useComments({...handle})
  const contentKey = JSON.stringify(comments)
  const [generation, setGeneration] = useState({
    comments,
    key: contentKey,
    number: 0,
  })
  if (generation.key !== contentKey) {
    setGeneration({comments, key: contentKey, number: generation.number + 1})
  }
  const currentGeneration =
    generation.key === contentKey
      ? generation
      : {comments, key: contentKey, number: generation.number + 1}
  const commentsKey = String(currentGeneration.number)
  const commentsByContent = currentGeneration.comments

  const inline = useMemo(() => {
    const basePath = arrayifyPath(path)
    return commentsByContent.flatMap((comment) => {
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
  }, [commentsByContent, path])

  // Every emission checks that stored text still resolves, while an anchor that
  // remains resolved keeps the position the decoration layer is tracking.
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

  const anchorSources = new Map<string, string>()
  for (const {comment, relativePath, selection} of inline) {
    for (const [memberIndex, member] of selection.value.entries()) {
      anchorSources.set(
        anchorId(commentsKey, comment.id, member._key, memberIndex),
        JSON.stringify([relativePath, member]),
      )
    }
  }
  const resolvedAnchors = useMemo(
    () =>
      new Map(
        anchored.map((anchor) => [
          anchorId(
            commentsKey,
            anchor.commentId,
            anchor.blockKey,
            anchor.memberIndex,
          ),
          anchor.selection,
        ]),
      ),
    [anchored, commentsKey],
  )
  const [placedAnchors, setPlacedAnchors] = useState<
    Record<string, PlacedAnchor>
  >({})
  const [hiddenAnchors, setHiddenAnchors] = useState<{
    forComments: string
    ids: Set<string>
  }>({forComments: commentsKey, ids: new Set()})
  const nextPlacedAnchors: typeof placedAnchors = {}
  const visiblePlacedByAnchor = new Map<string, PlacedAnchor>()
  for (const [id, placed] of Object.entries(placedAnchors)) {
    if (!hiddenAnchors.ids.has(id)) {
      visiblePlacedByAnchor.set(anchorKey(id), placed)
    }
  }
  for (const [id, source] of anchorSources) {
    const placed = placedAnchors[id]
    if (placed?.source === source) {
      nextPlacedAnchors[id] = placed
      continue
    }
    const selection = resolvedAnchors.get(id)
    if (selection) {
      const previous = visiblePlacedByAnchor.get(anchorKey(id))
      nextPlacedAnchors[id] = {
        source,
        selection,
        renderer: previous?.source === source ? previous.renderer : {},
      }
    }
  }
  const placedAnchorsChanged = !samePlacedAnchors(
    placedAnchors,
    nextPlacedAnchors,
  )
  if (placedAnchorsChanged) {
    setPlacedAnchors(nextPlacedAnchors)
  }
  const currentPlacedAnchors = placedAnchorsChanged
    ? nextPlacedAnchors
    : placedAnchors
  const nextHiddenAnchors =
    hiddenAnchors.forComments === commentsKey
      ? new Set(hiddenAnchors.ids)
      : new Set<string>()
  for (const id of Object.keys(currentPlacedAnchors)) {
    if (!resolvedAnchors.has(id)) {
      nextHiddenAnchors.add(id)
    }
  }
  if (
    hiddenAnchors.forComments !== commentsKey ||
    // Equal sizes are sufficient because hidden ids are only ever added.
    hiddenAnchors.ids.size !== nextHiddenAnchors.size
  ) {
    setHiddenAnchors({forComments: commentsKey, ids: nextHiddenAnchors})
  }
  const currentHiddenAnchors =
    hiddenAnchors.forComments === commentsKey &&
    hiddenAnchors.ids.size === nextHiddenAnchors.size
      ? hiddenAnchors.ids
      : nextHiddenAnchors

  const [latestRenderDecoration] = useState(() =>
    createLatest(renderDecoration),
  )
  useLayoutEffect(() => {
    latestRenderDecoration.set(renderDecoration)
  }, [latestRenderDecoration, renderDecoration])
  const [buildDecorations] = useState(() =>
    createCommentDecorationsMemo(latestRenderDecoration.get),
  )

  const decorations = useMemo(
    () =>
      buildDecorations({
        currentHiddenAnchors,
        currentPlacedAnchors,
        inline,
        resolvedAnchors,
      }),
    [
      buildDecorations,
      currentHiddenAnchors,
      currentPlacedAnchors,
      inline,
      resolvedAnchors,
    ],
  )

  // A placement the layer dropped, for example when its block moved away, is
  // not drawn, so it stays hidden like an anchor whose text no longer resolves.
  const onLayerEvents = useCallback(
    (events: Array<DecorationEvent>) => {
      const lostIds = events.flatMap((event) =>
        event.type === 'lost' ? [event.decoration.id] : [],
      )
      if (lostIds.length === 0) {
        return
      }
      setHiddenAnchors((current) => {
        const ids = new Set(
          current.forComments === commentsKey ? current.ids : [],
        )
        for (const id of lostIds) {
          ids.add(id)
        }
        return {forComments: commentsKey, ids}
      })
    },
    [commentsKey, setHiddenAnchors],
  )

  return useDecorationLayer({decorations, on: onLayerEvents})
}

function createLatest<Value>(initial: Value) {
  let value = initial
  return {
    get: () => value,
    set: (next: Value) => {
      value = next
    },
  }
}

function createCommentDecorationsMemo(
  getRenderDecoration: () => RenderCommentDecorationFunction,
) {
  type Decoration = {
    id: string
    type: 'range'
    range: NonNullable<EditorSelection>
    render: (props: PropsWithChildren) => ReactElement
  }
  type Entry = {
    comment: Comment
    decoration: Decoration
  }

  let decorationsById = new Map<string, Entry>()

  return (input: {
    currentHiddenAnchors: Set<string>
    currentPlacedAnchors: Record<string, PlacedAnchor>
    inline: Array<{comment: Comment}>
    resolvedAnchors: Map<string, NonNullable<EditorSelection>>
  }): Array<Decoration> => {
    const commentsById = new Map(
      input.inline.map(({comment}) => [comment.id, comment]),
    )
    const nextDecorationsById = new Map<string, Entry>()
    const decorations = Object.entries(input.currentPlacedAnchors).flatMap(
      ([id, placed]) => {
        if (
          !input.resolvedAnchors.has(id) ||
          input.currentHiddenAnchors.has(id)
        ) {
          return []
        }
        const [, commentId] = JSON.parse(id) as [string, string, string, number]
        const comment = commentsById.get(commentId)
        if (!comment) {
          return []
        }
        const previous = decorationsById.get(id)
        if (
          previous?.comment === comment &&
          previous.decoration.range === placed.selection
        ) {
          nextDecorationsById.set(id, previous)
          return [previous.decoration]
        }
        const entry = {
          comment,
          decoration: {
            id,
            type: 'range' as const,
            range: placed.selection,
            render: (props: PropsWithChildren) => {
              // First draw, not first render of the hook: only a committed
              // `renderDecoration` is in the holder by the time a leaf draws.
              placed.renderer.current ??= getRenderDecoration()
              return placed.renderer.current(comment)(props)
            },
          },
        }
        nextDecorationsById.set(id, entry)
        return [entry.decoration]
      },
    )
    decorationsById = nextDecorationsById
    return decorations
  }
}

function anchorId(
  commentsKey: string,
  commentId: string,
  blockKey: string,
  memberIndex: number,
): string {
  return JSON.stringify([commentsKey, commentId, blockKey, memberIndex])
}

function anchorKey(id: string): string {
  const [, ...anchor] = JSON.parse(id) as [string, string, string, number]
  return JSON.stringify(anchor)
}

type PlacedAnchor = {
  source: string
  selection: NonNullable<EditorSelection>
  /** The renderer this highlight was first drawn with, kept for its lifetime. */
  renderer: {current?: RenderCommentDecorationFunction}
}

function samePlacedAnchors(
  first: Record<string, PlacedAnchor>,
  second: Record<string, PlacedAnchor>,
): boolean {
  const firstIds = Object.keys(first)
  const secondIds = Object.keys(second)
  return (
    firstIds.length === secondIds.length &&
    firstIds.every((id) => first[id] === second[id])
  )
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
