import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('event.annotation.add', () => {
  describe('Scenario: Adding annotation to part of text', () => {
    test('with `at`, without selection', async () => {
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

    test('with `at`, with selection', async () => {
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

    test('without `at`, with selection', async () => {
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

    test('without `at`, without selection', async () => {
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

  describe('Scenario: Adding annotation across multiple blocks', () => {
    test('with `at` spanning two blocks', async () => {
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

  describe('Scenario: Collapsed selection word expansion', () => {
    test('with collapsed `at` inside word', async () => {
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

  describe('Scenario: Overlapping annotations', () => {
    test('with `at`, without selection', async () => {
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

    test('with `at`, with selection', async () => {
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

    test('without `at`, with selection', async () => {
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

    test('without `at`, without selection', async () => {
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
})
