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

export function InsertDialog(props: {
  title: string
  trigger: React.ReactNode
  children: (props: {close: () => void}) => React.ReactNode
  onOpenChange?: (isOpen: boolean) => void
}) {
  return (
    <DialogTrigger onOpenChange={props.onOpenChange}>
      {props.trigger}
      <ModalOverlay className="bg-black/9 z-100000 left-0 top-0 fixed w-screen h-[var(--visual-viewport-height)] flex items-center justify-center">
        <Modal>
          <Dialog>
            {({close}) => (
              <Container>
                <div className="flex items-center justify-between gap-2">
                  <Heading slot="title">{props.title}</Heading>
                  <TooltipTrigger>
                    <Button variant="secondary" size="sm" onPress={close}>
                      <XIcon className="size-4" />
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
