import {Button} from '@/components/ui/button'
import {buttonVariants} from '@/lib/buttonVariants'
import {cn} from '@/lib/utils'
import {type VariantProps} from 'class-variance-authority'
import * as React from 'react'

function StyledButton({
  className,
  variant,
  size,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  return (
    <Button
      className={cn(
        buttonVariants({variant, size, className}),
        disabled && 'opacity-40 pointer-events-none',
      )}
      {...props}
    />
  )
}

export {StyledButton}
