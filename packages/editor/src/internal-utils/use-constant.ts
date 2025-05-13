import React from 'react'

type ConstantRef<TConstant> = {constant: TConstant}

export default function useConstant<TConstant>(
  factory: () => TConstant,
): TConstant {
  const ref = React.useRef<ConstantRef<TConstant>>(null)

  if (!ref.current) {
    ref.current = {constant: factory()}
  }

  return ref.current.constant
}
