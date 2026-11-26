import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type Operation,
} from '../src'
import {createPlaceholderBlock} from '../src/internal-utils/create-placeholder-block'
import {EventListenerPlugin, EditorRefPlugin, NodePlugin} from '../src/plugins'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {getTextBlock} from '../src/traversal/get-text-block'

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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
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

  describe('Placeholder removed by incoming patch', () => {
    test('Scenario: Placeholder removed by incoming patch with no foreign value', async () => {
      let foreignValue: Array<PortableTextBlock> | undefined
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: foreignValue,
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  patches.push(patch)
                  foreignValue = applyAll(foreignValue, [patch])
                }
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: 'k0'}],
          },
        ],
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

    test('Scenario: Placeholder removed by incoming patch with a foreign value', async () => {
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
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  patches.push(patch)
                  foreignValue = applyAll(foreignValue, [patch])
                }
              }
            }}
          />
        ),
      })

      const unsetPatch = unset([{_key: blockKey}])
      editor.send({
        type: 'apply',
        patches: [
          {
            ...unsetPatch,
            origin: 'remote',
          },
        ],
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

    test('Scenario: Undoing placeholder insertion after an incoming patch is a noop', async () => {
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
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  patches.push(patch)
                }
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: 'k0'}],
          },
        ],
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
        expect(patches).toEqual([
          {
            type: 'set',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
            ],
            position: 'before',
            items: [
              {
                _type: 'span',
                _key: 'k2',
                text: '',
                marks: [],
              },
            ],
          },
        ])
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
        expect(patches).toEqual([
          {
            type: 'set',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
            ],
            position: 'before',
            items: [
              {
                _type: 'span',
                _key: 'k2',
                text: '',
                marks: [],
              },
            ],
          },
        ])
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    foreignValue = undefined
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: imageKey}],
        },
      ],
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        set('bar', [{_key: 'k0'}, 'foo']),
      ])
    })
  })

  test('Scenario: Deleting the placeholder block and typing', async () => {
    let foreignValue: Array<PortableTextBlock> | undefined
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }
          }}
        />
      ),
    })

    editor.send({type: 'delete.block', at: [{_key: 'k0'}]})

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
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        unset([{_key: 'k0'}]),
        unset([]),
      ])
      expect(foreignValue, 'Unexpected foreign value').toEqual(undefined)
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches.slice(4)).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        diffMatchPatch('', 'f', [
          {_key: 'k2'},
          'children',
          {_key: 'k3'},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Replacing all block objects with a text block', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKeyA = keyGenerator()
    const imageKeyB = keyGenerator()
    let foreignValue: Array<PortableTextBlock> | undefined = [
      {_type: 'image', _key: imageKeyA},
      {_type: 'image', _key: imageKeyB},
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    const imagesSelection = {
      anchor: {path: [{_key: imageKeyA}], offset: 0},
      focus: {path: [{_key: imageKeyB}], offset: 0},
    }

    editor.send({type: 'select', at: imagesSelection})

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'foo')

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: imagesSelection},
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches).toEqual([
        unset([{_key: imageKeyB}]),
        unset([{_key: imageKeyA}]),
        unset([]),
        setIfMissing([], []),
        set([], [{_key: 'k4'}, 'markDefs']),
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k4',
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        setIfMissing([], [{_key: 'k4'}, 'children']),
        insert([{_type: 'span', _key: 'k8', text: 'foo', marks: []}], 'after', [
          {_key: 'k4'},
          'children',
          {_key: 'k5'},
        ]),
        diffMatchPatch('', 'foo', [
          {_key: 'k4'},
          'children',
          {_key: 'k5'},
          'text',
        ]),
        unset([{_key: 'k4'}, 'children', {_key: 'k8'}]),
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
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
      expect(patches).toEqual([unset([{_key: imageKey}]), unset([])])
      expect(foreignValue, 'Unexpected foreign value').toEqual(undefined)
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

      expect(patches.slice(2)).toEqual([
        // The editor is reset
        setIfMissing([], []),
        // A placeholder block is inserted
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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

  test('Scenario: Undoing the deletion of the placeholder and typing', async () => {
    let foreignValue: Array<PortableTextBlock> | undefined
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
                foreignValue = applyAll(foreignValue, [patch])
              }
            }
          }}
        />
      ),
    })

    const placeholder = {
      _type: 'block',
      _key: 'k0',
      children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    editor.send({type: 'delete.block', at: [{_key: 'k0'}]})

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
      expect(patches).toEqual([
        setIfMissing([], []),
        insert([placeholder], 'before', [0]),
        unset([{_key: 'k0'}]),
        unset([]),
      ])
      expect(foreignValue).toEqual(undefined)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([placeholder])
      expect(patches.slice(4)).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        unset([{_key: 'k2'}]),
        unset([]),
        setIfMissing([], []),
        insert([placeholder], 'before', [0]),
      ])
      expect(foreignValue).toEqual([placeholder])
    })

    editor.send({type: 'insert.text', text: 'f'})

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
      expect(patches.slice(10)).toEqual([
        diffMatchPatch('', 'f', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ])
    })
  })

  test('Scenario: Redoing the deletion of a lonely block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    let hostValue: Array<PortableTextBlock> | undefined = [
      {_type: 'image', _key: blockKey},
    ]
    const values: Array<import('../src').ChangeEvent['value']> = []
    const patches: Array<Patch> = []
    const operations: Array<Operation> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: hostValue,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
    })
    editor.on('change', (event) => {
      values.push(event.value)

      if (event.origin === 'local') {
        for (const {origin: _, ...patch} of event.patches) {
          patches.push(patch)
          hostValue = applyAll(hostValue, [patch])
        }
      }
    })
    editor.on('operation', (event) => {
      expect(Object.hasOwn(event.operation, 'patching')).toEqual(false)
      operations.push(event.operation)
    })
    editor.send({type: 'delete.block', at: [{_key: blockKey}]})
    await vi.waitFor(() => {
      expect(patches).toEqual([unset([{_key: blockKey}]), unset([])])
      expect(hostValue).toEqual(undefined)
      expect(values.at(-1)).toEqual(undefined)
    })
    patches.length = 0
    values.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            },
          ],
          'before',
          [0],
        ),
        unset([{_key: 'k3'}]),
        unset([]),
        setIfMissing([], []),
        insert([{_type: 'image', _key: blockKey}], 'before', [0]),
      ])
      expect(hostValue).toEqual([{_type: 'image', _key: blockKey}])
      expect(values.at(-1)).toEqual([{_type: 'image', _key: blockKey}])
    })

    patches.length = 0
    values.length = 0
    operations.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(patches).toEqual([unset([{_key: blockKey}]), unset([])])
      expect(hostValue).toEqual(undefined)
      expect(values.at(-1)).toEqual(undefined)
      expect(operations).toEqual([
        {
          type: 'unset',
          path: [{_key: blockKey}],
          inverse: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: {_type: 'image', _key: blockKey},
          },
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
          inverse: {type: 'unset', path: [{_key: 'k3'}]},
        },
      ])
    })
    patches.length = 0
    values.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            },
          ],
          'before',
          [0],
        ),
        unset([{_key: 'k3'}]),
        unset([]),
        setIfMissing([], []),
        insert([{_type: 'image', _key: blockKey}], 'before', [0]),
      ])
      expect(hostValue).toEqual([{_type: 'image', _key: blockKey}])
      expect(values.at(-1)).toEqual([{_type: 'image', _key: blockKey}])
    })

    patches.length = 0
    values.length = 0
    operations.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(patches).toEqual([unset([{_key: blockKey}]), unset([])])
      expect(hostValue).toEqual(undefined)
      expect(values.at(-1)).toEqual(undefined)
      expect(operations).toEqual([
        {
          type: 'unset',
          path: [{_key: blockKey}],
          inverse: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: {_type: 'image', _key: blockKey},
          },
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
          inverse: {type: 'unset', path: [{_key: 'k3'}]},
        },
      ])
    })
    patches.length = 0
    values.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            },
          ],
          'before',
          [0],
        ),
        unset([{_key: 'k3'}]),
        unset([]),
        setIfMissing([], []),
        insert([{_type: 'image', _key: blockKey}], 'before', [0]),
      ])
      expect(hostValue).toEqual([{_type: 'image', _key: blockKey}])
      expect(values.at(-1)).toEqual([{_type: 'image', _key: blockKey}])
    })

    patches.length = 0
    values.length = 0
    editor.send({type: 'insert.text', text: 'x'})
    await vi.waitFor(() => {
      expect(hostValue).toEqual([{_type: 'image', _key: blockKey}])
      expect(values).toEqual([])
      expect(patches).toEqual([])
    })
  })

  describe('Placeholder can be represented by a custom React Node', () => {
    test('Scenario: Custom placeholder renders with no initial value', async () => {
      const renderPlaceholder = () => <div>Placeholder</div>
      const {locator} = await createTestEditor({
        editableProps: {renderPlaceholder},
      })

      await vi.waitFor(() => {
        expect(locator.getByText('Placeholder')).toBeInTheDocument()
      })
    })

    test('Scenario: Custom placeholder renders for an initial empty text block', async () => {
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

    test('Scenario: Custom placeholder does not render for an initial empty heading', async () => {
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

test('Scenario: Lonely block object removed by a remote `unset`', async () => {
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
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              const {origin: _, ...patch} = changePatch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }
        }}
      />
    ),
  })

  await userEvent.click(locator)

  foreignValue = undefined
  editor.send({type: 'apply', patches: [unset([{_key: imageKey}])]})

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
      insert(
        [
          {
            _type: 'block',
            _key: 'k3',
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'f', [{_key: 'k3'}, 'children', {_key: 'k4'}, 'text']),
    ])
  })
})

test('Scenario: Redoing a field set to an empty array leaves no host field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const operations: Array<Operation> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
  })
  editor.on('change', (event) => {
    values.push(event.value)

    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.on('operation', (event) => {
    expect(Object.hasOwn(event.operation, 'patching')).toEqual(false)
    operations.push(event.operation)
  })
  editor.send({type: 'set', at: [], value: []})
  await vi.waitFor(() => {
    expect(patches).toEqual([set([], []), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([set([], []), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'set',
        path: [],
        value: [],
        inverse: {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
          ],
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([set([], []), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'set',
        path: [],
        value: [],
        inverse: {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
          ],
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading a null entry removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [null]
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Redoing deletion of a text block leaves no host field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const operations: Array<Operation> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
  })
  editor.on('change', (event) => {
    values.push(event.value)

    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.on('operation', (event) => {
    expect(Object.hasOwn(event.operation, 'patching')).toEqual(false)
    operations.push(event.operation)
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: 'k0'}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        'before',
        [0],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: 'k0'}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'unset',
        path: [{_key: 'k0'}],
        inverse: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        'before',
        [0],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: 'k0'}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'unset',
        path: [{_key: 'k0'}],
        inverse: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        'before',
        [0],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
  })
})

test('Scenario: Redoing field unset leaves no host field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const operations: Array<Operation> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
  })
  editor.on('change', (event) => {
    values.push(event.value)

    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.on('operation', (event) => {
    expect(Object.hasOwn(event.operation, 'patching')).toEqual(false)
    operations.push(event.operation)
  })
  editor.send({type: 'unset', at: []})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'unset',
        path: [],
        inverse: {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
          ],
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'unset',
        path: [],
        inverse: {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
          ],
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      set(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        [],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
  })
})

test('Scenario: Redoing a field set to an empty array while read-only keeps the host document', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  editor.send({type: 'set', at: [], value: []})
  await vi.waitFor(() => {
    expect(patches).toEqual([set([], []), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'update readOnly', readOnly: true})
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  editor.send({type: 'history.redo'})
  expect(patches).toEqual([])
  expect(hostValue).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ])
  expect(values).toEqual([])
})

test('Scenario: Redoing deletion of a text block while read-only keeps the host document', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: blockKey}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'update readOnly', readOnly: true})
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  editor.send({type: 'history.redo'})
  expect(patches).toEqual([])
  expect(hostValue).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ])
  expect(values).toEqual([])
})

test('Scenario: Redoing field unset while read-only keeps the host document', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  editor.send({type: 'unset', at: []})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'update readOnly', readOnly: true})
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  editor.send({type: 'history.redo'})
  expect(patches).toEqual([])
  expect(hostValue).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ])
  expect(values).toEqual([])
})

test('Scenario: Loading only strings removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = ['foo', 'bar']
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading only numbers removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [1, 2]
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading several invalid entries removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [null, 'foo', 1]
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    ),
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([2]), unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading a null entry while read-only removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [null]
  const editorRef = createRef<Editor>()
  const {getByTestId} = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({}),
        initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable data-testid="read-only-editor" />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    </EditorProvider>,
  )
  await expect.element(getByTestId('read-only-editor')).toBeInTheDocument()
  const editor = editorRef.current!
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'update readOnly', readOnly: false})
  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading only strings while read-only removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = ['foo', 'bar']
  const editorRef = createRef<Editor>()
  const {getByTestId} = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({}),
        initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable data-testid="read-only-editor" />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    </EditorProvider>,
  )
  await expect.element(getByTestId('read-only-editor')).toBeInTheDocument()
  const editor = editorRef.current!
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'update readOnly', readOnly: false})
  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading only numbers while read-only removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [1, 2]
  const editorRef = createRef<Editor>()
  const {getByTestId} = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({}),
        initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable data-testid="read-only-editor" />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    </EditorProvider>,
  )
  await expect.element(getByTestId('read-only-editor')).toBeInTheDocument()
  const editor = editorRef.current!
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'update readOnly', readOnly: false})
  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading several invalid entries while read-only removes the host field', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: unknown = [null, 'foo', 1]
  const editorRef = createRef<Editor>()
  const {getByTestId} = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition: defineSchema({}),
        initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable data-testid="read-only-editor" />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
              hostValue = applyAll(hostValue, [patch])
            }
          }
        }}
      />
    </EditorProvider>,
  )
  await expect.element(getByTestId('read-only-editor')).toBeInTheDocument()
  const editor = editorRef.current!
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([2]), unset([1]), unset([0]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'update readOnly', readOnly: false})
  patches.length = 0
  values.length = 0
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'foo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      diffMatchPatch('', 'foo', [
        {_key: 'k2'},
        'children',
        {_key: 'k3'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Loading [] keeps the host document', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: Array<PortableTextBlock> | undefined = []
  await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: hostValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            patches.push(...event.patches)
            hostValue = applyAll(hostValue, event.patches)
          }
        }}
      />
    ),
  })
  expect(patches).toEqual([])
  expect(hostValue).toEqual([])
  expect(values).toEqual([])
})

test('Scenario: Loading undefined keeps the host document', async () => {
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  let hostValue: Array<PortableTextBlock> | undefined = undefined
  await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: hostValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            patches.push(...event.patches)
            hostValue = applyAll(hostValue, event.patches)
          }
        }}
      />
    ),
  })
  expect(patches).toEqual([])
  expect(hostValue).toEqual(undefined)
  expect(values).toEqual([])
})

test('Scenario: Redoing select-all deletion keeps the field absent', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
  })
  editor.on('change', (event) => {
    values.push(event.value)

    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 3},
    },
  })
  editor.send({
    type: 'delete',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 3},
    },
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
      unset([]),
    ])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
})

test('Scenario: Loading a malformed nested block keeps its corrected content in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [null],
        },
      ],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              values.push(event.value)

              for (const {origin: _, ...patch} of event.patches) {
                patches.push(patch)
              }
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      unset([{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', 0]),
      setIfMissing([], [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children']),
      insert([{_type: 'span', _key: 'k4', text: '', marks: []}], 'before', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        0,
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
    offset: 0,
    text: 'foo',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('', 'foo', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('', 'foo', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: Loading a malformed nested block while read-only keeps its corrected content in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [null],
        },
      ],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const editorRef = createRef<Editor>()
  const {getByTestId} = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable data-testid="read-only-editor" />
      <NodePlugin
        nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
      />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            values.push(event.value)

            for (const {origin: _, ...patch} of event.patches) {
              patches.push(patch)
            }
            hostValue = applyAll(hostValue, event.patches)
          }
        }}
      />
    </EditorProvider>,
  )
  await expect.element(getByTestId('read-only-editor')).toBeInTheDocument()
  const editor = editorRef.current!
  expect(editor.getSnapshot().context.readOnly).toEqual(true)
  await vi.waitFor(() => {
    expect(patches).toEqual([
      unset([{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', 0]),
      setIfMissing([], [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children']),
      insert([{_type: 'span', _key: 'k4', text: '', marks: []}], 'before', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        0,
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })
  editor.send({type: 'update readOnly', readOnly: false})
  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
    offset: 0,
    text: 'foo',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('', 'foo', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', '', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('', 'foo', [
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'children',
        {_key: 'k4'},
        'text',
      ]),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'foo', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: Redo after a collaborator inserts a paragraph after the original keeps both blocks in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const remoteKey = keyGenerator()
  const remoteSpanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const patches: Array<Patch> = []
  const values: Array<import('../src').ChangeEvent['value']> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => expect(hostValue).toEqual(undefined))
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ]),
  )
  const incoming = [
    insert(
      [
        {
          _type: 'block',
          _key: remoteKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: remoteSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
      'after',
      [{_key: blockKey}],
    ),
  ]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  patches.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(patches).toEqual([
      unset([{_key: 'k0'}]),
      insert(
        [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
          },
        ],
        'before',
        [{_key: 'k2'}],
      ),
    ])
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k6'}, 'children', {_key: 'k7'}], offset: 0},
      focus: {path: [{_key: 'k6'}, 'children', {_key: 'k7'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
})

test('Scenario: Redo after a collaborator inserts a paragraph before the original keeps both blocks in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const remoteKey = keyGenerator()
  const remoteSpanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const patches: Array<Patch> = []
  const values: Array<import('../src').ChangeEvent['value']> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => expect(hostValue).toEqual(undefined))
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ]),
  )
  const incoming = [
    insert(
      [
        {
          _type: 'block',
          _key: remoteKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: remoteSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
      'before',
      [{_key: blockKey}],
    ),
  ]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  patches.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(patches).toEqual([
      unset([{_key: 'k0'}]),
      insert(
        [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
          },
        ],
        'before',
        [{_key: 'k2'}],
      ),
    ])
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k6'}, 'children', {_key: 'k7'}], offset: 0},
      focus: {path: [{_key: 'k6'}, 'children', {_key: 'k7'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k7', text: 'x', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
})

test('Scenario: Redo after a collaborator inserts a block object after the original keeps both blocks in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const remoteKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const patches: Array<Patch> = []
  const values: Array<import('../src').ChangeEvent['value']> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => expect(hostValue).toEqual(undefined))
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ]),
  )
  const incoming = [
    insert([{_type: 'image', _key: remoteKey}], 'after', [{_key: blockKey}]),
  ]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  patches.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(patches).toEqual([
      unset([{_key: 'k0'}]),
      insert(
        [
          {
            _type: 'block',
            _key: 'k5',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
          },
        ],
        'before',
        [{_key: 'k2'}],
      ),
    ])
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 0},
      focus: {path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
  })
})

test('Scenario: Redo after a collaborator inserts a block object before the original keeps both blocks in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const remoteKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const patches: Array<Patch> = []
  const values: Array<import('../src').ChangeEvent['value']> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => expect(hostValue).toEqual(undefined))
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ]),
  )
  const incoming = [
    insert([{_type: 'image', _key: remoteKey}], 'before', [{_key: blockKey}]),
  ]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  patches.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(patches).toEqual([
      unset([{_key: 'k0'}]),
      insert(
        [
          {
            _type: 'block',
            _key: 'k5',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
          },
        ],
        'before',
        [{_key: 'k2'}],
      ),
    ])
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 0},
      focus: {path: [{_key: 'k5'}, 'children', {_key: 'k6'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'x'})
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', text: 'x', marks: []}],
      },
      {_type: 'image', _key: 'k2'},
    ])
  })
})

test('Scenario: Redoing deletion after a collaborator edit leaves no host field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const operations: Array<Operation> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
  })
  editor.on('change', (event) => {
    values.push(event.value)

    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
        hostValue = applyAll(hostValue, [patch])
      }
    }
  })
  editor.on('operation', (event) => {
    expect(Object.hasOwn(event.operation, 'patching')).toEqual(false)
    operations.push(event.operation)
  })
  editor.send({type: 'delete.block', at: [{_key: blockKey}]})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: 'k0'}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
  })
  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      unset([{_key: 'k4'}]),
      unset([]),
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        'before',
        [0],
      ),
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(values.at(-1)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  const incoming = [set('h1', [{_key: blockKey}, 'style'])]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  expect(hostValue).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'h1',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
  ])
  expect(values.at(-1)).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'h1',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
  ])
  patches.length = 0
  values.length = 0
  operations.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([{_key: 'k0'}]), unset([])])
    expect(hostValue).toEqual(undefined)
    expect(values.at(-1)).toEqual(undefined)
    expect(operations).toEqual([
      {
        type: 'unset',
        path: [{_key: 'k0'}],
        inverse: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        },
      },
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
        inverse: {type: 'unset', path: [{_key: 'k4'}]},
      },
    ])
  })
})

test('Scenario: A collaborator emptying a callout keeps the nested empty block in the host', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
    children: (
      <>
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              values.push(event.value)

              for (const {origin: _, ...patch} of event.patches) {
                patches.push(patch)
              }
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  const incoming = [unset([{_key: calloutKey}, 'content', {_key: blockKey}])]
  hostValue = applyAll(hostValue, incoming)
  editor.send({type: 'apply', patches: incoming})
  expect(patches).toEqual([
    setIfMissing([], [{_key: 'k0'}, 'content']),
    insert(
      [
        {
          _type: 'block',
          _key: 'k5',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
      ],
      'before',
      [{_key: 'k0'}, 'content', 0],
    ),
  ])
  expect(hostValue).toEqual([
    {
      _type: 'callout',
      _key: 'k0',
      content: [
        {
          _type: 'block',
          _key: 'k5',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
      ],
    },
  ])
  expect(values.at(-1)).toEqual([
    {
      _type: 'callout',
      _key: 'k0',
      content: [
        {
          _type: 'block',
          _key: 'k5',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: An empty nested block stays in the host document', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
        },
      ],
    },
  ]
  const values: Array<import('../src').ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  await createTestEditor({
    keyGenerator,
    initialValue: hostValue,
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
    children: (
      <>
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              values.push(event.value)

              for (const {origin: _, ...patch} of event.patches) {
                patches.push(patch)
              }
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })

  expect(patches).toEqual([])
  expect(hostValue).toEqual([
    {
      _type: 'callout',
      _key: 'k0',
      content: [
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
        },
      ],
    },
  ])
  expect(values).toEqual([])
})

test('Scenario: Patched edits materialize the empty paragraph only once before typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined
  const changes: Array<unknown> = []
  const {editor} = await createTestEditor({keyGenerator})

  const blockKey = editor.getSnapshot().context.value[0]!._key
  const spanKey = getTextBlock(editor.getSnapshot(), [{_key: blockKey}])!.node
    .children[0]!._key

  editor.on('change', (event) => {
    changes.push(structuredClone(event))
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  editor.send({type: 'set', at: [{_key: blockKey}, 'style'], value: 'normal'})
  editor.send({
    type: 'set',
    at: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
    value: [],
  })

  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'style'],
            value: 'normal',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'style'],
              value: 'normal',
            },
          },
        ],
        patches: [
          {...setIfMissing([], []), origin: 'local'},
          {
            ...insert(
              [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                },
              ],
              'before',
              [0],
            ),
            origin: 'local',
          },
          {...set('normal', [{_key: 'k0'}, 'style']), origin: 'local'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
              value: [],
            },
          },
        ],
        patches: [
          {
            ...set([], [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'insert.text',
    at: [{_key: blockKey}, 'children', {_key: spanKey}],
    offset: 0,
    text: 'foo',
  })
  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual(hostValue)
  })
})
