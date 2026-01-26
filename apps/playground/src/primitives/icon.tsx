import {isValidElement} from 'react'
import {isValidElementType} from 'react-is'

export function Icon(props: {
  icon?: React.ReactNode | React.ComponentType
  fallback: string | null
}) {
  const IconComponent = props.icon

  return isValidElement(IconComponent) ? (
    IconComponent
  ) : isValidElementType(IconComponent) ? (
    <IconComponent className="size-4" />
  ) : (
    props.fallback
  )
}
