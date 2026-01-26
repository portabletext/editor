import {XIcon} from 'lucide-react'
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
              </Container>
            )}
          </RACDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
