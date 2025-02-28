export function DropIndicator() {
  return (
    <div
      className="pt-drop-indicator"
      style={{
        position: 'absolute',
        width: '100%',
        height: 1,
        borderBottom: '1px solid currentColor',
        zIndex: 5,
      }}
    />
  )
}
