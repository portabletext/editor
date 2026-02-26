interface SchemaType {
  type?: SchemaType
  name: string
}

export function findBlockType(type: SchemaType): boolean {
  if (type.type) {
    return findBlockType(type.type)
  }

  if (type.name === 'block') {
    return true
  }

  return false
}
