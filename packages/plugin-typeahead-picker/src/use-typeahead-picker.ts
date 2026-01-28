import {useEditor} from '@portabletext/editor'
import {useActor} from '@xstate/react'
import {createTypeaheadPickerMachine} from './typeahead-picker-machine'
import type {
  TypeaheadPicker,
  TypeaheadPickerDefinition,
  TypeaheadPickerEvent,
  TypeaheadPickerState,
} from './typeahead-picker.types'

/**
 * React hook that activates a typeahead picker and returns its current state.
 *
 * Call inside a component rendered within an `EditorProvider`.
 * The picker automatically monitors the editor for trigger patterns.
 *
 * @example
 * ```tsx
 * function MentionPickerUI() {
 *   const picker = useTypeaheadPicker(mentionPickerDefinition)
 *
 *   if (picker.snapshot.matches('idle')) return null
 *   if (picker.snapshot.matches({active: 'loading'})) return <Spinner />
 *   if (picker.snapshot.matches({active: 'no matches'})) return <NoResults />
 *
 *   const {matches, selectedIndex} = picker.snapshot.context
 *
 *   return (
 *     <ul>
 *       {matches.map((match, index) => (
 *         <li
 *           key={match.key}
 *           aria-selected={index === selectedIndex}
 *           onMouseEnter={() => picker.send({type: 'navigate to', index})}
 *           onClick={() => picker.send({type: 'select'})}
 *         >
 *           {match.name}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @public
 */
export function useTypeaheadPicker<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
): TypeaheadPicker<TMatch> {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(
    createTypeaheadPickerMachine<TMatch>(),
    {
      input: {
        editor,
        definition,
      },
    },
  )

  return {
    snapshot: {
      matches: (state: TypeaheadPickerState) => actorSnapshot.matches(state),
      context: {
        keyword: actorSnapshot.context.keyword,
        matches: actorSnapshot.context.matches as ReadonlyArray<TMatch>,
        selectedIndex: actorSnapshot.context.selectedIndex,
        error: actorSnapshot.context.error,
      },
    },
    send: (event: TypeaheadPickerEvent) => {
      if (event.type === 'dismiss') {
        editor.send({
          type: 'custom.typeahead dismiss',
          pickerId: definition._id,
        })
      } else {
        send(event)
      }
    },
  }
}
