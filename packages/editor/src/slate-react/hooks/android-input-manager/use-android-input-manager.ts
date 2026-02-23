import {useState, type RefObject} from 'react'
import {EDITOR_TO_SCHEDULE_FLUSH, IS_ANDROID} from '../../../slate-dom'
import {useIsMounted} from '../use-is-mounted'
import {useMutationObserver} from '../use-mutation-observer'
import {useSlateStatic} from '../use-slate-static'
import {
  createAndroidInputManager,
  type CreateAndroidInputManagerOptions,
} from './android-input-manager'

type UseAndroidInputManagerOptions = {
  node: RefObject<HTMLElement>
} & Omit<
  CreateAndroidInputManagerOptions,
  'editor' | 'onUserInput' | 'receivedUserInput'
>

const MUTATION_OBSERVER_CONFIG: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
}

export const useAndroidInputManager = !IS_ANDROID
  ? () => null
  : ({node, ...options}: UseAndroidInputManagerOptions) => {
      if (!IS_ANDROID) {
        return null
      }

      // biome-ignore lint/correctness/useHookAtTopLevel: Slate's platform-conditional hook pattern (Android-only)
      const editor = useSlateStatic()
      // biome-ignore lint/correctness/useHookAtTopLevel: Slate's platform-conditional hook pattern (Android-only)
      const isMounted = useIsMounted()

      // biome-ignore lint/correctness/useHookAtTopLevel: Slate's platform-conditional hook pattern (Android-only)
      const [inputManager] = useState(() =>
        createAndroidInputManager({
          editor,
          ...options,
        }),
      )

      // biome-ignore lint/correctness/useHookAtTopLevel: Slate's platform-conditional hook pattern (Android-only)
      useMutationObserver(
        node,
        inputManager.handleDomMutations,
        MUTATION_OBSERVER_CONFIG,
      )

      EDITOR_TO_SCHEDULE_FLUSH.set(editor, inputManager.scheduleFlush)
      if (isMounted) {
        inputManager.flush()
      }

      return inputManager
    }
