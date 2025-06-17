import {ChevronDown} from 'lucide-react'
import type React from 'react'
import {
  Select as AriaSelect,
  Button,
  ListBox,
  SelectValue,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps,
  type ValidationResult,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {Description, FieldError, Label} from './field'
import {
  DropdownItem,
  DropdownSection,
  type DropdownSectionProps,
} from './list-box'
import {Popover} from './popover'
import {composeTailwindRenderProps, focusRing} from './utils'

const styles = tv({
  extend: focusRing,
  base: 'flex items-center text-start gap-4 w-full cursor-default border border-black/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-lg pl-1.5 pr-1 py-1 min-w-[150px] transition bg-gray-50',
  variants: {
    isDisabled: {
      false:
        'text-gray-800 hover:bg-gray-100 pressed:bg-gray-200 group-invalid:border-red-600 forced-colors:group-invalid:border-[Mark]',
      true: 'text-gray-200 forced-colors:text-[GrayText] forced-colors:border-[GrayText]',
    },
  },
})

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'children'> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: ValidationResult) => string)
  items?: Iterable<T>
  children: React.ReactNode | ((item: T) => React.ReactNode)
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'group flex flex-col gap-1',
      )}
    >
      {label && <Label>{label}</Label>}
      <Button className={styles}>
        <SelectValue className="flex-1 text-xs placeholder-shown:italic" />
        <ChevronDown
          aria-hidden
          className="w-4 h-4 text-gray-600 forced-colors:text-[ButtonText] group-disabled:text-gray-200 forced-colors:group-disabled:text-[GrayText]"
        />
      </Button>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="min-w-[--trigger-width]">
        <ListBox
          items={items}
          className="outline-none p-1 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]"
        >
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}

export function SelectItem(props: ListBoxItemProps) {
  return <DropdownItem {...props} />
}

export function SelectSection<T extends object>(
  props: DropdownSectionProps<T>,
) {
  return <DropdownSection {...props} />
}
