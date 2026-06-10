import {createContext} from 'react'
import type {Relay} from './relay'

export const RelayContext = createContext<Relay>({} as Relay)
