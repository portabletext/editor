import {buildIndexMaps} from '../src/internal-utils/build-index-maps'

export function buildBlockIndexMap(
  schema: any,
  containers: any,
  value: any,
): Map<string, number> {
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, value, containers}, {blockIndexMap})
  return blockIndexMap
}
