/**
 * Visual indicator rendered above or below a block during drag-and-drop to
 * show where the dragged content will land.
 *
 * Default styling: a 1px horizontal line spanning the block's width.
 * Consumers wanting a different look can write their own and use
 * `useDropPosition` directly.
 */
export function DropIndicator() {
  return (
    <div
      contentEditable={false}
      className="pt-drop-indicator"
      style={{
        position: 'absolute',
        width: '100%',
        height: 1,
        borderBottom: '1px solid currentColor',
        zIndex: 5,
      }}
    >
      <span />
    </div>
  )
}
