import DOMPurify from 'dompurify'

export const sanitize = (data: string) =>
  DOMPurify.sanitize(data, {
    ALLOWED_TAGS: [],
  })

export const isClean = (input: string | null) => {
  if (input === null) {
    return true
  }
  return input.trim().length > sanitize(input).trim().length ? false : true
}
