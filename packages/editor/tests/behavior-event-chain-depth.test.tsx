import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event chain depth backstop', () => {
  test('a cyclic Behavior fails loudly instead of overflowing the call stack', async () => {
    const consoleErrors: Array<string> = []
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: Array<unknown>) => {
        consoleErrors.push(
          args
            .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
            .join(' '),
        )
      })

    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.loop',
              actions: [() => [raise({type: 'custom.loop'})]],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({type: 'custom.loop'})

    errorSpy.mockRestore()

    expect(
      consoleErrors.some((message) => message.includes('exceeded a depth')),
    ).toBe(true)
    expect(
      consoleErrors.some((message) => message.includes('Maximum call stack')),
    ).toBe(false)

    // The editor is still intact and usable
    expect(editor.getSnapshot().context.value).toEqual([
      expect.objectContaining({
        _key: blockKey,
        children: [expect.objectContaining({text: 'foo'})],
      }),
    ])
  })
})
