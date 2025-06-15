import {cn} from '@/lib/utils'
import {Control} from 'react-hook-form'

export interface FormControl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>
}
export const requiredFieldText = 'Required'

interface FormErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string | undefined
}

export const FormError: React.FC<FormErrorProps> = ({
  error = undefined,
  className,
}) =>
  error && (
    <span className={cn('text-pink-600 text-xs ml-3 font-normal', className)}>
      {error}
    </span>
  )
