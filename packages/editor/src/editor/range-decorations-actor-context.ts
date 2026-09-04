import {createContext} from 'react'
import type {RangeDecorationsActor} from './range-decorations-machine'

export const RangeDecorationsActorContext =
  createContext<RangeDecorationsActor>({} as RangeDecorationsActor)
