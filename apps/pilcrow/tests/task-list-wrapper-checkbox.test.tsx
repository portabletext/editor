import {expect, test, vi} from 'vitest'
import {createPilcrowTestEditor} from './test-editor'

/**
 * Sinking the first item of a task list wraps it in a structural
 * list-item whose only `content` is a nested list. That wrapper
 * has no task text of its own, so it should NOT render a checkbox -
 * otherwise the user sees a phantom checkbox sitting above the
 * real task, toggling a `checked` field on a wrapper node they
 * never see in the document outline.
 */
test('a list-item that holds only a nested list renders without a checkbox', async () => {
  const initialValue = [
    {
      _type: 'list',
      _key: 'l1',
      kind: 'task',
      items: [
        {
          _type: 'list-item',
          _key: 'wrapper',
          // No `checked` field, no text block - structural wrapper produced
          // by sinking the first item.
          content: [
            {
              _type: 'list',
              _key: 'l2',
              kind: 'task',
              items: [
                {
                  _type: 'list-item',
                  _key: 'real',
                  checked: false,
                  content: [
                    {
                      _type: 'block',
                      _key: 'b1',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: 's1',
                          text: 'real task',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const {locator} = await createPilcrowTestEditor({
    initialValue: initialValue as never,
  })
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  const editable = locator.element() as HTMLElement
  await vi.waitFor(() => {
    expect(editable.querySelectorAll('input[type="checkbox"]').length).toBe(1)
  })
})

test('task list-items each render their own checkbox at every depth', async () => {
  const initialValue = [
    {
      _type: 'list',
      _key: 'l1',
      kind: 'task',
      items: [
        {
          _type: 'list-item',
          _key: 'outer',
          checked: true,
          content: [
            {
              _type: 'block',
              _key: 'b1',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 's1', text: 'outer', marks: []}],
            },
            {
              _type: 'list',
              _key: 'l2',
              kind: 'task',
              items: [
                {
                  _type: 'list-item',
                  _key: 'inner',
                  checked: false,
                  content: [
                    {
                      _type: 'block',
                      _key: 'b2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's2', text: 'inner', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const {locator} = await createPilcrowTestEditor({
    initialValue: initialValue as never,
  })
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  const editable = locator.element() as HTMLElement
  await vi.waitFor(() => {
    expect(editable.querySelectorAll('input[type="checkbox"]').length).toBe(2)
  })
})
