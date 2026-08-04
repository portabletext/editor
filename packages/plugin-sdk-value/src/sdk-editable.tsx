import {
  PortableTextEditable,
  type PortableTextEditableProps,
  type RangeDecoration,
} from '@portabletext/editor'
import type {DocumentHandle} from '@sanity/sdk-react'
import {useMemo} from 'react'
import {
  SDKPresencePlugin,
  useSDKPresenceCursors,
  type RenderCursorFunction,
} from './plugin.sdk-presence'
import {SDKValuePlugin} from './plugin.sdk-value'
import {renderDefaultCursor} from './presence-caret'

/**
 * Props for {@link SDKPortableTextEditable}.
 *
 * @public
 */
export interface SDKPortableTextEditableProps
  extends
    DocumentHandle,
    // `resource` is both a document handle field and an RDFa HTML attribute, so
    // the handle wins. Dropping the attribute costs nothing in an editor.
    Omit<PortableTextEditableProps, keyof DocumentHandle> {
  /**
   * The document path of the Portable Text field, for example `content`.
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
 * What {@link splitEditableProps} pulls apart.
 *
 * @internal
 */
export interface SplitEditableProps {
  handle: DocumentHandle
  path: string
  renderCursor: RenderCursorFunction | null | undefined
  rangeDecorations: RangeDecoration[] | undefined
  editableProps: Omit<
    PortableTextEditableProps,
    keyof DocumentHandle | 'rangeDecorations'
  >
}

/**
 * A `PortableTextEditable` wired to a Sanity document: the field's value syncs
 * both ways, the local user's caret is reported, and other people's carets are
 * drawn.
 *
 * Place it inside `EditorProvider` in place of `PortableTextEditable`. Every
 * other prop is forwarded untouched, and `rangeDecorations` you pass are kept
 * and merged with the presence carets rather than replaced.
 *
 * Nothing else is needed: this replaces a separate `SDKValuePlugin`.
 *
 * @example
 * ```tsx
 * <EditorProvider initialConfig={{schemaDefinition}}>
 *   <SDKPortableTextEditable
 *     {...documentHandle}
 *     path="content"
 *     renderCursor={({user}) => (props) => (
 *       <Caret user={user}>{props.children}</Caret>
 *     )}
 *   />
 * </EditorProvider>
 * ```
 *
 * @public
 */
export function SDKPortableTextEditable(props: SDKPortableTextEditableProps) {
  const {handle, path, renderCursor, rangeDecorations, editableProps} =
    splitEditableProps(props)

  const renderer = resolveCursorRenderer(renderCursor)

  const cursors = useSDKPresenceCursors({
    ...handle,
    path,
    renderCursor: renderer.renderCursor,
  })

  const decorations = useMemo(
    () =>
      mergePresenceDecorations(rangeDecorations, cursors, renderer.drawCursors),
    [cursors, rangeDecorations, renderer.drawCursors],
  )

  return (
    <>
      <PortableTextEditable {...editableProps} rangeDecorations={decorations} />
      <SDKValuePlugin {...handle} path={path} />
      <SDKPresencePlugin {...handle} path={path} />
    </>
  )
}

/**
 * Splits the props into the document handle, this component's own props, and
 * what is forwarded to `PortableTextEditable`. Keeping handle fields out of the
 * forwarded set is what stops them reaching the DOM as attributes.
 *
 * @internal
 */
export function splitEditableProps(
  props: SDKPortableTextEditableProps,
): SplitEditableProps {
  const {
    documentId,
    documentType,
    projectId,
    dataset,
    resource,
    resourceName,
    source,
    liveEdit,
    perspective,
    path,
    renderCursor,
    rangeDecorations,
    ...editableProps
  } = props

  return {
    // Only the fields the caller actually passed. The SDK resolves an ambient
    // perspective and resource from context with `Object.hasOwn`, so forwarding
    // `perspective: undefined` would override what `ResourceProvider` set rather
    // than defer to it, and the field would sync and report against the draft
    // instead of the release the app is showing.
    handle: {
      documentId,
      documentType,
      ...('projectId' in props && {projectId}),
      ...('dataset' in props && {dataset}),
      ...('resource' in props && {resource}),
      ...('resourceName' in props && {resourceName}),
      ...('source' in props && {source}),
      ...('liveEdit' in props && {liveEdit}),
      ...('perspective' in props && {perspective}),
    },
    path,
    renderCursor,
    rangeDecorations,
    editableProps,
  }
}

/**
 * Decides which caret component to draw with, and whether to draw at all.
 *
 * Presence is subscribed to either way, because hooks cannot be called
 * conditionally, so switching carets off discards the decorations rather than
 * skipping the work.
 *
 * @internal
 */
export function resolveCursorRenderer(
  renderCursor: RenderCursorFunction | null | undefined,
): {renderCursor: RenderCursorFunction; drawCursors: boolean} {
  return {
    renderCursor: renderCursor ?? renderDefaultCursor,
    drawCursors: renderCursor !== null,
  }
}

/**
 * Appends the presence carets to whatever decorations the caller passed, so
 * theirs survive. The Studio merges the same way. When carets are switched off
 * the caller's own decorations pass straight through.
 *
 * @internal
 */
export function mergePresenceDecorations(
  rangeDecorations: RangeDecoration[] | undefined,
  cursors: RangeDecoration[],
  drawCursors: boolean,
): RangeDecoration[] | undefined {
  if (!drawCursors) {
    return rangeDecorations
  }
  return [...(rangeDecorations ?? []), ...cursors]
}

/**
 * Splitting the props by hand is what keeps document handle fields off the DOM,
 * so every field has to be listed above. `sdk-editable.test.ts` fails to compile
 * if `DocumentHandle` gains one. Note that `@sanity/sdk-react` adds fields to the
 * core handle, so it has to be read from there.
 */
