import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {resolveContainersRich} from '../../schema/resolve-containers'
import {
  codeBlockContainer,
  createNodeTraversalTestbed,
} from '../../traversal/node-traversal-testbed'
import {normalize} from '../editor/normalize'
import {setNormalizing} from '../editor/set-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'

const traversalTestbed = createNodeTraversalTestbed()

describe('dirty path child-array repairs', () => {
  test('scans keyed blocks with keyless spans linearly', () => {
    const small = rootChildFindElementVisits(100)
    const large = rootChildFindElementVisits(400)

    expect(large).toBeLessThanOrEqual(small * 4 + 4)
  })

  test('scans nested keyed blocks with keyless spans linearly', () => {
    const small = nestedChildFindElementVisits(100)
    const large = nestedChildFindElementVisits(400)

    expect(large).toBeLessThanOrEqual(small * 4 + 4)
  })
})

function rootChildFindElementVisits(size: number): number {
  const value = Array.from({length: size}, (_, index) =>
    keylessSpanBlock(`b${index}`),
  )
  return repairFindElementVisits([block('initial')], [], value, value)
}

function nestedChildFindElementVisits(size: number): number {
  const children = Array.from({length: size}, (_, index) =>
    keylessSpanBlock(`b${index}`),
  )
  return repairFindElementVisits(
    [{_type: 'code-block', _key: 'container', code: []}],
    [{_key: 'container'}, 'code'],
    children,
    children,
  )
}

function repairFindElementVisits(
  initialValue: Array<unknown>,
  path: Path,
  value: Array<unknown>,
  measuredChildren: Array<unknown>,
): number {
  const editor = createBareEditor(initialValue as PortableTextBlock[]) as Editor
  editor.snapshot.context.schema = traversalTestbed.schema
  editor.snapshot.context.containers = traversalTestbed.context.containers
  editor.containers = resolveContainersRich(traversalTestbed.schema, [
    codeBlockContainer,
  ])
  let elementVisits = 0
  const find = vi.spyOn(measuredChildren, 'find')
  find.mockImplementation((predicate) =>
    Array.prototype.find.call(measuredChildren, (value, index, array) => {
      elementVisits++
      return predicate(value, index, array)
    }),
  )
  setNormalizing(editor, false)
  withRemoteChanges(editor, 'patches', () => {
    editor.apply({type: 'set', path, value: value as PortableTextBlock[]})
  })
  setNormalizing(editor, true)
  normalize(editor)
  find.mockRestore()
  return elementVisits
}

function block(key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}s`, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function keylessSpanBlock(key: string) {
  return {...block(key), children: [{_type: 'span', text: 'foo', marks: []}]}
}
