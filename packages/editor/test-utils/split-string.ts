export function splitString(string: string, searchString: string) {
  const searchStringIndex = string.indexOf(searchString)

  if (searchStringIndex === -1) {
    return [string, ''] as const
  }

  const firstPart = string.slice(0, searchStringIndex)
  const secondPart = string.slice(searchStringIndex + searchString.length)

  return [firstPart, secondPart] as const
}
