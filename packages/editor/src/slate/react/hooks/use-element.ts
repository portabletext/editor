import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {createContext} from 'react'

export const ElementContext = createContext<
  PortableTextTextBlock | PortableTextObject | null
>(null)
