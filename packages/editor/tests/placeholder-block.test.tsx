import {
  applyAll,
  diffMatchPatch,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createPlaceholderBlock} from '../src/internal-utils/create-placeholder-block'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe(createPlaceholderBlock.name, () => {
  test('Scenario: Initial value resembling placeholder block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)

      expect(patches).toEqual([
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Initial value resembling placeholder block, but with different style', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
        markDefs: [],
        style: 'h1',
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: foreignValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'f', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)

      expect(patches).toEqual([
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })
  })

  describe('Scenario: Placeholder removed by incoming patch', () => {
    test('no foreign value', async () => {
      let foreignValue: Array<PortableTextBlock> | undefined
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: foreignValue,
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: 'k0'}],
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(foreignValue).toEqual(undefined)
        expect(patches).toEqual([])
      })
    })

    test('with foreign value', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      let foreignValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      const patches: Array<Patch> = []
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: foreignValue,
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }}
          />
        ),
      })

      const unsetPatch = unset([{_key: blockKey}])
      editor.send({
        type: 'patches',
        patches: [
          {
            ...unsetPatch,
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })
      foreignValue = applyAll(foreignValue, [unsetPatch])

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k4',
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(foreignValue).toEqual([])
        expect(patches).toEqual([])
      })

      await userEvent.click(locator)
      await userEvent.type(locator, 'f')

      await vi.waitFor(() => {
        const expectedValue = [
          {
            _type: 'block',
            _key: 'k4',
            children: [{_type: 'span', _key: 'k5', text: 'f', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ]
        expect(editor.getSnapshot().context.value).toEqual(expectedValue)
        expect(foreignValue).toEqual(expectedValue)
      })
    })

    test('undoing placeholder insertion is a noop', async () => {
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _type: 'block',
            _key: 'k0',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                patches.push(patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: 'k0'}],
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k3',
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(patches).toEqual([])
      })

      editor.send({
        type: 'history.undo',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k3',
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(patches).toEqual([])
      })
    })
  })

  test('Scenario: Lonely block object removed by incoming patch', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue: Array<PortableTextBlock> | undefined = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: foreignValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    foreignValue = undefined
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: imageKey}],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches).toEqual([])
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        diffMatchPatch('', 'f', [
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Lonely block object removed by updated value', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue: Array<PortableTextBlock> | undefined = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    foreignValue = undefined
    editor.send({
      type: 'update value',
      value: foreignValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([])
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        diffMatchPatch('', 'f', [
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Adding and removing text in an empty editor', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches).toEqual([
        // The editor is set up
        setIfMissing([], []),
        // A placeholder block is inserted
        set(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        // The text is added
        diffMatchPatch('', 'f', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ])
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches.slice(3)).toEqual([
        // The text is deleted
        diffMatchPatch('f', '', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
        // The editor is reset
        unset([]),
      ])
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches.slice(5)).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        diffMatchPatch('', 'f', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Setting custom props on placeholder after clearing it', async () => {
    let foreignValue: Array<PortableTextBlock> | undefined
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'foo', type: 'string'}]},
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        diffMatchPatch('', 'f', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ])
    })

    await userEvent.keyboard('{Backspace}')

    editor.send({
      type: 'block.set',
      at: [{_key: 'k0'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          foo: 'bar',
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue, 'Unexpected foreign value').toEqual(expectedValue)

      expect(patches.slice(3)).toEqual([
        diffMatchPatch('f', '', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
        unset([]),
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        set('bar', [{_key: 'k0'}, 'foo']),
      ])
    })
  })

  test('Scenario: Deleting lonely block object and typing', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
      expect(patches).toEqual([unset([{_key: imageKey}])])
      expect(foreignValue, 'Unexpected foreign value').toEqual([])
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)

      expect(patches.slice(1)).toEqual([
        // The editor is reset
        setIfMissing([], []),
        // A placeholder block is inserted
        set(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        // The text is added
        diffMatchPatch('', 'f', [
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
          'text',
        ]),
      ])
    })
  })

  describe('Scenario: Placeholder can be represented by a custom React Node', () => {
    test('no initial value', async () => {
      const renderPlaceholder = () => <div>Placeholder</div>
      const {locator} = await createTestEditor({
        editableProps: {renderPlaceholder},
      })

      await vi.waitFor(() => {
        expect(locator.getByText('Placeholder')).toBeInTheDocument()
      })
    })

    test('initial empty text block', async () => {
      const renderPlaceholder = () => <div>Placeholder</div>
      const {locator} = await createTestEditor({
        initialValue: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {renderPlaceholder},
      })

      await vi.waitFor(() => {
        expect(locator.getByText('Placeholder')).toBeInTheDocument()
      })
    })

    test('initial empty heading does not render placeholder', async () => {
      const renderPlaceholder = () => <div>Placeholder</div>
      const {locator} = await createTestEditor({
        schemaDefinition: defineSchema({
          styles: [{name: 'h1'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'h1',
          },
        ],
        editableProps: {renderPlaceholder},
      })

      await vi.waitFor(() => {
        expect(locator.getByText('Placeholder')).not.toBeInTheDocument()
      })
    })
  })
})
