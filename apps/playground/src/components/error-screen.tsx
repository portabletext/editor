import {isError} from 'remeda'
import {Button} from './button'

export function ErrorScreen(props: {area: string; error: Error; dismiss: () => void}) {
  return (
    <div className="flex-1 bg-red-100 border border-red-200 text-red-900 flex flex-col gap-2 p-2">
      <div className="font-medium">
        The <code className="font-bold">{props.area}</code> crashed!
      </div>
      <div className="font-mono text-sm">{getErrorMessage(props.error, 'Unknown error')}</div>
      <Button variant="destructive" className="self-start" size="sm" onPress={props.dismiss}>
        Try again
      </Button>
    </div>
  )
}

export function getErrorMessage(error: unknown, fallback: string) {
  return isError(error) ? error.message : fallback
}
