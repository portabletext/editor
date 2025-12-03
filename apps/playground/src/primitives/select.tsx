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
import {button} from './button'
import {Description, FieldError, Label} from './field'
import {
  DropdownItem,
  DropdownSection,
  type DropdownSectionProps,
} from './list-box'
import {Popover} from './popover'
import {composeTailwindRenderProps} from './utils'

const styles = tv({
  extend: button,
  defaultVariants: {
    variant: 'secondary',
    size: 'sm',
  },
})

const chevronStyles = tv({
  base: 'w-4 h-4',
  variants: {
    isDisabled: {
      false: 'text-gray-600',
      true: 'text-gray-200',
    },
  },
})

export interface SelectProps<T extends object> extends Omit<
  AriaSelectProps<T>,
  'children'
> {
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
        <SelectValue className="flex-1 text-xs placeholder-shown:italic">
          {(props) => props.selectedText ?? props.defaultChildren}
        </SelectValue>
        <ChevronDown
          aria-hidden
          className={chevronStyles({isDisabled: props.isDisabled})}
        />
      </Button>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="min-w-[--trigger-width]">
        <ListBox
          items={items}
          className="outline-none max-h-[inherit] overflow-auto"
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
