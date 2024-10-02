import {Check} from 'lucide-react'
import {
  ListBoxItem as AriaListBoxItem,
  Collection,
  composeRenderProps,
  Header,
  Section,
  type ListBoxItemProps,
  type SectionProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'

export const dropdownItemStyles = tv({
  base: 'group flex items-center gap-4 cursor-default select-none py-1 pl-2 pr-0.5 rounded-lg outline outline-0 text-xs forced-color-adjust-none',
  variants: {
    isDisabled: {
      false: 'text-gray-900 dark:text-zinc-100',
      true: 'text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
  },
  compoundVariants: [
    {
      isFocused: false,
      isOpen: true,
      className: 'bg-gray-100 dark:bg-zinc-700/60',
    },
  ],
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
            {isSelected && <Check className="w-4 h-4" />}
          </span>
        </>
      ))}
    </AriaListBoxItem>
  )
}

export interface DropdownSectionProps<T> extends SectionProps<T> {
  title?: string
}

export function DropdownSection<T extends object>(
  props: DropdownSectionProps<T>,
) {
  return (
    <Section className="first:-mt-[5px] after:content-[''] after:block after:h-[5px]">
      <Header className="text-sm font-semibold text-gray-500 dark:text-zinc-300 px-4 py-1 truncate sticky -top-[5px] -mt-px -mx-1 z-10 bg-gray-100/60 dark:bg-zinc-700/60 backdrop-blur-md supports-[-moz-appearance:none]:bg-gray-100 border-y dark:border-y-zinc-700 [&+*]:mt-1">
        {props.title}
      </Header>
      <Collection items={props.items}>{props.children}</Collection>
    </Section>
  )
}
