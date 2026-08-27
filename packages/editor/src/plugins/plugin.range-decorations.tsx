import {useEffect, useEffectEvent, useRef} from 'react'
import {useEditor} from '../editor/use-editor'
import type {
  RangeDecorationEvent,
  RegistrableRangeDecoration,
} from '../types/editor'

/**
 * @beta
 *
 * Plugin component that registers a list of range decorations with
 * the editor, independent of any `PortableTextEditable`'s
 * `rangeDecorations` prop. Registers on mount, calls `update` when
 * `rangeDecorations` changes, and unregisters on unmount. See
 * `editor.registerRangeDecorations` for the reconciliation contract
 * (`id`-based, throws on duplicate `id`s). Duplicate `id`s throw from
 * the plugin's effect, on the mount or update commit that supplied
 * them, rather than at the call site the way the imperative API
 * throws.
 *
 * Like `BehaviorPlugin`, stabilize `rangeDecorations` (a module-level
 * constant or `useMemo`): a new array reference per parent render
 * sends a redundant `update` through reconciliation each time. `on`
 * needs no stabilizing; the plugin always calls the latest handler.
 * Give each decoration a stable `id` and a stable `component`
 * reference (module-level constants or `useCallback`/`useMemo`): a
 * new `component` reference is indistinguishable from an intentional
 * change and re-renders the decoration on every parent render.
 */
export function RangeDecorationsPlugin(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  on?: (event: RangeDecorationEvent) => void
}) {
  const editor = useEditor()
  const registrationRef = useRef<ReturnType<
    typeof editor.registerRangeDecorations
  > | null>(null)

  const handleEvent = useEffectEvent((event: RangeDecorationEvent) => {
    props.on?.(event)
  })
  const pushRangeDecorations = useEffectEvent(
    (registration: ReturnType<typeof editor.registerRangeDecorations>) => {
      registration.update(props.rangeDecorations)
    },
  )

  useEffect(() => {
    const registration = editor.registerRangeDecorations({
      rangeDecorations: [],
      on: handleEvent,
    })
    pushRangeDecorations(registration)
    registrationRef.current = registration

    return () => {
      registration.unregister()
      registrationRef.current = null
    }
  }, [editor])

  useEffect(() => {
    registrationRef.current?.update(props.rangeDecorations)
  }, [props.rangeDecorations])

  return null
}
