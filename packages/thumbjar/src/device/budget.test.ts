import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {
  countDeviceTests,
  CAPTURE_SEED_SECONDS,
  DEVICE_STATE_READ_SECONDS,
  DEVICE_TEST_TIMEOUT_SECONDS,
  FAULT_READ_SECONDS,
  FRESH_RESTART_SECONDS,
  JOIN_GRACE_SECONDS,
  RESTART_SECONDS,
  RUN_ON_DEVICE_WORST_SECONDS,
  TYPE_ON_DEVICE_WORST_SECONDS,
  DICTIONARY_CHECK_KILL_SECONDS,
  DICTIONARY_CHECK_SECONDS,
  DICTIONARY_LOAD_SECONDS,
  DICTIONARY_WAIT_KILL_SECONDS,
  DICTIONARY_WAIT_TAIL_SECONDS,
  deviceTestFileSeconds,
  FETCH_U2_JAR_WORST_SECONDS,
  KILL_GRACE_SECONDS,
  PREP_KILL_SECONDS,
  PREP_STAGES_SECONDS,
  prepWorstSeconds,
  SELF_UPDATE_BLOCK_SECONDS,
  U2_JAR_ATTEMPT_SECONDS,
  U2_JAR_ATTEMPTS,
  U2_JAR_RETRY_SECONDS,
} from './budget.ts'

const prepare = readFileSync(
  new URL('../prepare/prepare.sh', import.meta.url),
  'utf8',
)

describe(deviceTestFileSeconds.name, () => {
  test("gives each test its timeout on top of the global setup and Vitest's start and exit", () => {
    expect([1, 2, 3, 4].map(deviceTestFileSeconds)).toEqual([
      761, 1422, 2083, 2744,
    ])
  })
})

describe('the worst case of a call', () => {
  test('leaves a `typeOnDevice` call at 520 seconds and gives a `runOnDevice` call 636 for its reads after a fault, its fresh Chrome and its device state, and the test timeout covers the longer', () => {
    expect({
      typeOnDevice: TYPE_ON_DEVICE_WORST_SECONDS,
      runOnDevice: RUN_ON_DEVICE_WORST_SECONDS,
      parts: {
        faultReads: 2 * (FAULT_READ_SECONDS + JOIN_GRACE_SECONDS),
        restartGrowth: FRESH_RESTART_SECONDS - RESTART_SECONDS,
        deviceState: DEVICE_STATE_READ_SECONDS + JOIN_GRACE_SECONDS,
      },
      testTimeout: DEVICE_TEST_TIMEOUT_SECONDS,
    }).toEqual({
      typeOnDevice: 520,
      runOnDevice: 636,
      parts: {faultReads: 70, restartGrowth: 32, deviceState: 14},
      testTimeout: 661,
    })
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

describe('`thumbjar fetch-u2-jar`', () => {
  test('is bounded at three downloads of 45 seconds, 15 apart, 165 seconds', () => {
    expect({
      attempts: U2_JAR_ATTEMPTS,
      attempt: U2_JAR_ATTEMPT_SECONDS,
      retry: U2_JAR_RETRY_SECONDS,
      worst: FETCH_U2_JAR_WORST_SECONDS,
    }).toEqual({attempts: 3, attempt: 45, retry: 15, worst: 165})
  })
})

describe(countDeviceTests.name, () => {
  test('counts top-level tests, failing ones included, and nothing nested or in comments', () => {
    expect(
      countDeviceTests(
        "test('a', () => {})\n// test('b')\ntest.fails('c', () => {\n  test('d')\n})\n",
      ),
    ).toEqual(2)
  })
})

test('accepts a declared count for data-driven device suites', () => {
  expect(
    countDeviceTests('// thumbjar-test-count: 13\nFeature({featureText})'),
  ).toEqual(13)
})
