import {createContext} from 'react'
import type {Element} from '../../interfaces/element'

export const ElementContext = createContext<Element | null>(null)
