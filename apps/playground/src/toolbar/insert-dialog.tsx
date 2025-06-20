import {XIcon} from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  TooltipTrigger,
} from 'react-aria-components'
import {Button} from '../components/button'
import {Container} from '../components/container'
import {Tooltip} from '../components/tooltip'
import {Icon} from './icon'

export function InsertDialog(props: {
  title: string
  icon: React.ComponentType
  trigger: React.ReactNode
  children: (props: {close: () => void}) => React.ReactNode
  onOpenChange?: (isOpen: boolean) => void
}) {
  return (
    <DialogTrigger onOpenChange={props.onOpenChange}>
      {props.trigger}
      <ModalOverlay className="bg-black/9 z-100000 left-0 top-0 fixed w-screen h-[var(--visual-viewport-height)] flex items-center justify-center">
        <Modal>
          <Dialog className="w-80 max-w-screen">
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
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
