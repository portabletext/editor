import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {TextBlockPlugin} from '../src/plugins/plugin.text-block'
import {defineContainer, defineTextBlock} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  styles: [{name: 'normal'}],
})

const calloutSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

test('TextBlockPlugin renders custom wrapper', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <TextBlockPlugin
        textBlocks={[
          defineTextBlock({
            type: 'block',
            render: ({attributes, children}) => (
              <p data-testid="custom-block" {...attributes}>
                {children}
              </p>
            ),
          }),
        ]}
      />
    ),
  })

  await vi.waitFor(() => {
    const editorElement = document.querySelector('[data-slate-editor]')
    expect(editorElement).not.toEqual(null)
    const customBlock = editorElement!.querySelector(
      '[data-testid="custom-block"]',
    )
    expect(customBlock).not.toEqual(null)
    expect(customBlock!.textContent).toEqual('hello')
  })
})

test('Without TextBlockPlugin, engine default renders', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    const editorElement = document.querySelector('[data-slate-editor]')
    expect(editorElement).not.toEqual(null)
    const customBlock = editorElement!.querySelector(
      '[data-testid="custom-block"]',
    )
    expect(customBlock).toEqual(null)
    // Engine default fires - text block rendered without custom wrapper.
    expect(editorElement!.textContent).toEqual('hello')
  })
})

test('Cross-map collision: text-block then container for same type warns and skips', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  await createTestEditor({
    keyGenerator,
    schemaDefinition: calloutSchemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'hi', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <TextBlockPlugin
          textBlocks={[
            defineTextBlock({
              type: 'block',
              render: ({attributes, children}) => (
                <p data-testid="custom-block" {...attributes}>
                  {children}
                </p>
              ),
            }),
          ]}
        />
        <ContainerPlugin
          containers={[
            defineContainer({
              // @ts-expect-error - defineContainer({type: 'block'}) is
              // forbidden at the type level; the engine's runtime check
              // is the defensive backstop for JS-bypass callers.
              type: 'block',
            }),
          ]}
        />
      </>
    ),
  })

  await vi.waitFor(() => {
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('already registered as a text block'),
    )
  })

  warnSpy.mockRestore()
})
