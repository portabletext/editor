import type {
  RangeDecorationMapping,
  RangeDecorationRegistration,
  RegistrableRangeDecoration,
} from '../types/editor'
import type {RangeDecorationsActor} from './range-decorations-machine'

export function assertUniqueRangeDecorationIds(
  rangeDecorations: Array<{id: string}>,
): void {
  const seen = new Set<string>()

  for (const rangeDecoration of rangeDecorations) {
    if (seen.has(rangeDecoration.id)) {
      throw new Error(
        `\`registerRangeDecorations\` was given more than one range decoration with the id "${rangeDecoration.id}". Each range decoration must have a unique \`id\`.`,
      )
    }

    seen.add(rangeDecoration.id)
  }
}

export function createRangeDecorationsRegistration(options: {
  rangeDecorationsActor: RangeDecorationsActor
  sourceKey: string
  rangeDecorations: Array<RegistrableRangeDecoration>
  onMapped?: (mappings: Array<RangeDecorationMapping>) => void
}): RangeDecorationRegistration {
  let unregistered = false

  options.rangeDecorationsActor.send({
    type: 'source updated',
    sourceKey: options.sourceKey,
    kind: 'registered',
    rangeDecorations: options.rangeDecorations,
    on: options.onMapped,
  })

  return {
    update: (rangeDecorations) => {
      if (unregistered) {
        return
      }

      assertUniqueRangeDecorationIds(rangeDecorations)

      options.rangeDecorationsActor.send({
        type: 'source updated',
        sourceKey: options.sourceKey,
        kind: 'registered',
        rangeDecorations,
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
      const source = options.rangeDecorationsActor
        .getSnapshot()
        .context.sources.find(
          (candidate) => candidate.sourceKey === options.sourceKey,
        )

      if (!source) {
        return []
      }

      return source.decoratedRanges.map((decoratedRange) => {
        const registered =
          decoratedRange.rangeDecoration as RegistrableRangeDecoration
        return {id: registered.id, range: registered.range}
      })
    },
  }
}
