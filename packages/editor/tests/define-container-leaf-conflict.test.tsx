import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineContainer, defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const cardSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'card',
      fields: [
        {name: 'content', type: 'array', of: [{type: 'block'}]},
        {name: 'aside', type: 'array', of: [{type: 'block'}]},
      ],
    },
  ],
})

const calloutSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const factBoxSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'fact-box',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

describe('defineContainer / defineLeaf conflict resolution', () => {
  test('Same scope registered twice as container (different field) keeps the first registration', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: cardSchemaDefinition,
      initialValue: [],
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..card',
                field: 'content',
              }),
            ]}
          />
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..card',
                field: 'aside',
              }),
            ]}
          />
        </>
      ),
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('already registered'),
    )

    expect(
      editor.getSnapshot().context.containers.get('card')?.field.name,
    ).toBe('content')

    warnSpy.mockRestore()
  })

  test('Same scope registered twice as container (same field) warns and keeps the first', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [],
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..callout',
                field: 'content',
              }),
            ]}
          />
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..callout',
                field: 'content',
              }),
            ]}
          />
        </>
      ),
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('already registered'),
    )

    warnSpy.mockRestore()
  })

  test('Same scope registered twice as leaf warns and keeps the first', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [],
      children: (
        <>
          <LeafPlugin
            leafs={[
              defineLeaf({
                scope: '$..callout',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <LeafPlugin
            leafs={[
              defineLeaf({
                scope: '$..callout',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('already registered'),
    )

    warnSpy.mockRestore()
  })

  test('Scope registered as container then leaf warns and rejects the leaf', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: factBoxSchemaDefinition,
      initialValue: [],
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..fact-box',
                field: 'content',
              }),
            ]}
          />
          <LeafPlugin
            leafs={[
              defineLeaf({
                scope: '$..fact-box',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('registered as a container'),
    )

    expect(editor.getSnapshot().context.containers.has('fact-box')).toBe(true)

    warnSpy.mockRestore()
  })

  test('Scope registered as leaf then container warns and rejects the container', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: factBoxSchemaDefinition,
      initialValue: [],
      children: (
        <>
          <LeafPlugin
            leafs={[
              defineLeaf({
                scope: '$..fact-box',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..fact-box',
                field: 'content',
              }),
            ]}
          />
        </>
      ),
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('registered as a leaf'),
    )

    expect(editor.getSnapshot().context.containers.has('fact-box')).toBe(false)

    warnSpy.mockRestore()
  })
})
