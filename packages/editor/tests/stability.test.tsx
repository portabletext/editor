import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type RenderStyleFunction} from '../src'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'custom'}],
})

function block(blockKey: string, spanKey: string, style: string) {
  return {
    _type: 'block' as const,
    _key: blockKey,
    children: [{_type: 'span' as const, _key: spanKey, text: 'foo', marks: []}],
    markDefs: [],
    style,
  }
}

describe('render stability', () => {
  // The editable leaf (the span holding the caret's text node) must survive a
  // style change as long as the style render keeps the same component type for
  // every style. This is the property Studio's custom style components break:
  // see the next test.
  test('Leaf stays mounted across a style change when the style render keeps the component type', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    // Same component (`<div>`) for every style; only the data attribute differs.
    const renderStyle: RenderStyleFunction = (props) => (
      <div data-style={props.value}>{props.children}</div>
    )

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [block(blockKey, spanKey, 'normal')],
      editableProps: {renderStyle},
    })

    const leafBefore = locator.element().querySelector('[data-pt-marks]')
    expect(leafBefore).not.toBeNull()

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
        },
      ],
      snapshot: [block(blockKey, spanKey, 'h1')],
    })

    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-style="h1"]'),
      ).not.toBeNull()
    })

    expect(locator.element().querySelector('[data-pt-marks]')).toBe(leafBefore)
  })

  // Contrast: when the style render swaps the component *type* per style, exactly
  // what Studio's `Style.tsx` does (`CustomComponent ? <CustomComponent> :
  // <DefaultComponent>`), React remounts the subtree and the leaf is a new node.
  // The churn comes from the consumer's type swap, not from PTE.
  test('Leaf is remounted when the style render swaps the component type', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const Plain = (props: {children: React.ReactNode}) => (
      <div data-style="plain">{props.children}</div>
    )
    const Custom = (props: {children: React.ReactNode}) => (
      <section data-style="custom">{props.children}</section>
    )
    const renderStyle: RenderStyleFunction = (props) =>
      props.value === 'custom' ? (
        <Custom>{props.children}</Custom>
      ) : (
        <Plain>{props.children}</Plain>
      )

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [block(blockKey, spanKey, 'normal')],
      editableProps: {renderStyle},
    })

    const leafBefore = locator.element().querySelector('[data-pt-marks]')
    expect(leafBefore).not.toBeNull()

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'style'],
          value: 'custom',
        },
      ],
      snapshot: [block(blockKey, spanKey, 'custom')],
    })

    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-style="custom"]'),
      ).not.toBeNull()
    })

    expect(locator.element().querySelector('[data-pt-marks]')).not.toBe(
      leafBefore,
    )
  })
})
