import {cloneRange} from '../engine/range/clone-range'
import type {
  Decoration,
  DecorationMapping,
  DecorationRegistration,
} from '../types/editor'
import type {RangeDecorationsActor} from './range-decorations-machine'

export function assertUniqueDecorationIds(
  decorations: Array<{id: string}>,
): void {
  const seen = new Set<string>()

  for (const decoration of decorations) {
    if (seen.has(decoration.id)) {
      throw new Error(
        `\`registerDecorations\` was given more than one decoration with the id "${decoration.id}". Each decoration must have a unique \`id\`.`,
      )
    }

    seen.add(decoration.id)
  }
}

export function createDecorationsRegistration(options: {
  rangeDecorationsActor: RangeDecorationsActor
  sourceKey: string
  decorations: Array<Decoration>
  onMapped?: (mappings: Array<DecorationMapping>) => void
}): DecorationRegistration {
  let unregistered = false

  options.rangeDecorationsActor.send({
    type: 'source updated',
    sourceKey: options.sourceKey,
    kind: 'registered',
    rangeDecorations: options.decorations,
    on: options.onMapped,
  })

  return {
    update: (decorations) => {
      if (unregistered) {
        return
      }

      assertUniqueDecorationIds(decorations)

      options.rangeDecorationsActor.send({
        type: 'source updated',
        sourceKey: options.sourceKey,
        kind: 'registered',
        rangeDecorations: decorations,
      })
    },
    unregister: () => {
      if (unregistered) {
        return
      }

      unregistered = true
      options.rangeDecorationsActor.send({
        type: 'source removed',
        sourceKey: options.sourceKey,
      })
    },
    getDecorations: () => {
      if (unregistered) {
        return []
      }

      const source = options.rangeDecorationsActor
        .getSnapshot()
        .context.sources.find(
          (candidate) => candidate.sourceKey === options.sourceKey,
        )

      if (!source) {
        return []
      }

      return source.decoratedRanges.map((decoratedRange) => {
        const registered = decoratedRange.rangeDecoration as Decoration
        return {
          id: registered.id,
          range: cloneRange(registered.range),
        }
      })
    },
  }
}
