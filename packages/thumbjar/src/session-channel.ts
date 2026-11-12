import type {StepRecord} from './steps.ts'

type Channel = {
  next: (index: number) => Promise<unknown>
  publish: (index: number, record: StepRecord) => void
}
export const sessionChannels = new WeakMap<object, Channel>()

export async function nextSessionInput<Input>(
  inputs: Input[],
  index: number,
): Promise<Input | undefined> {
  const channel = sessionChannels.get(inputs)
  return channel
    ? ((await channel.next(index)) as Input | undefined)
    : inputs[index]
}

export function publishSessionBoundary(
  inputs: object,
  index: number,
  record: StepRecord,
): void {
  sessionChannels.get(inputs)?.publish(index, record)
}
