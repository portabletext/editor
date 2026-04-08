/**
 * Check if a type name is an editable container type.
 *
 * editableTypes contains scoped names like 'table', 'table.row', 'table.row.cell'.
 * A node's _type is unscoped like 'row'. This function checks both direct match
 * and scoped suffix match.
 */
export function isEditableType(
  editableTypes: Set<string>,
  typeName: string,
): boolean {
  if (editableTypes.has(typeName)) {
    return true
  }

  const suffix = `.${typeName}`
  for (const editableType of editableTypes) {
    if (editableType.endsWith(suffix)) {
      return true
    }
  }

  return false
}
