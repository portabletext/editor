import type {EditorSelectionPoint} from '@portabletext/editor'
import {useSelector} from '@xstate/react'
import {TextCursorIcon} from 'lucide-react'
import type {PlaygroundActorRef} from './playground-machine'

export function RangeDecorationDebugger(props: {
  playgroundRef: PlaygroundActorRef
}) {
  const rangeDecorations = useSelector(
    props.playgroundRef,
    (s) => s.context.rangeDecorations,
  )

  if (rangeDecorations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <TextCursorIcon className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No range decorations
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Select text and click the decoration button to add one
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-2 space-y-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {rangeDecorations.length} decoration
        {rangeDecorations.length !== 1 ? 's' : ''}
      </div>
      {rangeDecorations.map((decoration, index) => {
        const id =
          typeof decoration.payload?.id === 'string'
            ? decoration.payload.id
            : String(index)
        return (
          <div
            key={id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Decoration #{index + 1}
              </span>
              {id && (
                <span className="text-xs text-gray-400 font-mono">{id}</span>
              )}
            </div>

            {decoration.selection ? (
              <div className="space-y-2">
                <SelectionPointDisplay
                  label="Anchor"
                  point={decoration.selection.anchor}
                />
                <SelectionPointDisplay
                  label="Focus"
                  point={decoration.selection.focus}
                />
                {decoration.selection.backward && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    ← Backward selection
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-red-500 dark:text-red-400">
                No selection (decoration will be removed)
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SelectionPointDisplay(props: {
  label: string
  point: EditorSelectionPoint
}) {
  const {label, point} = props
  const pathStr = point.path
    .map((p) => {
      if (typeof p === 'string') return p
      if (typeof p === 'number') return `[${p}]`
      if (typeof p === 'object' && '_key' in p) return p._key
      return String(p)
    })
    .join(' → ')

  return (
    <div className="text-xs">
      <span className="font-medium text-gray-600 dark:text-gray-400">
        {label}:
      </span>
      <div className="ml-2 font-mono text-gray-800 dark:text-gray-200">
        <div>
          path:{' '}
          <span className="text-blue-600 dark:text-blue-400">{pathStr}</span>
        </div>
        <div>
          offset:{' '}
          <span className="text-green-600 dark:text-green-400">
            {point.offset}
          </span>
        </div>
      </div>
    </div>
  )
}
