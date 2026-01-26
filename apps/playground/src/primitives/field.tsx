import {
  composeRenderProps,
  Group,
  FieldError as RACFieldError,
  Input as RACInput,
  Label as RACLabel,
  Text,
  type FieldErrorProps,
  type GroupProps,
  type InputProps,
  type LabelProps,
  type TextProps,
} from 'react-aria-components'
import {twMerge} from 'tailwind-merge'
import {tv} from 'tailwind-variants'
import {composeTailwindRenderProps, focusRing} from './utils'

export function Label(props: LabelProps) {
  return (
    <RACLabel
      {...props}
      className={twMerge(
        'text-xs text-gray-500 dark:text-gray-400 font-medium cursor-default w-fit',
        props.className,
      )}
    />
  )
}

export function Description(props: TextProps) {
  return (
    <Text
      {...props}
      slot="description"
      className={twMerge(
        'text-sm text-gray-600 dark:text-gray-400',
        props.className,
      )}
    />
  )
}

export function FieldError(props: FieldErrorProps) {
  return (
    <RACFieldError
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'text-sm text-red-600 forced-colors:text-[Mark]',
      )}
    />
  )
}

export const fieldBorderStyles = tv({
  variants: {
    isFocusWithin: {
      false:
        'border-gray-200 dark:border-gray-700 forced-colors:border-[ButtonBorder]',
      true: 'border-blue-600 dark:border-blue-500 forced-colors:border-[Highlight]',
    },
    isInvalid: {
      true: 'border-red-600 forced-colors:border-[Mark]',
    },
    isDisabled: {
      true: 'border-gray-200 dark:border-gray-700 forced-colors:border-[GrayText]',
    },
  },
})

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: 'group flex items-center h-9 bg-white dark:bg-gray-800 forced-colors:bg-[Field] border-2 rounded-lg overflow-hidden',
  variants: fieldBorderStyles.variants,
})

export function FieldGroup(props: GroupProps) {
  return (
    <Group
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        fieldGroupStyles({...renderProps, className}),
      )}
    />
  )
}

export function Input(props: InputProps) {
  return (
    <RACInput
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md flex-1 min-w-0 outline outline-0 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 disabled:text-gray-200 dark:disabled:text-gray-600 focus:border-blue-600 dark:focus:border-blue-500',
      )}
    />
  )
}
