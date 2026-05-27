import {useState, type RefObject} from 'react'
import type {EditorActor} from '../../../../editor/editor-machine'
import {IS_ANDROID} from '../../../dom/utils/environment'
import {useEngineStatic} from '../use-engine-static'
import {useIsMounted} from '../use-is-mounted'
import {useMutationObserver} from '../use-mutation-observer'
import {
  createAndroidInputManager,
  type CreateAndroidInputManagerOptions,
} from './android-input-manager'

type UseAndroidInputManagerOptions = {
  editorActor: EditorActor
  node: RefObject<HTMLElement>
} & Omit<
  CreateAndroidInputManagerOptions,
  'editor' | 'editorActor' | 'onUserInput' | 'receivedUserInput'
>

const MUTATION_OBSERVER_CONFIG: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
}

export const useAndroidInputManager = !IS_ANDROID
  ? () => null
  : ({editorActor, node, ...options}: UseAndroidInputManagerOptions) => {
      if (!IS_ANDROID) {
        return null
      }

      // biome-ignore lint/correctness/useHookAtTopLevel: engine's platform-conditional hook pattern (Android-only)
      const editor = useEngineStatic()
      // biome-ignore lint/correctness/useHookAtTopLevel: engine's platform-conditional hook pattern (Android-only)
      const isMounted = useIsMounted()

      // biome-ignore lint/correctness/useHookAtTopLevel: engine's platform-conditional hook pattern (Android-only)
      const [inputManager] = useState(() =>
        createAndroidInputManager({
          editor,
          editorActor,
          ...options,
        }),
      )

      // biome-ignore lint/correctness/useHookAtTopLevel: engine's platform-conditional hook pattern (Android-only)
      useMutationObserver(
        node,
        inputManager.handleDomMutations,
        MUTATION_OBSERVER_CONFIG,
      )
      editor.scheduleFlush = inputManager.scheduleFlush
      if (isMounted) {
        inputManager.flush()
      }

      return inputManager
    }
