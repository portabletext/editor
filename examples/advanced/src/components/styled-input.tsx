import {Input} from '@/components/ui/input'
import {cn} from '@/lib/utils'
import * as React from 'react'

export const inputStyle = cn(
  'flex h-9 w-full rounded-md border border-background-dark-10 dark:border-background-light-10 px-3',
  'text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm',
  'file:font-medium file:text-slate-950 placeholder:text-slate-500 focus-visible:outline-hidden',
  'focus-visible:ring-2 focus:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
  'dark:file:text-slate-50 dark:text-stone-200 dark:placeholder:text-slate-400 dark:focus-visible:ring-accent',
  'dark:bg-transparent bg-transparent',
)

function StyledInput({className, ...props}: React.ComponentProps<'input'>) {
  return <Input className={cn(inputStyle, className)} {...props} />
}

export {StyledInput}
