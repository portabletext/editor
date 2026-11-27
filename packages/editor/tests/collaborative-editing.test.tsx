import {applyAll, diffMatchPatch, type Patch, set} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent, type Locator, page} from 'vitest/browser'
import {
  type Editor,
  EditorProvider,
  PortableTextEditable,
  type ChangeEvent,
} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {EventListenerPlugin} from '../src/plugins'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {createTestEditor, createTestEditors} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

/**********
 * Step definitions
 **********/

async function whenTheCaretIsPutAfter(
  context: {
    editor: Editor
    locator: Locator
  },
  text: string,
) {
  await userEvent.click(context.locator)
  const afterTextSelection = getSelectionAfterText(
    context.editor.getSnapshot().context,
    text,
  )
  context.editor.send({
    type: 'select',
    at: afterTextSelection,
  })
  await vi.waitFor(() => {
    expect(context.editor.getSnapshot().context.selection).toEqual(
      afterTextSelection,
    )
  })
}

describe('Collaborative editing', () => {
  describe('Normalization corrections and remote patches', () => {
    test('Scenario: Remote marks replace a missing local marks default', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      let remoteValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ] satisfies Array<PortableTextBlock>

      // Initial value with span missing `marks` property
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                // marks intentionally missing - will be normalized to []
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  remoteValue = applyAll(remoteValue, [patch])
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Simulate Editor B: another user opened the document, normalized it,
      // and made "foo" bold. Editor B sends these patches to Editor A.
      editor.send({
        type: 'apply',
        patches: [
          // Editor B's normalization patch
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
            value: [],
            origin: 'remote',
          },
          // Editor B makes "foo" bold
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
            value: ['strong'],
            origin: 'remote',
          },
        ],
      })

      // Wait for the remote changes to be applied
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'foo', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'foo')

      await userEvent.type(locator, 'bar')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'foobar', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('foo', 'foob', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        diffMatchPatch('foob', 'fooba', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        diffMatchPatch('fooba', 'foobar', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote text preserves normalization of missing marks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                // marks intentionally missing - will be normalized to []
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch on unrelated path (text, not marks)
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'hello',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'hello'}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'hello')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'hello!', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('hello', 'hello!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [],
        },
      ])

      // The engine's own document agrees with the emitted patches: the
      // healed defaults are present in the value, not just on the wire.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_key: spanKey, _type: 'span', text: 'hello!', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('Scenario: Remote style replaces a missing local style default', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                marks: [],
              },
            ],
            markDefs: [],
            // style intentionally missing - will be normalized to 'normal'
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch changes style to h1
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'h1',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'foo')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'foo!', marks: []}],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('foo', 'foo!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote markDefs replace a missing local markDefs default', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const linkKey = 'remote-link'
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'click here',
                marks: [],
              },
            ],
            // markDefs intentionally missing - will be normalized to []
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patches set markDefs AND update span marks to use the link
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
            origin: 'remote',
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
            value: [linkKey],
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'click here',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'click')

      await userEvent.type(locator, 'X')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'clickX here',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('click here', 'clickX here', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patches on inline object do not conflict with sibling span normalization', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const span1Key = keyGenerator()
      const stockTickerKey = keyGenerator()
      const span2Key = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          inlineObjects: [
            {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
          ],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: span1Key,
                text: 'Price: ',
                // marks intentionally missing - will be normalized to []
              },
              {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
              {_type: 'span', _key: span2Key, text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch updates the inline object's symbol property
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [
              {_key: blockKey},
              'children',
              {_key: stockTickerKey},
              'symbol',
            ],
            value: 'GOOG',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: span1Key, _type: 'span', text: 'Price: '},
              {_key: stockTickerKey, _type: 'stock-ticker', symbol: 'GOOG'},
              {_key: span2Key, _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'Price: ')

      await userEvent.type(locator, 'x')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: span1Key, _type: 'span', text: 'Price: x', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker', symbol: 'GOOG'},
              {_key: span2Key, _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('Price: ', 'Price: x', [
          {_key: blockKey},
          'children',
          {_key: span1Key},
          'text',
        ]),
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: span1Key}, 'marks'],
          value: [],
        },
      ])

      // The engine's own document agrees with the emitted patches: the
      // healed defaults are present in the value, not just on the wire.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_key: span1Key, _type: 'span', text: 'Price: x', marks: []},
            {_key: stockTickerKey, _type: 'stock-ticker', symbol: 'GOOG'},
            {_key: span2Key, _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('Scenario: A remote span replaces a span missing marks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                // marks intentionally missing - will be normalized to []
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch replaces the entire span (parent of marks property)
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            value: {_type: 'span', _key: spanKey, text: 'bar', marks: []},
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'bar')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'bar!', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('bar', 'bar!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote span text preserves normalization of missing markDefs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                marks: [],
              },
            ],
            // markDefs intentionally missing - will be normalized to []
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch on child path (span text)
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'hello',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'hello', marks: []},
            ],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'hello')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'hello!', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('hello', 'hello!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
      ])

      // The engine's own document agrees with the emitted patches: the
      // healed defaults are present in the value, not just on the wire.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_key: spanKey, _type: 'span', text: 'hello!', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    test('Scenario: Remote style preserves normalization of missing marks and markDefs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                // marks intentionally missing - will be normalized to []
              },
            ],
            // markDefs intentionally missing - will be normalized to []
            // style intentionally missing - will be normalized to 'normal'
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch changes style to h1
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'h1',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            style: 'h1',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'foo')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'foo!', marks: []}],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('foo', 'foo!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
      ])

      // The engine's own document agrees with the emitted patches: the
      // healed defaults are present in the value, not just on the wire.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_key: spanKey, _type: 'span', text: 'foo!', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ])
    })

    test('Scenario: Remote block replacement preserves the replacement defaults', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const newSpanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                // marks intentionally missing
              },
            ],
            // markDefs and style intentionally missing
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch replaces the entire block
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}],
            value: {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: newSpanKey, text: 'replaced', marks: []},
              ],
              markDefs: [],
              style: 'h1',
            },
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: newSpanKey, _type: 'span', text: 'replaced', marks: []},
            ],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'replaced')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: newSpanKey, _type: 'span', text: 'replaced!', marks: []},
            ],
            markDefs: [],
            style: 'h1',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('replaced', 'replaced!', [
          {_key: blockKey},
          'children',
          {_key: newSpanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patches on different blocks do not conflict', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block1Key = keyGenerator()
      const span1Key = keyGenerator()
      const block2Key = keyGenerator()
      const span2Key = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {
                _type: 'span',
                _key: span1Key,
                text: 'first',
                // marks intentionally missing - will be normalized to []
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {
                _type: 'span',
                _key: span2Key,
                text: 'second',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch updates text in second block
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            path: [{_key: block2Key}, 'children', {_key: span2Key}, 'text'],
            value: 'updated',
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: block1Key,
            children: [{_key: span1Key, _type: 'span', text: 'first'}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {_key: span2Key, _type: 'span', text: 'updated', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      await whenTheCaretIsPutAfter({editor, locator}, 'first')

      await userEvent.type(locator, '!')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_key: span1Key, _type: 'span', text: 'first!', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {_key: span2Key, _type: 'span', text: 'updated', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([
        diffMatchPatch('first', 'first!', [
          {_key: block1Key},
          'children',
          {_key: span1Key},
          'text',
        ]),
        {
          type: 'set',
          path: [{_key: block1Key}, 'children', {_key: span1Key}, 'marks'],
          value: [],
        },
      ])

      // The engine's own document agrees with the emitted patches: the
      // healed defaults are present in the value, not just on the wire.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [
            {_key: span1Key, _type: 'span', text: 'first!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_key: span2Key, _type: 'span', text: 'updated', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('Unknown decorator preservation', () => {
    test('Scenario: Setting a block with unknown decorators preserves them', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emittedPatches: Array<Patch> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                marks: ['strong'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  const {origin: _, ...patch} = changePatch
                  emittedPatches.push(patch)
                }
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Simulate a remote set patch that replaces the entire block
      // with one containing an unknown decorator
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'set',
            origin: 'remote',
            path: [{_key: blockKey}],
            value: {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'foo',
                  marks: ['strong', 'underline'],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      })

      // 'underline' may be a decorator in the other client's schema. The
      // editor keeps it and sends nothing back. It used to strip it and
      // patch the deletion into the document, so two clients on different
      // schema versions would delete each other's formatting.
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo',
                marks: ['strong', 'underline'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      expect(emittedPatches).toEqual([])
    })
  })

  describe('Concurrent same-spot split', () => {
    test.fails('Scenario: Two editors split the same block at the same offset', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const initialValue = [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
        },
      ] satisfies Array<PortableTextBlock>

      const localPatchesA: Array<Patch> = []
      const localPatchesB: Array<Patch> = []

      const {editor} = await createTestEditor({
        keyGenerator: createTestKeyGenerator('ea-'),
        initialValue,
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                localPatchesA.push(...event.patches)
              }
            }}
          />
        ),
      })

      const {editor: editorB} = await createTestEditor({
        keyGenerator: createTestKeyGenerator('eb-'),
        initialValue,
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                localPatchesB.push(...event.patches)
              }
            }}
          />
        ),
      })

      const selection = {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      }

      editor.send({type: 'select', at: selection})
      editorB.send({type: 'select', at: selection})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual(selection)
      })
      await vi.waitFor(() => {
        expect(editorB.getSnapshot().context.selection).toEqual(selection)
      })

      editor.send({type: 'insert.break'})
      editorB.send({type: 'insert.break'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual([
          'foo ',
          'bar baz',
        ])
      })
      await vi.waitFor(() => {
        expect(getTersePt(editorB.getSnapshot().context)).toEqual([
          'foo ',
          'bar baz',
        ])
      })

      editorB.send({
        type: 'apply',
        patches: localPatchesA.map((patch) => ({...patch, origin: 'remote'})),
      })
      editor.send({
        type: 'apply',
        patches: localPatchesB.map((patch) => ({...patch, origin: 'remote'})),
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(
          getTersePt(editorB.getSnapshot().context),
        )
      })

      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ',
        'bar baz',
      ])
    })
  })
  describe('Two-editor harness', () => {
    test('Scenario: Two consecutive local changes do not roll back the sender', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const value = (text: string): Array<PortableTextBlock> => [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      const caret = (offset: number) => ({
        anchor: {path: spanPath, offset},
        focus: {path: spanPath, offset},
        backward: false,
      })
      const {editor, editorB, onEditorEvent} = await createTestEditors({
        keyGenerator,
        initialValue: value('foo'),
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'insert.text',
                actions: [({event}) => [execute(event)]],
              }),
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(onEditorEvent).toHaveBeenCalledWith({type: 'ready'})
      })

      editor.send({type: 'select', at: caret(3)})
      vi.mocked(onEditorEvent).mockClear()

      editor.send({type: 'insert.text', text: 'a'})
      editor.send({type: 'insert.text', text: 'b'})

      const patchA: Patch = {
        type: 'diffMatchPatch',
        path: [...spanPath, 'text'],
        value: '@@ -1,3 +1,4 @@\n foo\n+a\n',
        origin: 'local',
      }
      const patchB: Patch = {
        type: 'diffMatchPatch',
        path: [...spanPath, 'text'],
        value: '@@ -1,4 +1,5 @@\n fooa\n+b\n',
        origin: 'local',
      }

      await vi.waitFor(
        () => {
          expect(getTersePt(editorB.getSnapshot().context)).toEqual(['fooab'])
        },
        {timeout: 3_000},
      )

      expect(
        vi.mocked(onEditorEvent).mock.calls.map(([event]) => event),
      ).toEqual([
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: spanPath,
            offset: 3,
            text: 'a',
          },
          origin: 'local',
        },
        {
          value: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'fooa', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          type: 'change',
          origin: 'local',
          operations: [
            {type: 'insert.text', path: spanPath, offset: 3, text: 'a'},
          ],
          patches: [patchA],
        },
        {type: 'selection', selection: caret(4)},
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: spanPath,
            offset: 4,
            text: 'b',
          },
          origin: 'local',
        },
        {
          value: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'fooab', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          type: 'change',
          origin: 'local',
          operations: [
            {type: 'insert.text', path: spanPath, offset: 4, text: 'b'},
          ],
          patches: [patchB],
        },
        {type: 'selection', selection: caret(5)},
      ])
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['fooab'])
      expect(getTersePt(editorB.getSnapshot().context)).toEqual(['fooab'])
    })
  })
})

test('Scenario: Applying patches preserves remote style while typing normalizes missing defaults', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const emittedPatches: Array<Patch> = []

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_key: spanKey, _type: 'span', text: 'foo'}],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              const {origin: _, ...patch} = changePatch
              emittedPatches.push(patch)
            }
          }
        }}
      />
    ),
  })

  expect(emittedPatches).toEqual([])

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_key: spanKey, _type: 'span', text: 'foo'}],
      },
    ])
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('foo', 'bar', [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
      set('normal', [{_key: blockKey}, 'style']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_key: spanKey, _type: 'span', text: 'bar'}],
        style: 'normal',
      },
    ])
  })

  await whenTheCaretIsPutAfter({editor, locator}, 'bar')

  await userEvent.type(locator, 'baz')

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_key: spanKey, _type: 'span', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  expect(emittedPatches).toEqual([
    diffMatchPatch('bar', 'barb', [
      {_key: blockKey},
      'children',
      {_key: spanKey},
      'text',
    ]),
    {
      type: 'set',
      path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      value: [],
    },
    {
      type: 'set',
      path: [{_key: blockKey}, 'markDefs'],
      value: [],
    },
    diffMatchPatch('barb', 'barba', [
      {_key: blockKey},
      'children',
      {_key: spanKey},
      'text',
    ]),
    diffMatchPatch('barba', 'barbaz', [
      {_key: blockKey},
      'children',
      {_key: spanKey},
      'text',
    ]),
  ])

  expect(editor.getSnapshot().context.value).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      children: [{_key: spanKey, _type: 'span', text: 'barbaz', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ])
})

// Clearing should leave both peers with the same keys, but each peer keeps its own placeholder keys.
test.fails('Scenario: Each peer keeps its own placeholder keys after clearing', async () => {
  const {editorA, editorB, locatorA, shared, nextLocalChange} =
    await renderPatchRelayingEditors()

  await userEvent.click(locatorA)
  await userEvent.type(locatorA, 'foo')

  await vi.waitFor(
    () => {
      expect(getTersePt(editorA.getSnapshot().context)).toEqual(['foo'])
      expect(getTersePt(editorB.getSnapshot().context)).toEqual(['foo'])
      expect(shared.value).toEqual([textBlock('foo')])
    },
    {timeout: 3_000},
  )

  await userEvent.keyboard(IS_MAC ? '{Meta>}a{/Meta}' : '{Control>}a{/Control}')
  await userEvent.keyboard('{Backspace}')

  await vi.waitFor(
    () => {
      expect(editorA.getSnapshot().context.value).toEqual([textBlock('')])
      expect(editorB.getSnapshot().context.value).toEqual([textBlock('')])
      expect(shared.value).toEqual([textBlock('')])
    },
    {timeout: 3_000},
  )

  const colonLocalChange = nextLocalChange('a')
  await userEvent.keyboard(':')
  await colonLocalChange

  editorB.send({type: 'update readOnly', readOnly: true})

  const eaLocalChange = nextLocalChange('a')
  editorA.send({type: 'insert.text', text: 'ea'})
  await eaLocalChange

  const heldLocalChange = nextLocalChange('b')
  editorB.send({type: 'update readOnly', readOnly: false})
  await heldLocalChange

  await vi.waitFor(
    () => {
      expect(editorA.getSnapshot().context.value).toEqual(shared.value)
      expect(editorB.getSnapshot().context.value).toEqual(shared.value)
    },
    {timeout: 3_000},
  )

  expect({
    editorA: editorA.getSnapshot().context.value[0],
    editorB: editorB.getSnapshot().context.value[0],
    shared: shared.value?.[0],
  }).toEqual({
    editorA: textBlock(':ea'),
    editorB: textBlock(':ea'),
    shared: textBlock(':ea'),
  })
})
function textBlock(text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: 'a-k0',
    children: [{_type: 'span', _key: 'a-k1', text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}
async function renderPatchRelayingEditors() {
  const editorARef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()
  const keyGeneratorA = createTestKeyGenerator('a-')
  const keyGeneratorB = createTestKeyGenerator('b-')
  const shared: {value: Array<PortableTextBlock> | undefined} = {
    value: undefined,
  }
  const changeWaiters: Array<{editorId: 'a' | 'b'; resolve: () => void}> = []

  function relayChange(
    editorId: 'a' | 'b',
    event: Extract<ChangeEvent, {origin: 'local'}>,
  ) {
    for (const [peerId, peerRef] of [
      ['a', editorARef],
      ['b', editorBRef],
    ] as const) {
      if (peerId === editorId) {
        continue
      }
      peerRef.current?.send({type: 'apply', patches: event.patches})
    }

    shared.value = applyAll(shared.value, event.patches)

    for (const waiter of changeWaiters.splice(0)) {
      if (waiter.editorId === editorId) {
        waiter.resolve()
      } else {
        changeWaiters.push(waiter)
      }
    }
  }

  function Host() {
    return (
      <>
        {(
          [
            ['a', editorARef, keyGeneratorA],
            ['b', editorBRef, keyGeneratorB],
          ] as const
        ).map(([editorId, editorRef, keyGenerator]) => (
          <EditorProvider
            key={editorId}
            initialConfig={{keyGenerator, schemaDefinition: defineSchema({})}}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable data-testid={`editor-${editorId}`} />
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'change' && event.origin === 'local') {
                  relayChange(editorId, event)
                }
              }}
            />
          </EditorProvider>
        ))}
      </>
    )
  }

  render(<Host />)

  const locatorA = page.getByTestId('editor-a')
  await expect.element(locatorA).toBeInTheDocument()
  await expect.element(page.getByTestId('editor-b')).toBeInTheDocument()

  return {
    editorA: editorARef.current!,
    editorB: editorBRef.current!,
    locatorA,
    shared,
    nextLocalChange: (editorId: 'a' | 'b') =>
      new Promise<void>((resolve) => {
        changeWaiters.push({editorId, resolve})
      }),
  }
}
