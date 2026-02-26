import {describe, expect, test} from 'vitest'
import * as Y from 'yjs'
import type {Descendant, Node} from '../slate'
import {applySlateOp} from './apply-to-yjs'
import {getSharedRoot, slateNodesToYDoc, yTextToSlateElement} from './convert'

function createDocWithBlock(text: string) {
  const blocks: Descendant[] = [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [{_key: 's1', _type: 'span', text, marks: []}],
    },
  ] as unknown as Descendant[]

  const yDoc = slateNodesToYDoc(blocks)
  const sharedRoot = getSharedRoot(yDoc)

  return {yDoc, sharedRoot, blocks}
}

function getFirstBlockText(sharedRoot: Y.XmlText): string {
  const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
  const blockYText = delta[0]!.insert
  const blockDelta = blockYText.toDelta() as Array<{insert: string}>
  return blockDelta.map((d) => d.insert).join('')
}

describe('insert_text', () => {
  test('inserts text at offset', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'insert_text',
      path: [0, 0],
      offset: 5,
      text: ' world',
    })

    expect(getFirstBlockText(sharedRoot)).toBe('hello world')
  })

  test('inserts text at beginning', () => {
    const {sharedRoot, blocks} = createDocWithBlock('world')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'insert_text',
      path: [0, 0],
      offset: 0,
      text: 'hello ',
    })

    expect(getFirstBlockText(sharedRoot)).toBe('hello world')
  })
})

describe('remove_text', () => {
  test('removes text at offset', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello world')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'remove_text',
      path: [0, 0],
      offset: 5,
      text: ' world',
    })

    expect(getFirstBlockText(sharedRoot)).toBe('hello')
  })
})

describe('set_node', () => {
  test('changes element attributes', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'set_node',
      path: [0],
      properties: {style: 'normal'},
      newProperties: {style: 'h1'},
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const blockElement = yTextToSlateElement(delta[0]!.insert)

    expect((blockElement as Record<string, unknown>).style).toBe('h1')
  })

  test('adds marks to text node', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'set_node',
      path: [0, 0],
      properties: {marks: []},
      newProperties: {marks: ['strong']},
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const blockElement = yTextToSlateElement(delta[0]!.insert)
    const span = blockElement.children[0] as Record<string, unknown>

    expect(span.marks).toEqual(['strong'])
  })

  test('removes marks from text node', () => {
    const blocks: Descendant[] = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello', marks: ['strong']},
        ],
      },
    ] as unknown as Descendant[]

    const yDoc = slateNodesToYDoc(blocks)
    const sharedRoot = getSharedRoot(yDoc)
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'set_node',
      path: [0, 0],
      properties: {marks: ['strong']},
      newProperties: {marks: []},
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const blockElement = yTextToSlateElement(delta[0]!.insert)
    const span = blockElement.children[0] as Record<string, unknown>

    expect(span.marks).toEqual([])
  })

  test('sets multiple marks on text node', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'set_node',
      path: [0, 0],
      properties: {marks: []},
      newProperties: {marks: ['strong', 'em']},
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    const blockElement = yTextToSlateElement(delta[0]!.insert)
    const span = blockElement.children[0] as Record<string, unknown>

    expect(span.marks).toEqual(['strong', 'em'])
  })
})

describe('split_node (element)', () => {
  test('splits a block at a position', () => {
    const {sharedRoot, blocks} = createDocWithBlock('foobar')
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'split_node',
      path: [0],
      position: 3,
      properties: {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
      },
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    expect(delta).toHaveLength(2)

    const block1 = yTextToSlateElement(delta[0]!.insert)
    const block2 = yTextToSlateElement(delta[1]!.insert)

    const block1Text = block1.children.map((child: any) => child.text).join('')
    const block2Text = block2.children.map((child: any) => child.text).join('')

    expect(block1Text).toBe('foo')
    expect(block2Text).toBe('bar')
  })
})

describe('merge_node (element)', () => {
  test('merges two blocks', () => {
    const blocks: Descendant[] = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's2', _type: 'span', text: 'bar', marks: []}],
      },
    ] as unknown as Descendant[]

    const yDoc = slateNodesToYDoc(blocks)
    const sharedRoot = getSharedRoot(yDoc)
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'merge_node',
      path: [1],
      position: 3,
      properties: {},
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    expect(delta).toHaveLength(1)

    const merged = yTextToSlateElement(delta[0]!.insert)
    const mergedText = merged.children.map((child: any) => child.text).join('')

    expect(mergedText).toBe('foobar')
  })
})

describe('remove_node', () => {
  test('removes a block', () => {
    const blocks: Descendant[] = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's2', _type: 'span', text: 'bar', marks: []}],
      },
    ] as unknown as Descendant[]

    const yDoc = slateNodesToYDoc(blocks)
    const sharedRoot = getSharedRoot(yDoc)
    const slateDoc = {children: blocks} as unknown as Node

    applySlateOp(sharedRoot, slateDoc, {
      type: 'remove_node',
      path: [1],
      node: blocks[1]!,
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    expect(delta).toHaveLength(1)
  })
})

describe('insert_node', () => {
  test('inserts a new block', () => {
    const {sharedRoot, blocks} = createDocWithBlock('hello')
    const slateDoc = {children: blocks} as unknown as Node

    const newBlock = {
      _type: 'block',
      _key: 'b2',
      style: 'normal',
      markDefs: [],
      children: [{_key: 's2', _type: 'span', text: 'world', marks: []}],
    } as unknown as Descendant

    applySlateOp(sharedRoot, slateDoc, {
      type: 'insert_node',
      path: [1],
      node: newBlock,
    })

    const delta = sharedRoot.toDelta() as Array<{insert: Y.XmlText}>
    expect(delta).toHaveLength(2)

    const block2 = yTextToSlateElement(delta[1]!.insert)
    const block2Text = block2.children.map((child: any) => child.text).join('')
    expect(block2Text).toBe('world')
  })
})
