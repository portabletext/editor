import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {
  CAPTURE_SEED_SECONDS,
  DICTIONARY_CHECK_KILL_SECONDS,
  DICTIONARY_CHECK_SECONDS,
  DICTIONARY_LOAD_SECONDS,
  DICTIONARY_WAIT_KILL_SECONDS,
  DICTIONARY_WAIT_TAIL_SECONDS,
  deviceTestFileSeconds,
  KILL_GRACE_SECONDS,
  PREP_KILL_SECONDS,
  PREP_STAGES_SECONDS,
  prepWorstSeconds,
  SELF_UPDATE_BLOCK_SECONDS,
} from './budget.ts'

const prepare = readFileSync(
  new URL('../prepare/prepare.sh', import.meta.url),
  'utf8',
)

describe(deviceTestFileSeconds.name, () => {
  test("gives each test its timeout on top of the global setup and Vitest's start and exit", () => {
    expect([1, 2, 3, 4].map(deviceTestFileSeconds)).toEqual([
      645, 1190, 1735, 2280,
    ])
  })
})

describe(prepWorstSeconds.name, () => {
  test('gives English the 600 seconds of its stages and the Play Store block, 632 seconds with the kill-after', () => {
    expect({
      prep: prepWorstSeconds('en'),
      parts: {
        stages: PREP_STAGES_SECONDS,
        selfUpdateBlock: SELF_UPDATE_BLOCK_SECONDS + KILL_GRACE_SECONDS,
        kill: PREP_KILL_SECONDS,
      },
    }).toEqual({
      prep: 632,
      parts: {stages: 600, selfUpdateBlock: 22, kill: 10},
    })
  })

  test('adds the boot capture and the Japanese dictionary wait and check for Japanese, whose 600 seconds of stages also cover the load window from boot, 889 seconds with the kill-after', () => {
    expect({
      prep: prepWorstSeconds('ja'),
      parts: {
        stages: PREP_STAGES_SECONDS,
        bootCapture: CAPTURE_SEED_SECONDS + KILL_GRACE_SECONDS,
        selfUpdateBlock: SELF_UPDATE_BLOCK_SECONDS + KILL_GRACE_SECONDS,
        dictionaryLoad: DICTIONARY_LOAD_SECONDS,
        dictionaryWaitTail:
          DICTIONARY_WAIT_TAIL_SECONDS + DICTIONARY_WAIT_KILL_SECONDS,
        dictionaryCheck:
          DICTIONARY_CHECK_SECONDS + DICTIONARY_CHECK_KILL_SECONDS,
        kill: PREP_KILL_SECONDS,
      },
    }).toEqual({
      prep: 889,
      parts: {
        stages: 600,
        bootCapture: 17,
        selfUpdateBlock: 22,
        dictionaryLoad: 360,
        dictionaryWaitTail: 50,
        dictionaryCheck: 190,
        kill: 10,
      },
    })
  })

  test('runs Japanese prep for 862 seconds after its 17-second boot capture and English prep for 622, each with its kill-after, and each new stage under the caps the prep sums', () => {
    expect({
      deadlines: /^ {2}ja\) deadline=(\d+) ;;\n {2}\*\) deadline=(\d+) ;;$/m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      prep: /^timeout -k (\d+) "\$deadline" bash -c prep &$/m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      bootCapture: /^\s+timeout -k (\d+) (\d+) bash -c capture_seed /m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      selfUpdateBlock: /^\s+timeout -k (\d+) (\d+) bash -c block_self_update /m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      dictionaryLoad: /^DICTIONARY_LOAD_SECONDS=(\d+)$/m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      dictionaryWait:
        /^\s+timeout -k (\d+) \$\(\(wait_seconds \+ (\d+)\)\) node "\$here\/dictionary\.js" wait /m
          .exec(prepare)
          ?.slice(1)
          .map(Number),
      dictionaryCheck:
        /^\s+timeout -k (\d+) (\d+) node "\$here\/dictionary\.js" check /m
          .exec(prepare)
          ?.slice(1)
          .map(Number),
    }).toEqual({
      deadlines: [862, 622],
      prep: [PREP_KILL_SECONDS],
      bootCapture: [KILL_GRACE_SECONDS, CAPTURE_SEED_SECONDS],
      selfUpdateBlock: [KILL_GRACE_SECONDS, SELF_UPDATE_BLOCK_SECONDS],
      dictionaryLoad: [DICTIONARY_LOAD_SECONDS],
      dictionaryWait: [
        DICTIONARY_WAIT_KILL_SECONDS,
        DICTIONARY_WAIT_TAIL_SECONDS,
      ],
      dictionaryCheck: [
        DICTIONARY_CHECK_KILL_SECONDS,
        DICTIONARY_CHECK_SECONDS,
      ],
    })
  })
})
