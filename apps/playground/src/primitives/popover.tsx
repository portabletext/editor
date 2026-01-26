import type React from 'react'
import {
  Popover as AriaPopover,
  composeRenderProps,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'

export interface PopoverProps extends Omit<AriaPopoverProps, 'children'> {
  showArrow?: boolean
  children: React.ReactNode
}

const styles = tv({
  base: 'bg-white dark:bg-gray-800 z-50 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 p-2',
  variants: {
    isEntering: {
      true: 'animate-in fade-in duration-100 ease-out',
    },
    isExiting: {
      true: 'animate-out fade-out duration-75 ease-in',
    },
  },
})

export function Popover({children, className, ...props}: PopoverProps) {
  return (
    <AriaPopover
      offset={8}
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({...renderProps, className}),
      )}
    >
      {children}
    </AriaPopover>
  )
}
