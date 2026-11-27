import {buildIndexMaps} from '../src/internal-utils/build-index-maps'

export function buildIndexMap(
  schema: any,
  containers: any,
  value: any,
): Map<string, number> {
  const indexMap = new Map<string, number>()
  buildIndexMaps({schema, value, containers}, {indexMap})
  return indexMap
}
