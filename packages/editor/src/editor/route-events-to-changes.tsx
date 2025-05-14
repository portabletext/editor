import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorChange} from '../types/editor'
import type {InternalEditorEmittedEvent, RelayActor} from './relay-machine'

export function RouteEventsToChanges(props: {
  relayActor: RelayActor
  onChange: (change: EditorChange) => void
}) {
  // We want to ensure that _when_ `props.onChange` is called, it uses the current value.
  // But we don't want to have the `useEffect` run setup + teardown + setup every time the prop might change, as that's unnecessary.
  // So we use our own polyfill that lets us use an upcoming React hook that solves this exact problem.
  // https://19.react.dev/learn/separating-events-from-effects#declaring-an-effect-event
  const handleChange = useEffectEvent((change: EditorChange) =>
    props.onChange(change),
  )

  useEffect(() => {
    const sub = props.relayActor.on('*', (event) => {
      const change = eventToChange(event)

      if (change) {
        handleChange(change)
      }
    })
    return () => {
      sub.unsubscribe()
    }
  }, [props.relayActor])

  return null
}

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
