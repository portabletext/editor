export const keyIs = {
  lineBreak: (event) => event.key === 'Enter' && event.shiftKey,
} satisfies Record<string, KeyboardEventPredicate>

type KeyboardEventPredicate = (
  event: Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
) => boolean
