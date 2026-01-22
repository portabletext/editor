import type React from 'react'
import {
  Popover as AriaPopover,
  composeRenderProps,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {container} from './container'

export interface PopoverProps extends Omit<AriaPopoverProps, 'children'> {
  showArrow?: boolean
  children: React.ReactNode
}

const styles = tv({
  extend: container,
  base: 'bg-white dark:bg-gray-800 z-50 forced-colors:bg-[Canvas] shadow-2xl rounded-xl bg-clip-padding border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-200',
  variants: {
    isEntering: {
      true: 'animate-in fade-in data-[placement=bottom]:slide-in-from-top-1 data-[placement=top]:slide-in-from-bottom-1 data-[placement=left]:slide-in-from-right-1 data-[placement=right]:slide-in-from-left-1 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out fade-out data-[placement=bottom]:slide-out-to-top-1 data-[placement=top]:slide-out-to-bottom-1 data-[placement=left]:slide-out-to-right-1 data-[placement=right]:slide-out-to-left-1 ease-in duration-150',
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
