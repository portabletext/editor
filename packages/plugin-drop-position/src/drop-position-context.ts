import type {Path} from '@portabletext/editor'
import {createContext} from 'react'

export type DropPosition = {
  path: Path
  position: 'start' | 'end'
}

export const DropPositionContext = createContext<DropPosition | undefined>(
  undefined,
)
