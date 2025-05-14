import {createContext} from 'react'
import type {RelayActor} from './relay-machine'

export const RelayActorContext = createContext<RelayActor>({} as RelayActor)
