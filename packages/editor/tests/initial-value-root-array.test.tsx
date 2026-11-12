import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

test('Scenario: the host pushes a block after ready', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const onEvent = vi.fn()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    children: <EventListenerPlugin on={onEvent} />,
  })

  await vi.waitFor(() => {
    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  initialValue.push({
    _key: keyGenerator(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
  })

  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: 'k2',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: 'k4',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: the host replaces a root entry after ready', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const onEvent = vi.fn()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    children: <EventListenerPlugin on={onEvent} />,
  })

  await vi.waitFor(() => {
    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  initialValue[1] = {
    _key: keyGenerator(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
  }

  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: 'k2',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: 'k4',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: the host splices out a root entry after ready', async () => {
  const keyGenerator = createTestKeyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
    },
  ]
  const onEvent = vi.fn()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    children: <EventListenerPlugin on={onEvent} />,
  })

  await vi.waitFor(() => {
    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  initialValue.splice(2, 1)

  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
    },
    {
      _key: 'k2',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
    },
    {
      _key: 'k4',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
    },
  ])
})
