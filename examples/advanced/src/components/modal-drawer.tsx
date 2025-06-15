import {StyledButton} from '@/components/styled-button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {useMediaQuery} from '@/hooks/use-media-query'
import {cn} from '@/lib/utils'
import {DialogClose} from '@radix-ui/react-dialog'
import {Slot} from '@radix-ui/react-slot'
import React, {useEffect, useState} from 'react'

interface ModalDrawerProps {
  className?: string
  trigger: React.ReactElement
  content: React.ReactElement
  cancelButton?: boolean
  isOpen?: boolean
  onCancel?: () => void
}

const ModalDrawer: React.FC<ModalDrawerProps> = ({
  trigger,
  content,
  isOpen = false,
  cancelButton = true,
  onCancel = undefined,
  className,
}) => {
  const [open, setOpen] = React.useState(isOpen)
  const [isDesktop, setIsDesktop] = useState(false)

  useMediaQuery('(min-width: 768px)', (isDesktop) => setIsDesktop(isDesktop))

  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className={cn(
            'sm:max-w-[425px]',
            'bg-background-light-10 dark:bg-background-dark-10',
            'border border-foreground-light-40 dark:border-background-light-5',
            className,
          )}
          aria-describedby={undefined}
          onCloseAutoFocus={onCancel}
        >
          <DialogTitle />

          {content}

          {cancelButton && (
            <DialogClose asChild>
              <StyledButton variant="outline">Cancel</StyledButton>
            </DialogClose>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} onClose={onCancel}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        aria-describedby={undefined}
        className={cn(
          'bg-background-light-10 dark:bg-background-dark-10',
          'border border-foreground-light-40 dark:border-background-light-5 p-4',
          'data-[vaul-drawer-direction=bottom]:max-h-none',
        )}
      >
        <DrawerTitle />
        {content}
        <DrawerFooter className="p-0 pt-2">
          {cancelButton && (
            <DrawerClose asChild>
              <StyledButton variant="outline" className="w-full">
                Cancel
              </StyledButton>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const ModalDrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
))

ModalDrawerHeader.displayName = 'ModalDrawerHeader'

const ModalDrawerDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-sm text-foreground-light-40 dark:text-foreground-dark-10',
      className,
    )}
    {...props}
  />
))

ModalDrawerDescription.displayName = 'ModalDrawerDescription'

interface ModalDrawerFooter extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}
const ModalDrawerFooter = React.forwardRef<HTMLDivElement, ModalDrawerFooter>(
  ({className, asChild, ...props}, ref) => {
    const Comp = asChild ? Slot : 'div'
    return <Comp className={cn('mt-3', className)} ref={ref} {...props} />
  },
)
ModalDrawerFooter.displayName = 'ModalDrawerFooter'

const ModalDrawerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn('grid items-start gap-2', className)}
    {...props}
  />
))
ModalDrawerContent.displayName = 'ModalDrawerContent'

export {
  ModalDrawer,
  ModalDrawerDescription,
  ModalDrawerHeader,
  ModalDrawerFooter,
  ModalDrawerContent,
}
