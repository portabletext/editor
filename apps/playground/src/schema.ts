export const schema = {
  type: 'array' as const,
  name: 'body',
  of: [
    {
      type: 'block' as const,
      name: 'block',
    },
  ],
}
