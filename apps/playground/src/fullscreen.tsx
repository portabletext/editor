import {MaximizeIcon, MinimizeIcon} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'

const FullscreenContext = createContext<{
  isFullscreen: boolean
  setFullscreen: (next: boolean) => void
} | null>(null)

export function useFullscreen() {
  const ctx = useContext(FullscreenContext)
  if (!ctx) {
    throw new Error('useFullscreen must be used inside FullscreenProvider')
  }
  return ctx
}

/**
 * Wraps the editor in a fullscreen-aware container. When inactive renders
 * children inline; when active, renders them inside a modal-style overlay
 * (dimmed backdrop, centered card with margins) without re-mounting the
 * editor - selection and history are preserved across toggles.
 *
 * Esc, backdrop click, and the close button all exit fullscreen.
 */
export function FullscreenProvider(props: {children: React.ReactNode}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const setFullscreen = useCallback((next: boolean) => {
    setIsFullscreen(next)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isFullscreen])

  return (
    <FullscreenContext.Provider value={{isFullscreen, setFullscreen}}>
      {isFullscreen ? (
        <>
          {/* Backdrop -- click to exit */}
          <div
            className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60"
            onClick={() => setIsFullscreen(false)}
            aria-hidden
          />
          {/* Modal card */}
          <div className="fixed inset-4 sm:inset-8 z-50 flex flex-col">
            {props.children}
          </div>
        </>
      ) : (
        props.children
      )}
    </FullscreenContext.Provider>
  )
}

export function FullscreenToggle() {
  const {isFullscreen, setFullscreen} = useFullscreen()
  return (
    <TooltipTrigger>
      <Button
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        variant="secondary"
        size="sm"
        onPress={() => setFullscreen(!isFullscreen)}
      >
        {isFullscreen ? (
          <MinimizeIcon className="size-4" />
        ) : (
          <MaximizeIcon className="size-4" />
        )}
      </Button>
      <Tooltip>{isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}</Tooltip>
    </TooltipTrigger>
  )
}
