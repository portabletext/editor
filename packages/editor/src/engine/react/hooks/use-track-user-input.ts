import {useCallback, useEffect, useRef} from 'react'
import {DOMEditor} from '../../dom/plugin/dom-editor'
import {useEngineStatic} from './use-engine-static'

export function useTrackUserInput() {
  const editor = useEngineStatic()

  const receivedUserInput = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number>(0)

  const onUserInput = useCallback(() => {
    if (receivedUserInput.current) {
      return
    }

    receivedUserInput.current = true

    const window = DOMEditor.getWindow(editor)
    window.cancelAnimationFrame(animationFrameIdRef.current)

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      receivedUserInput.current = false
    })
  }, [editor])

  useEffect(() => () => cancelAnimationFrame(animationFrameIdRef.current), [])

  return {
    receivedUserInput,
    onUserInput,
  }
}
