import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../test-utils/text-selection'

describe('event.annotation.add', () => {
  describe('Adding annotation to part of text', () => {
    test('Scenario: Adding an annotation at `at` without a selection annotates the text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo ',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'k6',
                text: 'bar',
                marks: ['k4'],
              },
              {
                _type: 'span',
                _key: 'k5',
                text: ' baz',
                marks: [],
              },
            ],
            markDefs: [{_key: 'k4', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding an annotation at `at` with a selection annotates the text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: getTextSelection(editor.getSnapshot().context, 'foo'),
      })

      editor.send({
        type: 'annotation.add',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo ',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'k6',
                text: 'bar',
                marks: ['k4'],
              },
              {
                _type: 'span',
                _key: 'k5',
                text: ' baz',
                marks: [],
              },
            ],
            markDefs: [{_key: 'k4', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding an annotation without `at` annotates the selected text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
      })

      editor.send({
        type: 'annotation.add',
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo ', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['k4']},
              {_type: 'span', _key: 'k5', text: ' baz', marks: []},
            ],
            markDefs: [{_key: 'k4', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding an annotation without `at` or a selection changes nothing', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo bar baz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('Adding annotation across multiple blocks', () => {
    test('Scenario: Adding an annotation with `at` spanning two blocks annotates the text in both blocks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block1Key = keyGenerator()
      const span1Key = keyGenerator()
      const block2Key = keyGenerator()
      const span2Key = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'baz qux', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        at: {
          anchor: {
            path: [{_key: block1Key}, 'children', {_key: span1Key}],
            offset: 4,
          },
          focus: {
            path: [{_key: block2Key}, 'children', {_key: span2Key}],
            offset: 3,
          },
        },
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: 'k8', text: 'bar', marks: ['k6']},
            ],
            markDefs: [{_key: 'k6', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'baz', marks: ['k9']},
              {_type: 'span', _key: 'k7', text: ' qux', marks: []},
            ],
            markDefs: [{_key: 'k9', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('Collapsed selection word expansion', () => {
    test('Scenario: Adding an annotation with a collapsed `at` inside a word annotates the whole word', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        at: getSelectionAfterText(editor.getSnapshot().context, 'ba'),
        annotation: {
          name: 'link',
          value: {
            href: 'https://sanity.io',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo ', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['k4']},
              {_type: 'span', _key: 'k5', text: ' baz', marks: []},
            ],
            markDefs: [{_key: 'k4', _type: 'link', href: 'https://sanity.io'}],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('Overlapping annotations', () => {
    test('Scenario: Adding a link at `at` over an existing link without a selection replaces the existing link', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const span1Key = keyGenerator()
      const span2Key = keyGenerator()
      const span3Key = keyGenerator()
      const linkKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://old-url.com'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {
            href: 'https://new-url.com',
          },
        },
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        expect(value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: ['k7']},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: 'k7', _type: 'link', href: 'https://new-url.com'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding a link at `at` over an existing link with a selection replaces the existing link', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const span1Key = keyGenerator()
      const span2Key = keyGenerator()
      const span3Key = keyGenerator()
      const linkKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://old-url.com'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: getTextSelection(editor.getSnapshot().context, 'foo'),
      })

      editor.send({
        type: 'annotation.add',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {
            href: 'https://new-url.com',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: ['k7']},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: 'k7', _type: 'link', href: 'https://new-url.com'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding a link without `at` over a selected existing link replaces the existing link', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const span1Key = keyGenerator()
      const span2Key = keyGenerator()
      const span3Key = keyGenerator()
      const linkKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://old-url.com'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
      })

      editor.send({
        type: 'annotation.add',
        annotation: {
          name: 'link',
          value: {
            href: 'https://new-url.com',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: ['k7']},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: 'k7', _type: 'link', href: 'https://new-url.com'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding a link without `at` or a selection keeps the existing link', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const span1Key = keyGenerator()
      const span2Key = keyGenerator()
      const span3Key = keyGenerator()
      const linkKey = keyGenerator()
      const {editor} = await createTestEditor({
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
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://old-url.com'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.add',
        annotation: {
          name: 'link',
          value: {
            href: 'https://new-url.com',
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo ', marks: []},
              {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
              {_type: 'span', _key: span3Key, text: ' baz', marks: []},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://old-url.com'},
            ],
            style: 'normal',
          },
        ])
      })
    })
  })

  test('Scenario: Adding an annotation at an explicit range keeps a decorator toggled on at the caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'em'})

    editor.send({
      type: 'annotation.add',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
      annotation: {name: 'link', value: {href: 'https://sanity.io'}},
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[@link href="https://sanity.io":oob]a|r',
      )
    })

    await userEvent.keyboard('baz')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'f', marks: []},
            {_type: 'span', _key: 'k6', text: 'oob', marks: ['k4']},
            {_type: 'span', _key: 'k5', text: 'a', marks: []},
            {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            {_type: 'span', _key: 'k8', text: 'r', marks: []},
          ],
          markDefs: [{_key: 'k4', _type: 'link', href: 'https://sanity.io'}],
          style: 'normal',
        },
      ])
    })
  })
})
