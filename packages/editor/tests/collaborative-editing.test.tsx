import {applyAll, diffMatchPatch, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent, type Locator} from 'vitest/browser'
import type {Editor} from '../src'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

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
  describe('Deferred normalization patches', () => {
    test('Scenario: Remote patches conflict with local held-back patches', async () => {
      /**
       * This test mimics the following scenario:
       * 1. Editor A loads with initial value missing `marks` on a span
       * 2. Editor A normalizes and adds marks: [], but defers the patch until the editor is dirty
       * 3. Editor B (simulated) also normalizes, then makes "foo" bold
       * 4. Editor B emits: set marks to [], then set marks to ['strong']
       * 5. Editor A receives these patches and applies them - "foo" becomes bold
       * 6. Editor A user starts typing
       * 7. Editor A does not emit the deferred patch (would overwrite the bold)
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                remoteValue = applyAll(remoteValue, [patch])
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Simulate Editor B: another user opened the document, normalized it,
      // and made "foo" bold. Editor B sends these patches to Editor A.
      editor.send({
        type: 'patches',
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
        snapshot: [
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

    test('Scenario: Value sync discards local held-back patches', async () => {
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
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
            children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      editor.send({
        type: 'update value',
        value: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_key: spanKey, _type: 'span', text: 'bar'}],
            style: 'normal',
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

      await userEvent.type(locator, 'baz')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: spanKey, _type: 'span', text: 'barbaz', marks: []},
            ],
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
    })

    test('Scenario: Remote patches on unrelated path do not discard local patches', async () => {
      /**
       * This test verifies that local held-back patches are NOT discarded
       * when remote patches arrive on unrelated paths:
       * 1. Editor A loads with initial value missing `marks` on a span
       *    (toSlateBlock adds marks: [] during sync, no deferred patch)
       * 2. Editor B changes the `text` property
       * 3. Editor A receives the text patch
       * 4. Editor A user starts typing
       * 5. Editor A should emit the typing patch
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch on unrelated path (text, not marks)
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'hello',
            origin: 'remote',
          },
        ],
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'hello',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
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

      // marks: [] is added by toSlateBlock during sync (no deferred patch).
      // Only the typing patch is emitted.
      expect(emittedPatches).toEqual([
        diffMatchPatch('hello', 'hello!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patches conflict with local held-back style normalization', async () => {
      /**
       * This test verifies conflict detection for block `style` normalization:
       * 1. Editor A loads with initial value missing `style` on a block
       * 2. Editor A normalizes and adds style: 'normal', but defers the patch
       * 3. Editor B changes style to 'h1'
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing
       * 6. Editor A should NOT emit the deferred style patch (would overwrite h1)
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch changes style to h1
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'h1',
            origin: 'remote',
          },
        ],
        snapshot: [
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
            style: 'h1',
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

      // Should NOT include the deferred style normalization patch
      expect(emittedPatches).toEqual([
        diffMatchPatch('foo', 'foo!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patches conflict with local held-back markDefs normalization', async () => {
      /**
       * This test verifies conflict detection for block `markDefs` normalization:
       * 1. Editor A loads with initial value missing `markDefs` on a block
       * 2. Editor A normalizes and adds markDefs: [], but defers the patch
       * 3. Editor B changes markDefs to add a link AND updates span to use it
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing inside the link (not at the edge)
       * 6. Editor A should NOT emit the deferred markDefs patch (would overwrite link)
       *
       * Note: The remote patches must also update the span's marks to reference
       * the new markDef, otherwise normalization would clean up the unused markDef.
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patches set markDefs AND update span marks to use the link
      editor.send({
        type: 'patches',
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
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'click here',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
            style: 'normal',
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

      // Should NOT include the deferred markDefs normalization patch
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
      /**
       * This test verifies that remote patches on a sibling inline object
       * don't interfere with local typing:
       * 1. Editor A loads with block containing: span (missing marks), inline object, span
       *    (toSlateBlock adds marks: [] during sync, no deferred patch)
       * 2. Editor B updates the inline object's property
       * 3. Editor A receives the patch
       * 4. Editor A user starts typing
       * 5. Editor A should emit the typing patch
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch updates the inline object's symbol property
      editor.send({
        type: 'patches',
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
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
              {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'GOOG'},
              {_type: 'span', _key: span2Key, text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_key: span1Key, _type: 'span', text: 'Price: ', marks: []},
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

      // marks: [] is added by toSlateBlock during sync (no deferred patch).
      // Only the typing patch is emitted.
      expect(emittedPatches).toEqual([
        diffMatchPatch('Price: ', 'Price: x', [
          {_key: blockKey},
          'children',
          {_key: span1Key},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patch on parent path discards local patch on child path', async () => {
      /**
       * This test verifies that a remote patch on a parent path discards
       * local pending patches on child paths:
       * 1. Editor A loads with span missing marks
       * 2. Editor A normalizes and adds marks: [], but defers the patch
       * 3. Editor B replaces the entire span (parent of marks)
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing
       * 6. Editor A should NOT emit the deferred marks patch (parent was replaced)
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch replaces the entire span (parent of marks property)
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            value: {_type: 'span', _key: spanKey, text: 'bar', marks: []},
            origin: 'remote',
          },
        ],
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
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

      // Should NOT include the deferred marks patch (parent path was replaced)
      expect(emittedPatches).toEqual([
        diffMatchPatch('bar', 'bar!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patch on child path does not discard local patch on parent path', async () => {
      /**
       * This test verifies that a remote patch on a child path does NOT discard
       * local pending patches on parent paths (they don't conflict):
       * 1. Editor A loads with block missing markDefs
       * 2. Editor A normalizes and adds markDefs: [], but defers the patch
       * 3. Editor B updates the text of a span (child path)
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing
       * 6. Editor A SHOULD emit the deferred markDefs patch (different paths)
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch on child path (span text)
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'hello',
            origin: 'remote',
          },
        ],
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'hello',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
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

      // Should include the deferred markDefs patch (unrelated path)
      // plus the typing patch
      expect(emittedPatches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        diffMatchPatch('hello', 'hello!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Multiple normalization patches, only conflicting ones discarded', async () => {
      /**
       * This test verifies selective discarding when there are multiple pending patches:
       * 1. Editor A loads with block missing both style and markDefs, span missing marks
       * 2. Editor A normalizes all three issues, deferring three patches
       * 3. Editor B changes the style to h1
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing
       * 6. Editor A should emit markDefs and marks patches, but NOT style patch
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch changes style to h1
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'h1',
            origin: 'remote',
          },
        ],
        snapshot: [
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
            style: 'h1',
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

      // Should include markDefs patch, but NOT the style patch (conflicted).
      // marks: [] is added by toSlateBlock during sync (no deferred patch).
      expect(emittedPatches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        diffMatchPatch('foo', 'foo!', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })

    test('Scenario: Remote patch on block replaces entire block, discards all local patches for that block', async () => {
      /**
       * This test verifies that when a remote patch replaces an entire block,
       * all local patches targeting that block or its children are discarded:
       * 1. Editor A loads with malformed block (missing style, markDefs, and marks)
       * 2. Editor A normalizes and defers multiple patches
       * 3. Editor B completely replaces the block
       * 4. Editor A receives the patch
       * 5. Editor A user starts typing
       * 6. Editor A should NOT emit any of the deferred patches
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch replaces the entire block
      editor.send({
        type: 'patches',
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
        snapshot: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: newSpanKey, text: 'replaced', marks: []},
            ],
            markDefs: [],
            style: 'h1',
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

      // Should NOT include any deferred normalization patches
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
      /**
       * This test verifies that remote patches on one block do not affect
       * local typing on a different block:
       * 1. Editor A loads with two blocks, first block missing marks
       *    (toSlateBlock adds marks: [] during sync, no deferred patch)
       * 2. Editor B updates the second block's text
       * 3. Editor A receives the patch
       * 4. Editor A user starts typing in first block
       * 5. Editor A should emit the typing patch
       */
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
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                emittedPatches.push(patch)
              }
            }}
          />
        ),
      })

      expect(emittedPatches).toEqual([])

      // Remote patch updates text in second block
      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'set',
            path: [{_key: block2Key}, 'children', {_key: span2Key}, 'text'],
            value: 'updated',
            origin: 'remote',
          },
        ],
        snapshot: [
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'first', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'updated', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_key: span1Key, _type: 'span', text: 'first', marks: []},
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

      // marks: [] is added by toSlateBlock during sync (no deferred patch).
      // Only the typing patch is emitted.
      expect(emittedPatches).toEqual([
        diffMatchPatch('first', 'first!', [
          {_key: block1Key},
          'children',
          {_key: span1Key},
          'text',
        ]),
      ])
    })
  })
})
