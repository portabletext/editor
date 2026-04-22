import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineContainer, defineSchema} from '../src'
import {ContainerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image', fields: [{name: 'src', type: 'string'}]},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
  ],
})

const calloutContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout',
  field: 'content',
})

describe('click above/below lonely block object in containers', () => {
  test('Scenario: clicking below a lonely block object inside a container inserts a text block after it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const imageKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: imageKey,
              _type: 'image',
              src: 'https://example.com/pic.png',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })

    await userEvent.click(locator)

    const imageSelection = {
      anchor: {
        path: [{_key: calloutKey}, 'content', {_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: calloutKey}, 'content', {_key: imageKey}],
        offset: 0,
      },
    }

    editor.send({type: 'select', at: imageSelection})

    editor.send({
      type: 'mouse.click',
      position: {
        block: 'end',
        isEditor: false,
        isContainer: true,
        selection: imageSelection,
      },
    })

    await vi.waitFor(() => {
      const callout = editor.getSnapshot().context.value[0] as unknown as {
        _type: string
        content: Array<{_type: string; _key: string}>
      }
      expect(callout._type).toBe('callout')
      expect(callout.content).toHaveLength(2)
      expect(callout.content[0]!._type).toBe('image')
      expect(callout.content[1]!._type).toBe('block')
    })
  })

  test('Scenario: clicking above a lonely block object inside a container inserts a text block before it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const imageKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: imageKey,
              _type: 'image',
              src: 'https://example.com/pic.png',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })

    await userEvent.click(locator)

    const imageSelection = {
      anchor: {
        path: [{_key: calloutKey}, 'content', {_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: calloutKey}, 'content', {_key: imageKey}],
        offset: 0,
      },
    }

    editor.send({type: 'select', at: imageSelection})

    editor.send({
      type: 'mouse.click',
      position: {
        block: 'start',
        isEditor: false,
        isContainer: true,
        selection: imageSelection,
      },
    })

    await vi.waitFor(() => {
      const callout = editor.getSnapshot().context.value[0] as unknown as {
        _type: string
        content: Array<{_type: string; _key: string}>
      }
      expect(callout._type).toBe('callout')
      expect(callout.content).toHaveLength(2)
      expect(callout.content[0]!._type).toBe('block')
      expect(callout.content[1]!._type).toBe('image')
    })
  })
})
