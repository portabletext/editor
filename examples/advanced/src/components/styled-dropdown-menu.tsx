import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {cn} from '@/lib/utils'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

function StyledDropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenu {...props} />
}

function StyledDropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPortal {...props} />
}

function StyledDropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuTrigger
      className={cn('bg-transparent text-foreground', className)}
      {...props}
    />
  )
}

function StyledDropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuContent
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md bg-background dark:bg-background-dark-5 p-1 text-foreground shadow-md',
        'border border-background-dark-10 dark:border-background-dark-5',
        className,
      )}
      {...props}
    />
  )
}

function StyledDropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuGroup {...props} />
}

function StyledDropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {}) {
  return (
    <DropdownMenuItem
      className={cn('focus:text-background', className)}
      {...props}
    />
  )
}

function StyledDropdownMenuCheckboxItem({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return <DropdownMenuCheckboxItem {...props} />
}

function StyledDropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuRadioGroup {...props} />
}

function StyledDropdownMenuRadioItem({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return <DropdownMenuRadioItem {...props} />
}

function StyledDropdownMenuLabel({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return <DropdownMenuLabel {...props} />
}

function StyledDropdownMenuSeparator({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuSeparator {...props} />
}

function StyledDropdownMenuShortcut({...props}: React.ComponentProps<'span'>) {
  return <DropdownMenuShortcut {...props} />
}

function StyledDropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuSub {...props} />
}

function StyledDropdownMenuSubTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return <DropdownMenuSubTrigger {...props} />
}

function StyledDropdownMenuSubContent({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return <DropdownMenuSubContent {...props} />
}

export {
  StyledDropdownMenu,
  StyledDropdownMenuPortal,
  StyledDropdownMenuTrigger,
  StyledDropdownMenuContent,
  StyledDropdownMenuGroup,
  StyledDropdownMenuLabel,
  StyledDropdownMenuItem,
  StyledDropdownMenuCheckboxItem,
  StyledDropdownMenuRadioGroup,
  StyledDropdownMenuRadioItem,
  StyledDropdownMenuSeparator,
  StyledDropdownMenuShortcut,
  StyledDropdownMenuSub,
  StyledDropdownMenuSubTrigger,
  StyledDropdownMenuSubContent,
}
