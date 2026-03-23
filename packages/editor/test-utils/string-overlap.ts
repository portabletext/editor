export function stringOverlap(x: string, y: string) {
  let overlap = ''

  const [string, searchString] = y.length >= x.length ? [x, y] : [y, x]

  for (let i = -1; i > -string.length + -searchString.length; i--) {
    if (i >= -string.length) {
      const stringSlice = string.slice(0, i * -1)
      const searchStringSlice = searchString.slice(i)

      if (stringSlice === searchStringSlice) {
        overlap = stringSlice.length > overlap.length ? stringSlice : overlap
      }
    } else {
      const searchStringSlice = searchString.slice(i, i + string.length)
      const stringSlice =
        searchStringSlice.length === string.length
          ? string
          : string.slice(string.length - searchStringSlice.length)

      if (stringSlice === searchStringSlice) {
        overlap = stringSlice.length > overlap.length ? stringSlice : overlap
      }
    }
  }

  return overlap
}
