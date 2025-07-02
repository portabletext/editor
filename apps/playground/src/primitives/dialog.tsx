import {XIcon} from 'lucide-react'
import {
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Dialog as RACDialog,
  TooltipTrigger,
} from 'react-aria-components'
import {Button} from './button'
import {Container} from './container'
import {Icon} from './icon'
import {Tooltip} from './tooltip'

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
      <ModalOverlay className="bg-black/9 z-100000 left-0 top-0 fixed w-screen h-[var(--visual-viewport-height)] flex items-center justify-center">
        <Modal>
          <RACDialog className="w-80 max-w-screen">
            {({close}) => (
              <Container className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Heading
                    slot="title"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Icon icon={props.icon} fallback={null} />
                    {props.title}
                  </Heading>
                  <TooltipTrigger>
                    <Button variant="secondary" size="sm" onPress={close}>
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
