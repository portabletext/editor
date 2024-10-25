import {createContext} from 'react'
import type {EditorActor} from './editor-machine'

export const EditorActorContext = createContext<EditorActor>({} as EditorActor)
