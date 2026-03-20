import {Check} from 'lucide-react'
import {
  ListBoxItem as AriaListBoxItem,
  composeRenderProps,
  type ListBoxItemProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'

const dropdownItemStyles = tv({
  base: 'group flex items-center gap-2 cursor-default select-none py-1.5 px-2 rounded outline outline-0 text-sm forced-color-adjust-none',
  variants: {
    isDisabled: {
      false: 'text-gray-900 dark:text-gray-100',
      true: 'text-gray-300 dark:text-gray-600 forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-gray-100 dark:bg-gray-700 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
    isHovered: {
      true: 'bg-gray-50 dark:bg-gray-700/50',
    },
  },
})

export function DropdownItem(props: ListBoxItemProps) {
  const textValue =
    props.textValue ||
    (typeof props.children === 'string' ? props.children : undefined)
  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={dropdownItemStyles}
    >
      {composeRenderProps(props.children, (children, {isSelected}) => (
        <>
          <span className="flex items-center flex-1 gap-2 font-normal truncate group-selected:font-semibold">
            {children}
          </span>
          <span className="flex items-center w-5">
            {isSelected && <Check className="size-4" />}
          </span>
        </>
      ))}
    </AriaListBoxItem>
  )
}
