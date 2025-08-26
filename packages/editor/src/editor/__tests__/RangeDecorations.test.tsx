import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {render, waitFor} from '@testing-library/react'
import {createRef, type ReactNode, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import type {RangeDecoration} from '../..'
import type {PortableTextEditor} from '../PortableTextEditor'
import {PortableTextEditorTester} from './PortableTextEditorTester'

const helloBlock: PortableTextBlock = {
  _key: '123',
  _type: 'block',
  markDefs: [],
  children: [{_key: '567', _type: 'span', text: 'Hello', marks: []}],
}

let rangeDecorationIteration = 0

const RangeDecorationTestComponent = ({children}: {children?: ReactNode}) => {
  rangeDecorationIteration++
  return <span data-testid="range-decoration">{children}</span>
}

describe('RangeDecorations', () => {
  it('only render range decorations as necessary', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const value = [helloBlock]
    let rangeDecorations: RangeDecoration[] = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    const {rerender} = await waitFor(() =>
      render(
        <PortableTextEditorTester
          keyGenerator={createTestKeyGenerator()}
          onChange={onChange}
          rangeDecorations={rangeDecorations}
          ref={editorRef}
          value={value}
        />,
      ),
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })

    // Re-render with the same range decorations
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })
    // Update the range decorations, a new object with identical values
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-equal-values']).toEqual([
        1,
        'updated-with-equal-values',
      ])
    })
    // Update the range decorations with a new offset
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 4},
        },
        payload: {id: 'a'},
      },
    ]
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        2,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new offset again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        3,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new payload
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'b'},
      },
    ]
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([4, 'updated-with-different-payload'])
    })

    // Update the range decorations with a new payload again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'c'},
      },
    ]
    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        rangeDecorations={rangeDecorations}
        ref={editorRef}
        value={value}
      />,
    )
    await waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([5, 'updated-with-different-payload'])
    })
  })
})
