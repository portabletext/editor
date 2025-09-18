import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('event.block.unset', () => {
  test('Scenario: removing block object property', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['href'],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
        },
      ])
    })
  })

  test('Scenario: removing block object _key sets a new _key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_key'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(editor.getSnapshot().context.value[0]._key).not.toEqual(
        urlBlockKey,
      )
    })
  })

  test('Scenario: removing block object _type is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_type'],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: removing text block listItem', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
    })

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
        listItem: 'bullet',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          listItem: 'bullet',
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['listItem'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
        },
      ])
      expect(editor.getSnapshot().context.value[0].listItem).toBe(undefined)
    })
  })

  test('Scenario: removing text block style', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
        style: 'h1',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['style'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Removing text block children is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['children'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
