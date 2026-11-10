import type {EditorSelection} from '@portabletext/editor'
import {isKeyedSegment} from '@portabletext/editor/utils'
import {
  useDecorationLayer,
  type DecorationLayer,
} from '@portabletext/plugin-decorations'
import {
  usePresenceForDocument,
  useReportPresence,
  type DocumentHandle,
  type DocumentResource,
  type UseReportPresenceOptions,
} from '@sanity/sdk-react'
import {useMemo, type PropsWithChildren, type ReactElement} from 'react'
import {useLocalSelection} from './plugin.presence-sync'
import {arrayifyPath} from './plugin.sdk-value'
import {renderDefaultCursor} from './presence-caret'
import {collapseToCaret} from './presence-cursors'
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
 * The returned render is a plain function call, not a component: do not call
 * hooks in it. When you need hooks, return an element of your own component.
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
  /**
   * Draws one remote participant's caret. Omit it for the built-in caret, which
   * needs no styling of your own. Pass `null` to draw no carets at all while
   * still reporting the local user's presence.
   */
  renderCursor?: RenderCursorFunction | null
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
 * Reports the local user's caret in a Portable Text field and draws other
 * people's carets, so everyone in the same document can see where the others
 * are.
 *
 * Place it inside `EditorProvider`, next to `PortableTextEditable`. Carets use
 * the built-in caret unless you pass `renderCursor`. Pass `null` to report
 * without drawing any. Use `useSDKPresenceCursors` instead when a component of
 * your own needs the `DecorationLayer`.
 *
 * Which document is reported follows the handle's perspective, or the ambient
 * one from `ResourceProvider`. Pass the plain document id and let the
 * perspective select the draft, the published document, or a release version.
 *
 * @public
 */
export function SDKPresencePlugin(props: SDKPresencePluginProps) {
  const {path, renderCursor, ...handle} = normalizeDocumentHandle(props)
  const selection = useLocalSelection()
  const fieldPath = useFieldPath(path)

  useReportPresence({...handle, path: fieldPath, selection})

  return renderCursor === null ? null : (
    <SDKPresenceCursors
      {...handle}
      path={path}
      renderCursor={renderCursor ?? renderDefaultCursor}
    />
  )
}

function SDKPresenceCursors(props: UseSDKPresenceCursorsOptions) {
  useSDKPresenceCursors(props)
  return null
}

/**
 * Registers and returns a decoration layer containing other people's carets in
 * a Portable Text field. Each caret stays anchored as the local user types, and
 * disappears when the participant leaves or their session expires.
 *
 * The local user is never included, so an app does not draw its own caret.
 * Participants are counted by session, so the same person in two tabs draws two
 * carets.
 *
 * Must run inside `EditorProvider`.
 *
 * @public
 */
export function useSDKPresenceCursors(
  options: UseSDKPresenceCursorsOptions,
): DecorationLayer {
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

  const decorations = useMemo(
    () =>
      cursors.flatMap((cursor) => {
        // The id and the range both come from one canonical form of the report.
        // A field of the report either survives it and changes both together, or
        // is dropped and changes neither, so a report that differs only by a
        // dropped field keeps the position the layer tracks.
        const canonical = canonicalSelection(cursor.selection)
        const range = collapseToCaret(canonical)
        if (canonical === null || range === null) {
          return []
        }
        const Cursor = renderCursor(cursor)
        return [
          {
            id: presenceId(cursor.sessionId, canonical),
            type: 'range' as const,
            range,
            render: (props: PropsWithChildren) => Cursor(props),
          },
        ]
      }),
    [cursors, renderCursor],
  )

  return useDecorationLayer({decorations})
}

/**
 * Identifies a participant's reported position. Two reports get the same id
 * exactly when their canonical forms are equal, so the id changes when the
 * reported anchor or focus changes and the caret draws at the new report.
 */
function presenceId(
  sessionId: string,
  selection: NonNullable<EditorSelection>,
): string {
  return JSON.stringify([sessionId, selection])
}

/**
 * Reduces a report to its anchor and focus, each as a path and an offset.
 * Keyed path segments keep their `_key` alone and every other field of the
 * report is dropped.
 */
function canonicalSelection(
  selection: EditorSelection,
): NonNullable<EditorSelection> | null {
  if (selection === null) {
    return null
  }
  const {anchor, focus} = selection
  return {
    anchor: {path: canonicalPath(anchor.path), offset: anchor.offset},
    focus: {path: canonicalPath(focus.path), offset: focus.offset},
  }
}

function canonicalPath(
  path: NonNullable<EditorSelection>['anchor']['path'],
): NonNullable<EditorSelection>['anchor']['path'] {
  return path.map((segment) => {
    if (Array.isArray(segment)) {
      return [segment[0], segment[1]]
    }
    if (isKeyedSegment(segment)) {
      return {_key: segment._key}
    }
    return segment
  })
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
