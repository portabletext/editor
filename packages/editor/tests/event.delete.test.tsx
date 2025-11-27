import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('event.delete', () => {
  test('Scenario: Deleting collapsed selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo',
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'bar',
            },
          ],
        },
        {
          _type: 'image',
          _key: 'k4',
        },
      ],
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'bar',
        '{image}',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foobar',
        '{image}',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
    })
  })

  test('Scenario: Deleting entire editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: imageKey,
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Deleting selection hanging around a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #2', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        backward: true,
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #3', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'k2',
          _type: 'image',
        },
        {
          _key: 'k3',
          _type: 'block',
          children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        '{image}',
        'bar',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })
  })

  describe('Scenario: Deleting backwards selection starting on a block object', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const fooBlock = {
      _key: fooBlockKey,
      _type: 'block',
      children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const barBlock = {
      _key: barBlockKey,
      _type: 'block',
      children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const image = {
      _key: imageKey,
      _type: 'image',
    }
    const bazBlock = {
      _key: bazBlockKey,
      _type: 'block',
      children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    describe('with trailing text block', () => {
      test('without selection', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [fooBlock, barBlock, image, bazBlock],
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: imageKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: fooBlockKey}],
              offset: 0,
            },
            backward: true,
          },
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['', 'baz'])

          expect(editor.getSnapshot().context.selection).toBeNull()
        })
      })

      test('with selection', async () => {
        const {locator, editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [fooBlock, barBlock, image, bazBlock],
        })

        const selection = {
          anchor: {
            path: [{_key: imageKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: fooBlockKey}],
            offset: 0,
          },
          backward: true,
        }

        await userEvent.click(locator)

        editor.send({
          type: 'select',
          at: selection,
        })
        editor.send({
          type: 'delete',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['', 'baz'])
          expect(editor.getSnapshot().context.selection).toEqual({
            anchor: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 0,
            },
            backward: false,
          })
        })
      })
    })

    test('without trailing text block', async () => {
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [fooBlock, barBlock, image],
      })

      editor.send({
        type: 'delete',
        at: {
          anchor: {
            path: [{_key: imageKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: fooBlockKey}],
            offset: 0,
          },
          backward: true,
        },
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
      })
    })
  })

  test('Scenario: Deleting block offset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const blockBKey = keyGenerator()
    const fizzKey = keyGenerator()
    const buzzKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo'},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: 'baz'},
          ],
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: fizzKey, text: 'fizz'},
            {_type: 'span', _key: buzzKey, text: 'buzz', marks: ['strong']},
          ],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockBKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockBKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,bar,baz',
        'fi,z',
      ])
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockAKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockAKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foaz', 'fi,z'])
    })
  })

  test('Scenario: Deleting multiple blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block0Key = keyGenerator()
    const block1Key = keyGenerator()
    const block2Key = keyGenerator()
    const block3Key = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: block0Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
        },
        {
          _type: 'image',
          _key: block1Key,
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'bar'}],
        },
        {
          _type: 'block',
          _key: block3Key,
          children: [{_type: 'span', _key: keyGenerator(), text: 'baz'}],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: block0Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}],
          offset: 0,
        },
      },
      unit: 'block',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['baz'])
    })
  })

  test('Scenario: Deleting without selection', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar baz'}],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 8,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo baz'])
      expect(editor.getSnapshot().context.selection).toBeNull()
    })
  })

  test('Scenario: Deleting before selection', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar baz'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'baz'),
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 8,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo baz'])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Deleting after selection', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar baz'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 8,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo baz'])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  describe('unit: child', () => {
    describe('Scenario: deleting text block children', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barKey = keyGenerator()
      const initialValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo'},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: barKey, text: 'bar'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ]

      test('end-to-end selection', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 3,
            },
          },
          unit: 'child',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
        })
      })

      test('mid-span to mid-span selection', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 1,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: barKey}],
              offset: 2,
            },
          },
          unit: 'child',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
        })
      })

      test('partial span selection', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 1,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 2,
            },
          },
          unit: 'child',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            ',{stock-ticker},bar',
          ])
        })
      })

      test('inline object selection', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
              offset: 0,
            },
          },
          unit: 'child',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
        })
      })
    })
  })

  test('Scenario: Deleting block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
      unit: 'child',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['{image}'])
    })
  })

  test('Scenario: Deleting across block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo'}],
        },
        {
          _type: 'image',
          _key: imageKey,
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar'}],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 2,
        },
      },
      unit: 'child',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '',
        '{image}',
        '',
      ])
    })
  })
})
