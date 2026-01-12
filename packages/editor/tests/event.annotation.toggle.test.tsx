import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('event.annotation.toggle', () => {
  describe('Scenario: Toggling annotation on unannotated text', () => {
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
        type: 'annotation.toggle',
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
        type: 'annotation.toggle',
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
        type: 'annotation.toggle',
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
        type: 'annotation.toggle',
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
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  describe('Scenario: Toggling annotation on annotated text', () => {
    test('with `at`, without selection', async () => {
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
        type: 'annotation.toggle',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {},
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

    test('with `at`, with selection', async () => {
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
        type: 'annotation.toggle',
        at: getTextSelection(editor.getSnapshot().context, 'bar'),
        annotation: {
          name: 'link',
          value: {},
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

    test('without `at`, with selection', async () => {
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
        type: 'annotation.toggle',
        annotation: {
          name: 'link',
          value: {},
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

    test('without `at`, without selection', async () => {
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
        type: 'annotation.toggle',
        annotation: {
          name: 'link',
          value: {},
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
})
