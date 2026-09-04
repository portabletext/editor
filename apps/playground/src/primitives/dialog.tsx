import {XIcon} from 'lucide-react'
import {useEffect, useRef} from 'react'
import {
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Dialog as RACDialog,
  TooltipTrigger,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {Button} from './button'
import {Container} from './container'
import {Icon} from './icon'
import {Tooltip} from './tooltip'

const overlayStyles = tv({
  base: 'fixed inset-0 z-[100000] flex items-center justify-center bg-black/25 backdrop-blur-sm',
  variants: {
    isEntering: {
      true: 'animate-in fade-in duration-200 ease-out',
    },
    isExiting: {
      true: 'animate-out fade-out duration-150 ease-in',
    },
  },
})

const modalStyles = tv({
  base: 'w-full max-w-sm mx-4',
  variants: {
    isEntering: {
      true: 'animate-in fade-in zoom-in-95 duration-200 ease-out',
    },
    isExiting: {
      true: 'animate-out fade-out zoom-out-95 duration-150 ease-in',
    },
  },
})

export function Dialog(props: {
  title: string
  icon?: React.ComponentType
  isOpen?: boolean
  trigger: React.ReactNode
  children: (props: {close: () => void}) => React.ReactNode
  onOpenChange?: (isOpen: boolean) => void
  /**
   * Receives focus when the dialog closes, instead of the trigger.
   * react-aria has no supported restore-target option
   * (react-spectrum#9876); remove the sentinel shim when it ships one.
   */
  focusOnClose?: () => void
}) {
  return (
    <DialogTrigger onOpenChange={props.onOpenChange} isOpen={props.isOpen}>
      {props.trigger}
      <ModalOverlay className={overlayStyles}>
        <Modal className={modalStyles}>
          <RACDialog className="outline-none">
            {({close}) => (
              <Container className="flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <Heading
                    slot="title"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                  >
                    <Icon icon={props.icon} fallback={null} />
                    {props.title}
                  </Heading>
                  <TooltipTrigger>
                    <Button variant="ghost" size="sm" onPress={close}>
                      <XIcon className="size-3" />
                    </Button>
                    <Tooltip>Close</Tooltip>
                  </TooltipTrigger>
                </div>
                {props.children({close})}
                {props.focusOnClose ? (
                  <FocusOnCloseSentinel focusOnClose={props.focusOnClose} />
                ) : null}
              </Container>
            )}
          </RACDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}

function FocusOnCloseSentinel(props: {focusOnClose: () => void}) {
  const focusOnCloseRef = useRef(props.focusOnClose)
  const pendingFrameRef = useRef<number | null>(null)

  useEffect(() => {
    focusOnCloseRef.current = props.focusOnClose
  })

  useEffect(() => {
    if (pendingFrameRef.current !== null) {
      // StrictMode rehearses mount-unmount-mount on open: the remount runs
      // before the cleanup's first frame renders, so cancelling here keeps
      // the rehearsal from stealing focus from the just-opened dialog. A
      // real close has no remount and the hand-off fires.
      cancelAnimationFrame(pendingFrameRef.current)
      pendingFrameRef.current = null
    }
    return () => {
      // The dialog's focus scope restores focus to the trigger in a
      // `requestAnimationFrame` queued during its own cleanup, which runs
      // after this child cleanup; a single frame would fire before the
      // restore and lose to it. The second frame lands after it.
      pendingFrameRef.current = requestAnimationFrame(() => {
        pendingFrameRef.current = requestAnimationFrame(() => {
          pendingFrameRef.current = null
          focusOnCloseRef.current()
        })
      })
    }
  }, [])

  return null
}
