import type {EditorSelection, RangeDecoration} from '@portabletext/editor'
import {
  usePresenceForDocument,
  useReportPresence,
  type DocumentHandle,
  type DocumentResource,
  type UseReportPresenceOptions,
} from '@sanity/sdk-react'
import {useMemo, type PropsWithChildren, type ReactElement} from 'react'
import {useLocalSelection, useRemoteCursors} from './plugin.presence-sync'
import {arrayifyPath} from './plugin.sdk-value'
import {normalizeDocumentHandle} from './sdk-document-handle'

/**
 * `@sanity/sdk-react` exports the presence hooks and their option types but not
 * the presence data types, so these are derived from what it does export.
 */
type DocumentPresence = ReturnType<
  typeof usePresenceForDocument
>['presence'][number]

/**
 * Draws one remote participant's caret. This package has no opinion about how a
 * caret looks, so it is the caller's to provide.
 *
 * @public
 */
export type RenderCursorFunction = (
  cursor: SDKRemoteCursor,
) => (props: PropsWithChildren) => ReactElement

/**
 * A remote participant's caret, together with who they are.
 *
 * Declared in full rather than extending the internal cursor type, so nothing in
 * the public API refers to a type consumers cannot import.
 *
 * @public
 */
export interface SDKRemoteCursor {
  /**
   * Identifies one editing session rather than one person. The same user in two
   * tabs reports two sessions and therefore draws two carets.
   */
  sessionId: string
  /**
   * Where the participant last reported their selection.
   */
  selection: EditorSelection
  user: DocumentPresence['user']
}

/**
 * Props for {@link SDKPresencePlugin}.
 *
 * @public
 */
export interface SDKPresencePluginProps extends DocumentHandle {
  /**
   * @deprecated Use `resource` instead.
   */
  source?: DocumentResource
  /**
   * The document path of the Portable Text field, for example `content`. The
   * same form `SDKValuePlugin` takes.
   */
  path: string
}

/**
 * Options for {@link useSDKPresenceCursors}.
 *
 * @public
 */
export interface UseSDKPresenceCursorsOptions extends DocumentHandle {
  /**
   * @deprecated Use `resource` instead.
   */
  source?: DocumentResource
  path: string
  renderCursor: RenderCursorFunction
}

/**
 * Reports the local user's caret in a Portable Text field, so other people in
 * the same document can see where they are.
 *
 * Place it inside `EditorProvider`. Prefer `SDKPortableTextEditable`, which
 * reports and draws in one component; reach for this when you render
 * `PortableTextEditable` yourself.
 *
 * Which document is reported follows the handle's perspective, or the ambient
 * one from `ResourceProvider`. Pass the plain document id and let the
 * perspective select the draft, the published document, or a release version.
 *
 * @public
 */
export function SDKPresencePlugin(props: SDKPresencePluginProps) {
  const {path, ...handle} = normalizeDocumentHandle(props)
  const selection = useLocalSelection()
  const fieldPath = useFieldPath(path)

  useReportPresence({...handle, path: fieldPath, selection})

  return null
}

/**
 * Other people's carets in a Portable Text field, as range decorations.
 *
 * Pass the result to `<PortableTextEditable rangeDecorations={...} />`, or use
 * `SDKPortableTextEditable` and skip the wiring. Each caret stays anchored as
 * the local user types, and disappears when the participant leaves or their
 * session expires.
 *
 * The local user is never included, so an app does not draw its own caret.
 * Participants are counted by session, so the same person in two tabs draws two
 * carets.
 *
 * @public
 */
export function useSDKPresenceCursors(
  options: UseSDKPresenceCursorsOptions,
): RangeDecoration[] {
  const {path, renderCursor, ...handle} = normalizeDocumentHandle(options)
  const fieldPath = useFieldPath(path)
  // Exact id matching: a caret reported while editing a draft must not be drawn
  // in a release version of the same document, where the text differs.
  const {presence} = usePresenceForDocument({
    ...handle,
    path: fieldPath,
    excludeVersions: true,
  })

  const cursors = useMemo(
    () =>
      presence.flatMap((participant): SDKRemoteCursor[] =>
        participant.selection
          ? [
              {
                sessionId: participant.sessionId,
                selection: participant.selection,
                user: participant.user,
              },
            ]
          : [],
      ),
    [presence],
  )

  return useRemoteCursors({cursors, renderCursor})
}

/**
 * The SDK's presence hooks address fields by path array, because a field-level
 * path inside Portable Text needs keyed segments. This package takes the same
 * string expression as `SDKValuePlugin` everywhere and converts here.
 */
function useFieldPath(
  path: string,
): NonNullable<UseReportPresenceOptions['path']> {
  return useMemo(() => arrayifyPath(path), [path])
}
