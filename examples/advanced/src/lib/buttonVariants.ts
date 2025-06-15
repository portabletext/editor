import {cva} from 'class-variance-authority'

export const buttonVariants = cva(
  'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none dark:focus-visible:ring-slate-300 p-0',
  {
    variants: {
      variant: {
        accent:
          'disabled:opacity-50 disabled:hover:brightness-95 block w-full saturate-100 rounded-md bg-accent px-3.5 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-light-10 active:bg-accent-light-40',
        default:
          'text-background dark:text-background shadow-sm bg-foreground-light-5 dark:bg-foreground-light-5 hover:bg-foreground-light-5/80 dark:hover:bg-foreground-light-5/90',
        destructive:
          'bg-red-500 text-slate-50 shadow-xs hover:bg-red-500/90 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90',
        outline:
          'border border-background-dark-10 dark:border-background-light-10 shadow-xs hover:bg-background-light-5 bg-transparent text-foreground',
        secondary:
          'bg-slate-100 text-slate-900 shadow-xs hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80',
        ghost:
          'dark:hover:bg-accent-light-10 hover:bg-accent-light-10 dark:bg-transparent bg-transparent shadow-none dark:text-foreground text-foreground',
        link: 'text-slate-900 underline-offset-4 hover:underline dark:text-slate-50',
      },
      size: {
        'default': 'h-9 px-4 py-2',
        'sm': 'h-8 rounded-md px-3 text-xs',
        'lg': 'h-10 rounded-md px-8',
        'xl': 'h-11',
        'icon': 'size-9',
        'icon-xs': 'h-6 w-6',
        'icon-sm': 'h-8 w-8 p-2',
        'icon-md': 'h-8 w-8 p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
