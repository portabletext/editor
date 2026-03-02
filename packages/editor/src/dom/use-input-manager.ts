import {useState, type RefObject} from 'react'
import type {EditorActor} from '../editor/editor-machine'
import {useIsMounted} from '../slate-react/hooks/use-is-mounted'
import {useMutationObserver} from '../slate-react/hooks/use-mutation-observer'
import {useSlateStatic} from '../slate-react/hooks/use-slate-static'
import {InputManager, type InputManagerOptions} from './input-manager'

export type UseInputManagerOptions = {
  editorActor: EditorActor
  node: RefObject<HTMLElement>
} & Omit<
  InputManagerOptions,
  'editor' | 'editorActor' | 'onUserInput' | 'receivedUserInput'
>

const MUTATION_OBSERVER_CONFIG: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
}

export function useInputManager(options: UseInputManagerOptions): InputManager {
  const {editorActor, node, ...restOptions} = options

  const editor = useSlateStatic()
  const isMounted = useIsMounted()

  const [inputManager] = useState(
    () =>
      new InputManager({
        editor,
        editorActor,
        ...restOptions,
      }),
  )

  const observer = useMutationObserver(
    node,
    inputManager.handleDomMutations,
    MUTATION_OBSERVER_CONFIG,
  )

  // Flush pending MutationObserver records synchronously. The observer
  // callback is a microtask that may not have fired when `flush()` runs.
  // eslint-disable-next-line react-hooks/immutability
  inputManager.drainPendingMutations = () => {
    const records = observer.takeRecords()
    if (records.length > 0) {
      inputManager.handleDomMutations(records)
    }
  }

  // eslint-disable-next-line react-hooks/immutability
  editor.scheduleFlush = inputManager.scheduleFlush

  if (isMounted) {
    inputManager.flush()
  }

  return inputManager
}
