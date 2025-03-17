export function splitString(string: string, searchString: string) {
  const index = string.indexOf(searchString)
  if (index === -1) {
    return [string, '']
  }
  return [string.slice(0, index), string.slice(index + searchString.length)]
}
