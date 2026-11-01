import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../test-utils/text-selection'

describe('event.annotation.remove', () => {
  describe('Removing annotation from part of annotated text', () => {
    test('Scenario: Removing annotation from part of annotated text with `at` and no selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
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
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo bar baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.remove',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
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
                marks: [linkKey],
              },
              {
                _type: 'span',
                _key: 'k6',
                text: 'bar',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'k5',
                text: ' baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Removing annotation from part of annotated text with `at` and a selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
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
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo bar baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
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
        type: 'annotation.remove',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
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
                marks: [linkKey],
              },
              {
                _type: 'span',
                _key: 'k6',
                text: 'bar',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'k5',
                text: ' baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Removing annotation from part of annotated text with a selection and no `at`', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
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
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo bar baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
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
        type: 'annotation.remove',
        annotation: {
          name: 'link',
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo ', marks: [linkKey]},
              {_type: 'span', _key: 'k6', text: 'bar', marks: []},
              {_type: 'span', _key: 'k5', text: ' baz', marks: [linkKey]},
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Removing annotation without `at` or a selection is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
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
              {
                _type: 'span',
                _key: spanKey,
                text: 'foo bar baz',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.remove',
        annotation: {
          name: 'link',
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
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('Collapsed selection removes entire annotation', () => {
    test('Scenario: A collapsed `at` inside an annotated span removes the entire annotation', async () => {
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
              {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            ],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'annotation.remove',
        at: getSelectionAfterText(editor.getSnapshot().context, 'ba'),
        annotation: {
          name: 'link',
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })
})
