import clsx from 'clsx'
import {CheckCircleIcon, Info, OctagonAlert} from 'lucide-react'

interface AlertProps {
  message: string
  className?: string
  type: AlertType
}

export type AlertType = 'error' | 'success' | 'info'

export const Alert: React.FC<AlertProps> = ({
  message,
  className,
  type,
}: AlertProps) => {
  switch (type) {
    case 'success':
      return (
        <div className={clsx(className, 'rounded-md bg-green-50 p-4')}>
          <div className="flex">
            <div className="shrink-0">
              <CheckCircleIcon
                aria-hidden="true"
                className="h-5 w-5 text-green-400"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{message}</p>
            </div>
          </div>
        </div>
      )
    case 'error':
      return (
        <div
          className={clsx(
            className,
            'rounded-md bg-red-50 py-3 px-3 dark:bg-pink-950/50',
          )}
        >
          <div className="flex items-center">
            <div className="shrink-0">
              <OctagonAlert
                aria-hidden="true"
                className="h-5 w-5 ml-2 text-red-400 dark:text-pink-500"
              />
            </div>
            <div className="ml-3">
              <p className="text-md font-medium text-red-800 dark:text-pink-500">
                {message}
              </p>
            </div>
          </div>
        </div>
      )

    case 'info':
      return (
        <div
          className={clsx(
            className,
            'rounded-md bg-sky-100 py-3 px-3 dark:bg-blue-600/30',
          )}
        >
          <div className="flex items-center">
            <div className="shrink-0">
              <Info
                aria-hidden="true"
                className="h-5 w-5 ml-2 text-sky-600 dark:text-blue-200"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-sky-600 dark:text-blue-200">
                {message}
              </p>
            </div>
          </div>
        </div>
      )
  }
}
