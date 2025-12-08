export function startCase(str: string): string {
  return (
    str
      // Insert space before uppercase letters in camelCase (e.g., 'fooBar' -> 'foo Bar')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Replace underscores and dashes with spaces
      .replace(/[_-]+/g, ' ')
      // Trim and split on whitespace
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      // Capitalize first letter of each word, preserve rest
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
}
