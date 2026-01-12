import {describe, test} from 'vitest'
import {raise} from './behavior.types.action'

describe('raise()', () => {
  test('accepts valid synthetic events', () => {
    raise({type: 'insert.text', text: 'hello'})
  })

  test('accepts valid custom events', () => {
    raise({type: 'custom.myEvent'})
    raise({type: 'custom.hello', somePayload: 123})
  })

  test('rejects unknown event types', () => {
    // @ts-expect-error - typo in event type
    raise({type: 'inser.text', foo: 'bar'})

    // @ts-expect-error - unknown event type (not synthetic or custom.*)
    raise({type: 'unknown.event'})
  })

  test('rejects events with missing required properties', () => {
    // @ts-expect-error - missing required 'text' property
    raise({type: 'insert.text'})
  })

  test('rejects events with wrong properties', () => {
    // @ts-expect-error - wrong property
    raise({type: 'insert.text', foo: 'bar'})

    // @ts-expect-error - wrong property type
    raise({type: 'insert.text', text: 123})

    // @ts-expect-error - correct properties, but one extra wrong property
    raise({type: 'insert.text', text: 'foo', baz: 'bar'})
  })
})
