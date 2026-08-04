import type {PropsWithChildren} from 'react'
import type {RenderCursorFunction, SDKRemoteCursor} from './plugin.sdk-presence'

/**
 * Mid-tone hues, so a caret stays legible whether the app is light or dark. This
 * package cannot read the app's theme, so it does not try.
 */
const CARET_COLORS = [
  '#e0508a',
  '#c05fd8',
  '#7c66e8',
  '#2f8fdd',
  '#1f9c8f',
  '#4f9c2f',
  '#c98a1c',
  '#d4603a',
]

const DOT_SIZE = 6

/**
 * Picks a stable colour for a participant.
 *
 * Keyed on the user rather than the session, so one person in two tabs draws two
 * carets in the same colour. The Studio colours by user for the same reason.
 *
 * @public
 */
export function getCaretColor(userId: string): string {
  let hash = 0
  for (let index = 0; index < userId.length; index++) {
    hash = (hash * 31 + userId.charCodeAt(index)) % 1000003
  }
  return CARET_COLORS[hash % CARET_COLORS.length]
}

/**
 * Draws a remote caret when no `renderCursor` was given: a coloured line with a
 * dot above it, and the participant's name on hover.
 *
 * Deliberately plain, and styled inline so it needs no stylesheet. Pass your own
 * `renderCursor` to match your design.
 *
 * @public
 */
export const renderDefaultCursor: RenderCursorFunction =
  (cursor) => (props) => (
    <DefaultCaret cursor={cursor}>{props.children}</DefaultCaret>
  )

function DefaultCaret(props: PropsWithChildren<{cursor: SDKRemoteCursor}>) {
  const {cursor, children} = props
  const color = getCaretColor(cursor.user.sanityUserId)
  const displayName = cursor.user.profile.displayName

  return (
    <>
      <span
        // Without this the caret becomes editable content and the local user can
        // put their own cursor inside it.
        contentEditable={false}
        data-testid={`presence-caret-${cursor.sessionId}`}
        style={{
          borderLeft: `2px solid ${color}`,
          marginLeft: -1,
          position: 'relative',
          // The line must not swallow clicks meant for the text under it.
          pointerEvents: 'none',
        }}
      >
        <span
          data-testid={`presence-caret-dot-${cursor.sessionId}`}
          style={{
            backgroundColor: color,
            borderRadius: '50%',
            height: DOT_SIZE,
            left: -1,
            pointerEvents: 'auto',
            position: 'absolute',
            top: -(DOT_SIZE - 1),
            transform: 'translateX(-50%)',
            width: DOT_SIZE,
          }}
          title={displayName}
        />
      </span>
      {children}
    </>
  )
}
