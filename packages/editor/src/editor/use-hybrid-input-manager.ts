import {useState, type RefObject} from 'react'
import {useIsMounted} from '../slate-react/hooks/use-is-mounted'
import {useMutationObserver} from '../slate-react/hooks/use-mutation-observer'
import {useSlateStatic} from '../slate-react/hooks/use-slate-static'
import type {EditorActor} from './editor-machine'
import {
  createHybridInputManager,
  type CreateHybridInputManagerOptions,
  type HybridInputManager,
} from './hybrid-input-manager'

export type UseHybridInputManagerOptions = {
  editorActor: EditorActor
  node: RefObject<HTMLElement>
} & Omit<
  CreateHybridInputManagerOptions,
  'editor' | 'editorActor' | 'onUserInput' | 'receivedUserInput'
>

/**
 * MutationObserver configuration for the hybrid input manager.
 *
 * `characterDataOldValue` is required so the DOM parser can compute
 * text diffs against the pre-mutation content without needing a
 * separate snapshot of every text node.
 */
const MUTATION_OBSERVER_CONFIG: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  characterDataOldValue: true,
}

/**
 * Creates and manages a HybridInputManager instance.
 *
 * This hook is NOT conditional on platform
 * on `IS_ANDROID` — it runs on ALL platforms. The hybrid manager uses
 * the fast path (preventDefault + direct behavior event) on desktop and
 * falls back to parse-and-diff when the browser controls the mutation
 * (composition, spellcheck, Android IME, etc.).
 */
export function useHybridInputManager(
  options: UseHybridInputManagerOptions,
): HybridInputManager {
  const {editorActor, node, ...restOptions} = options

  const editor = useSlateStatic()
  const isMounted = useIsMounted()

  const [inputManager] = useState(() =>
    createHybridInputManager({
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

  // Pass a drain function that flushes pending MutationObserver records
  // synchronously — the observer callback is a microtask that may not
  // have fired when flush() runs.
  // eslint-disable-next-line react-hooks/immutability
  inputManager.drainPendingMutations = () => {
    const records = observer.takeRecords()
    if (records.length > 0) {
      inputManager.handleDomMutations(records)
    }
  }

  // Wire up the editor's scheduleFlush so other parts of the system
  // (e.g., RestoreDOM, selection sync) can trigger a flush.
  // The editor is a mutable singleton, not a React-managed value. This
  // matches the pattern used by the vendored Slate internals.
  // eslint-disable-next-line react-hooks/immutability
  editor.scheduleFlush = inputManager.scheduleFlush

  // On mount, flush any changes that accumulated during the initial render.
  if (isMounted) {
    inputManager.flush()
  }

  return inputManager
}
