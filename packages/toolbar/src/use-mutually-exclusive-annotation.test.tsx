import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {useMutuallyExclusiveAnnotation} from './use-mutually-exclusive-annotation'
import type {ToolbarAnnotationSchemaType} from './use-toolbar-schema'

const schemaDefinition = defineSchema({
  annotations: [
    {name: 'link', fields: [{name: 'href', type: 'string'}]},
    {name: 'comment', fields: [{name: 'text', type: 'string'}]},
    {name: 'highlight', fields: []},
  ],
})

function commentSchemaType(
  mutuallyExclusive: ReadonlyArray<string>,
): ToolbarAnnotationSchemaType {
  return {
    name: 'comment',
    fields: [{name: 'text', type: 'string'}],
    mutuallyExclusive,
  } as ToolbarAnnotationSchemaType
}

function MutuallyExclusiveProbe(props: {
  schemaType: ToolbarAnnotationSchemaType
}) {
  useMutuallyExclusiveAnnotation({schemaType: props.schemaType})
  return null
}

describe(useMutuallyExclusiveAnnotation.name, () => {
  test('Scenario: Empty config does not bypass collapsed-selection expansion', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <MutuallyExclusiveProbe schemaType={commentSchemaType([])} />,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: [linkKey]},
            {_key: bazKey, _type: 'span', text: ' baz', marks: []},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 1,
        },
      },
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'comment', value: {text: 'a comment'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: [linkKey, 'k7']},
            {_key: bazKey, _type: 'span', text: ' baz', marks: []},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
            {_key: 'k7', _type: 'comment', text: 'a comment'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Empty config allows overlapping same-type annotations', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <MutuallyExclusiveProbe schemaType={commentSchemaType([])} />,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 7,
        },
      },
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'comment', value: {text: 'first'}},
    })
    // The first add only split at offset 7, so `spanKey` now holds
    // "foo bar"; selecting "bar" inside it overlaps the first comment.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 7,
        },
      },
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'comment', value: {text: 'second'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo ', marks: ['k4']},
            {_key: 'k7', _type: 'span', text: 'bar', marks: ['k4', 'k6']},
            {_key: 'k5', _type: 'span', text: ' baz', marks: []},
          ],
          markDefs: [
            {_key: 'k4', _type: 'comment', text: 'first'},
            {_key: 'k6', _type: 'comment', text: 'second'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Adding over an active exclusive removes it and adds the annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const highlightKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <MutuallyExclusiveProbe schemaType={commentSchemaType(['highlight'])} />
      ),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: [highlightKey]},
          ],
          markDefs: [{_key: highlightKey, _type: 'highlight'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 3,
        },
      },
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'comment', value: {text: 'a comment'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: 'k7', _type: 'span', text: 'bar', marks: ['k6']},
          ],
          markDefs: [{_key: 'k6', _type: 'comment', text: 'a comment'}],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Collapsed caret in an active exclusive still adds the annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const highlightKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <MutuallyExclusiveProbe schemaType={commentSchemaType(['highlight'])} />
      ),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: [highlightKey]},
          ],
          markDefs: [{_key: highlightKey, _type: 'highlight'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 1,
        },
      },
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'comment', value: {text: 'a comment'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo ', marks: []},
            {_key: barKey, _type: 'span', text: 'bar', marks: ['k7']},
          ],
          markDefs: [{_key: 'k7', _type: 'comment', text: 'a comment'}],
          style: 'normal',
        },
      ])
    })
  })
})
