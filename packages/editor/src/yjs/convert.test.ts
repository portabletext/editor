import {describe, expect, test} from 'vitest'
import * as Y from 'yjs'
import type {Descendant} from '../slate'
import {
  deltaInsertToSlateNode,
  getSharedRoot,
  slateNodesToInsertDelta,
  slateNodesToYDoc,
  yTextToSlateElement,
} from './convert'

describe('slateNodesToInsertDelta', () => {
  test('converts text nodes to string inserts with attributes', () => {
    const nodes: Descendant[] = [
      {_key: 's1', _type: 'span', text: 'hello', marks: []},
    ]

    const delta = slateNodesToInsertDelta(nodes)

    expect(delta).toEqual([
      {
        insert: 'hello',
        attributes: {_key: 's1', _type: 'span', marks: '[]'},
      },
    ])
  })

  test('converts text nodes with marks', () => {
    const nodes: Descendant[] = [
      {_key: 's1', _type: 'span', text: 'bold', marks: ['strong']},
    ]

    const delta = slateNodesToInsertDelta(nodes)

    expect(delta).toEqual([
      {
        insert: 'bold',
        attributes: {_key: 's1', _type: 'span', marks: '["strong"]'},
      },
    ])
  })

  test('converts element nodes to Y.XmlText embeds', () => {
    const element = {
      _type: 'block',
      _key: 'b1',
      children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      markDefs: [],
      style: 'normal',
    } as unknown as Descendant

    const delta = slateNodesToInsertDelta([element])

    expect(delta).toHaveLength(1)
    expect(delta[0]!.insert).toBeInstanceOf(Y.XmlText)
  })
})

describe('slateElementToYText / yTextToSlateElement roundtrip', () => {
  // Roundtrip tests must go through a Y.Doc so that Y.XmlText operations
  // (setAttribute, applyDelta) actually persist. We use slateNodesToYDoc
  // which handles this correctly.

  test('simple text block roundtrips', () => {
    const block = {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
    } as unknown as Descendant

    const yDoc = slateNodesToYDoc([block])
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const result = yTextToSlateElement(delta[0]!.insert)

    expect(result).toEqual(block)
  })

  test('block with multiple spans roundtrips', () => {
    const block = {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [
        {_key: 's1', _type: 'span', text: 'hello ', marks: []},
        {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
      ],
    } as unknown as Descendant

    const yDoc = slateNodesToYDoc([block])
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const result = yTextToSlateElement(delta[0]!.insert)

    expect(result).toEqual(block)
  })

  test('block with markDefs roundtrips', () => {
    const block = {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [{_type: 'link', _key: 'link1', href: 'https://example.com'}],
      children: [
        {_key: 's1', _type: 'span', text: 'click ', marks: []},
        {_key: 's2', _type: 'span', text: 'here', marks: ['link1']},
      ],
    } as unknown as Descendant

    const yDoc = slateNodesToYDoc([block])
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const result = yTextToSlateElement(delta[0]!.insert)

    expect(result).toEqual(block)
  })

  test('block object (void element) preserves attributes', () => {
    const block = {
      _type: 'image',
      _key: 'img1',
      __inline: true,
      value: {src: 'image.png'},
      children: [{_key: 'void-child', _type: 'span', text: '', marks: []}],
    } as unknown as Descendant

    const yDoc = slateNodesToYDoc([block])
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const result = yTextToSlateElement(delta[0]!.insert)

    expect(result._type).toBe('image')
    expect(result._key).toBe('img1')
    expect((result as any).__inline).toBe(true)
    expect((result as any).value).toEqual({src: 'image.png'})
  })

  test('empty Y.XmlText gets a child', () => {
    const yDoc = new Y.Doc()
    const root = yDoc.get('test', Y.XmlText) as Y.XmlText

    const yText = new Y.XmlText()
    yText.setAttribute('_type', 'block')
    yText.setAttribute('_key', 'b1')
    root.insertEmbed(0, yText)

    const delta = root.toDelta() as Array<{insert: Y.XmlText}>
    const embedded = delta[0]!.insert
    const result = yTextToSlateElement(embedded)

    expect(result.children).toHaveLength(1)
    expect(result.children[0]).toEqual({text: ''})
  })
})

describe('deltaInsertToSlateNode', () => {
  test('converts string insert to text node', () => {
    const result = deltaInsertToSlateNode({
      insert: 'hello',
      attributes: {_key: 's1', _type: 'span', marks: '[]'},
    })

    expect(result).toEqual({
      text: 'hello',
      _key: 's1',
      _type: 'span',
      marks: [],
    })
  })

  test('converts Y.XmlText insert to element node', () => {
    // Y.XmlText operations only persist when attached to a Y.Doc
    const yDoc = new Y.Doc()
    const root = yDoc.get('test', Y.XmlText) as Y.XmlText

    const yText = new Y.XmlText()
    yText.setAttribute('_type', 'block')
    yText.setAttribute('_key', 'b1')
    yText.setAttribute('style', 'normal')
    yText.setAttribute('markDefs', '[]')
    yText.insert(0, 'hello', {_key: 's1', _type: 'span', marks: '[]'})

    root.insertEmbed(0, yText)

    const delta = root.toDelta() as Array<{insert: Y.XmlText}>
    const embedded = delta[0]!.insert
    const result = deltaInsertToSlateNode({insert: embedded})

    expect(result).toEqual({
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [{text: 'hello', _key: 's1', _type: 'span', marks: []}],
    })
  })
})

describe('slateNodesToYDoc', () => {
  test('creates Y.Doc with shared root containing blocks', () => {
    const blocks = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's2', _type: 'span', text: 'world', marks: []}],
      },
    ] as unknown as Descendant[]

    const yDoc = slateNodesToYDoc(blocks)
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta()

    expect(delta).toHaveLength(2)
    expect(delta[0].insert).toBeInstanceOf(Y.XmlText)
    expect(delta[1].insert).toBeInstanceOf(Y.XmlText)
  })

  test('roundtrips through Y.Doc', () => {
    const blocks = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ] as unknown as Descendant[]

    const yDoc = slateNodesToYDoc(blocks)
    const sharedRoot = getSharedRoot(yDoc)
    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>

    const result = yTextToSlateElement(delta[0]!.insert)

    expect(result).toEqual(blocks[0])
  })
})
