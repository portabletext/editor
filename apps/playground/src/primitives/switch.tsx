import type React from 'react'
import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {composeTailwindRenderProps, focusRing} from './utils'

export interface SwitchProps extends Omit<AriaSwitchProps, 'children'> {
  children: React.ReactNode
}

const track = tv({
  extend: focusRing,
  base: 'flex h-4 w-7 px-px items-center shrink-0 cursor-default rounded-full transition duration-200 ease-in-out shadow-inner border border-transparent',
  variants: {
    isSelected: {
      false:
        'bg-gray-300 dark:bg-gray-600 group-pressed:bg-gray-400 dark:group-pressed:bg-gray-500',
      true: 'bg-blue-600 dark:bg-blue-500 forced-colors:!bg-[Highlight] group-pressed:bg-blue-700 dark:group-pressed:bg-blue-400',
    },
    isDisabled: {
      true: 'bg-gray-200 dark:bg-gray-700 forced-colors:group-selected:!bg-[GrayText] forced-colors:border-[GrayText]',
    },
  },
})

const handle = tv({
  base: 'h-3 w-3 transform rounded-full bg-white outline outline-1 -outline-offset-1 outline-transparent shadow transition duration-200 ease-in-out',
  variants: {
    isSelected: {
      false: 'translate-x-0',
      true: 'translate-x-[100%]',
    },
    isDisabled: {
      true: 'forced-colors:outline-[GrayText]',
    },
  },
})

export function Switch({children, ...props}: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'group flex gap-2 items-center text-gray-800 dark:text-gray-200 disabled:text-gray-300 dark:disabled:text-gray-600 forced-colors:disabled:text-[GrayText] text-sm transition py-[3px]',
      )}
    >
      {(renderProps) => (
        <>
          <div className={track(renderProps)}>
            <span className={handle(renderProps)} />
          </div>
          {children}
        </>
      )}
    </AriaSwitch>
  )
}
