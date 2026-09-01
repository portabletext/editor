import type {RangeDecoration} from '@portabletext/editor'
import type {DocumentHandle} from '@sanity/sdk-react'
import {describe, expect, it} from 'vitest'
import type {RenderCursorFunction} from './plugin.sdk-presence'
import {renderDefaultCursor} from './presence-caret'
import {
  mergePresenceDecorations,
  resolveCursorRenderer,
  splitEditableProps,
  type SDKPortableTextEditableProps,
} from './sdk-editable'

function decoration(testId: string): RangeDecoration {
  return {
    component: (props) => props.children as never,
    selection: null,
    payload: {testId},
  }
}

describe('splitEditableProps', () => {
  const props: SDKPortableTextEditableProps = {
    'documentId': 'doc-1',
    'documentType': 'post',
    'path': 'content',
    // The full handle, since any of these reaching the DOM is a React warning
    // and a broken document reference.
    'projectId': 'project-1',
    'dataset': 'production',
    'perspective': 'drafts',
    'liveEdit': false,
    'resourceName': 'resource-1',
    // Genuine editable props
    'style': {minHeight: 120},
    'data-testid': 'editable',
  } as SDKPortableTextEditableProps

  it('keeps every handle field out of what reaches the editable', () => {
    // `satisfies` makes this list exhaustive: adding a field to `DocumentHandle`
    // breaks compilation here until it is also pulled out in the component, which
    // is what stops a new field being forwarded to the DOM as an attribute.
    const handleKeys = {
      dataset: true,
      documentId: true,
      documentType: true,
      liveEdit: true,
      perspective: true,
      projectId: true,
      resource: true,
      resourceName: true,
      source: true,
    } satisfies {[Key in keyof DocumentHandle]-?: true}

    // Every handle key has to be present in the input, or a field the component
    // forgets to pull out would be absent from the result for the wrong reason.
    const withEveryHandleField = {
      ...props,
      ...Object.fromEntries(Object.keys(handleKeys).map((key) => [key, 'set'])),
      path: 'content',
    } as SDKPortableTextEditableProps

    const {editableProps} = splitEditableProps(withEveryHandleField)

    for (const key of Object.keys(handleKeys)) {
      expect(editableProps).not.toHaveProperty(key)
    }
  })

  it('keeps its own props out of what reaches the editable', () => {
    const {editableProps} = splitEditableProps({
      ...props,
      renderCursor: () => (cursorProps) => cursorProps.children as never,
      rangeDecorations: [decoration('caller')],
    })

    expect(editableProps).not.toHaveProperty('path')
    expect(editableProps).not.toHaveProperty('renderCursor')
    expect(editableProps).not.toHaveProperty('rangeDecorations')
  })

  it('forwards everything else untouched', () => {
    const {editableProps} = splitEditableProps(props)

    expect(editableProps).toEqual({
      'style': {minHeight: 120},
      'data-testid': 'editable',
    })
  })

  it('collects the handle so the document is addressed correctly', () => {
    const {handle, path} = splitEditableProps(props)

    expect(path).toBe('content')
    expect(handle.documentId).toBe('doc-1')
    expect(handle.documentType).toBe('post')
    expect(handle.projectId).toBe('project-1')
    expect(handle.dataset).toBe('production')
    expect(handle.resourceName).toBe('resource-1')
  })

  it('omits handle fields the caller never passed', () => {
    // The SDK resolves an ambient perspective from `ResourceProvider` with
    // `Object.hasOwn`, so a `perspective: undefined` key overrides the context
    // value instead of deferring to it. Same for the resource fields, which
    // decide the project and dataset.
    const {handle} = splitEditableProps({
      documentId: 'doc-1',
      documentType: 'post',
      path: 'content',
    } as SDKPortableTextEditableProps)

    expect(Object.keys(handle).sort()).toEqual(['documentId', 'documentType'])
    expect('perspective' in handle).toBe(false)
  })

  it('forwards an explicitly undefined perspective, matching a direct hook call', () => {
    // Passing `perspective={maybeUndefined}` here has to behave exactly as
    // passing it straight to the SDK hook does: the key is present, so it wins
    // over the context. A value check would let the wrapper drift from the
    // direct hook call without this test noticing.
    const {handle} = splitEditableProps({
      documentId: 'doc-1',
      documentType: 'post',
      path: 'content',
      perspective: undefined,
    } as SDKPortableTextEditableProps)

    expect('perspective' in handle).toBe(true)
  })

  it('carries the perspective through, which decides the document reported', () => {
    const {handle} = splitEditableProps({
      ...props,
      perspective: {releaseName: 'autumn'},
    })

    expect(handle.perspective).toEqual({releaseName: 'autumn'})
  })
})

describe('mergePresenceDecorations', () => {
  const caller = [decoration('caller')]
  const cursors = [decoration('cursor-a'), decoration('cursor-b')]

  it("appends carets after the caller's own decorations", () => {
    const merged = mergePresenceDecorations(caller, cursors, true)

    expect(merged?.map((item) => item.payload?.['testId'])).toEqual([
      'caller',
      'cursor-a',
      'cursor-b',
    ])
  })

  it('does not drop the caller decorations, which replacing would', () => {
    const merged = mergePresenceDecorations(caller, cursors, true)

    expect(merged).toContain(caller[0])
  })

  it('returns just the carets when the caller passed none', () => {
    expect(mergePresenceDecorations(undefined, cursors, true)).toEqual(cursors)
  })

  it('leaves the caller decorations alone when no caret component was given', () => {
    expect(mergePresenceDecorations(caller, cursors, false)).toBe(caller)
  })

  it('stays undefined when there is nothing at all to draw', () => {
    expect(mergePresenceDecorations(undefined, cursors, false)).toBeUndefined()
  })
})

describe('resolveCursorRenderer', () => {
  const custom: RenderCursorFunction = () => (props) => props.children as never

  it('draws the built-in caret when the app gave none', () => {
    const resolved = resolveCursorRenderer(undefined)

    expect(resolved.renderCursor).toBe(renderDefaultCursor)
    expect(resolved.drawCursors).toBe(true)
  })

  it("uses the app's caret when it gave one", () => {
    const resolved = resolveCursorRenderer(custom)

    expect(resolved.renderCursor).toBe(custom)
    expect(resolved.drawCursors).toBe(true)
  })

  it('draws nothing when carets are switched off with null', () => {
    expect(resolveCursorRenderer(null).drawCursors).toBe(false)
  })
})
