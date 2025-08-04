import type {EditorChange} from '../types/editor'
import type {InternalEditorEmittedEvent} from './relay-machine'

export function eventToChange(
  event: InternalEditorEmittedEvent,
): EditorChange | undefined {
  switch (event.type) {
    case 'blurred': {
      return {type: 'blur', event: event.event}
    }
    case 'patch':
      return event
    case 'loading': {
      return {type: 'loading', isLoading: true}
    }
    case 'done loading': {
      return {type: 'loading', isLoading: false}
    }
    case 'focused': {
      return {type: 'focus', event: event.event}
    }
    case 'value changed': {
      return {type: 'value', value: event.value}
    }
    case 'invalid value': {
      return {
        type: 'invalidValue',
        resolution: event.resolution,
        value: event.value,
      }
    }
    case 'mutation': {
      return event
    }
    case 'ready': {
      return event
    }
    case 'selection': {
      return event
    }
    case 'unset': {
      return event
    }
  }
}
