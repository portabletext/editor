import {safeStringify} from '../../internal-utils/safe-json'

export type Scrubber = (key: string, value: unknown) => unknown

export interface ScrubberInterface {
  stringify(value: any): string
}

/**
 * This interface implements a stringify() function, which is used by Slate
 * internally when generating exceptions containing end user data.
 */
// eslint-disable-next-line no-redeclare
export const Scrubber: ScrubberInterface = {
  stringify(value: any): string {
    return safeStringify(value)
  },
}
