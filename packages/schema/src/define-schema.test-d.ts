import {defineSchema} from '@portabletext/schema'
import {describe, expectTypeOf, test} from 'vitest'

describe('defineSchema deep inference', () => {
  test('image at depth 1 (sibling of callout)', () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'wrapper',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  type: 'callout',
                  fields: [
                    {name: 'content', type: 'array', of: [{type: 'block'}]},
                  ],
                },
                {type: 'image', fields: [{name: 'src', type: 'string'}]},
              ],
            },
          ],
        },
      ],
    })
    expectTypeOf(schema).toMatchTypeOf<{blockObjects: ReadonlyArray<unknown>}>()
  })

  test('image at depth 5 (sibling of callout in cell.content)', () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'cell',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [
                                {type: 'block'},
                                {
                                  type: 'callout',
                                  fields: [
                                    {
                                      name: 'content',
                                      type: 'array',
                                      of: [{type: 'block'}],
                                    },
                                  ],
                                },
                                {
                                  type: 'image',
                                  fields: [{name: 'src', type: 'string'}],
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
          ],
        },
      ],
    })
    expectTypeOf(schema).toMatchTypeOf<{blockObjects: ReadonlyArray<unknown>}>()
  })

  test('image at depth 5 with populated sub-schema on inner blocks', () => {
    const schema = defineSchema({
      blockObjects: [
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'cell',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [
                                {
                                  type: 'block',
                                  decorators: [{name: 'strong'}],
                                  styles: [{name: 'normal'}],
                                  annotations: [
                                    {
                                      name: 'link',
                                      fields: [{name: 'href', type: 'string'}],
                                    },
                                  ],
                                  lists: [],
                                },
                                {
                                  type: 'callout',
                                  fields: [
                                    {
                                      name: 'content',
                                      type: 'array',
                                      of: [
                                        {
                                          type: 'block',
                                          decorators: [{name: 'strong'}],
                                          styles: [{name: 'normal'}],
                                          annotations: [
                                            {
                                              name: 'comment',
                                              fields: [
                                                {name: 'text', type: 'string'},
                                              ],
                                            },
                                          ],
                                          lists: [{name: 'bullet'}],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'image',
                                  fields: [{name: 'src', type: 'string'}],
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
          ],
        },
      ],
    })
    expectTypeOf(schema).toMatchTypeOf<{blockObjects: ReadonlyArray<unknown>}>()
  })
})
