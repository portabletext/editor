import type {
  EditorSnapshot,
  NetworkSnapshot,
  WorldSnapshot,
} from '@portabletext/io'
import {describe, expect, test} from 'vitest'
import {
  applicableActions,
  applicableNetworkActions,
  editorPrompts,
} from './applicable'

describe(applicableActions.name, () => {
  test('an idle editor allows every edit and suggests nothing', () => {
    const actions = applicableActions(
      worldSnapshot({editorA: editorSnapshot({undoDepth: 1})}),
      'Editor A',
    )

    expect(actions).toEqual({
      'type': {enabled: true},
      'set style': {enabled: true},
      'put caret after': {enabled: true},
      'insert block': {enabled: true},
      'delete block': {enabled: true},
      'delete before caret': {enabled: true},
      'undo': {enabled: true},
      'read-only': {enabled: true},
      'close': {enabled: true},
      'resync': {enabled: true},
      'resync discarding': {enabled: false, why: 'nothing unsent to discard'},
      'load': {
        enabled: false,
        why: 'load is only accepted while the first load is claimed',
      },
      'release claim': {enabled: false, why: 'no claim is pending'},
    })
    expect(editorPrompts(actions)).toEqual([])
  })

  test('undo is disabled when there is nothing to undo', () => {
    const actions = applicableActions(
      worldSnapshot({editorA: editorSnapshot({undoDepth: 0})}),
      'Editor A',
    )

    expect(actions.undo).toEqual({
      enabled: false,
      why: 'there is nothing to undo',
    })
  })

  test('a batch in flight resyncs with its outcome, and discarding waits', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({inFlight: batch(1), undoDepth: 1}),
      }),
      'Editor A',
    )

    expect(actions).toEqual({
      'type': {enabled: true},
      'set style': {enabled: true},
      'put caret after': {enabled: true},
      'insert block': {enabled: true},
      'delete block': {enabled: true},
      'delete before caret': {enabled: true},
      'undo': {enabled: true},
      'read-only': {enabled: true},
      'close': {enabled: true},
      'resync': {
        enabled: true,
        why: 'batch 1 is in flight: the host looks up in the transaction history whether it landed, and the resync carries that outcome',
      },
      'resync discarding': {
        enabled: false,
        why: 'the steps discard only when no batch is in flight',
      },
      'load': {
        enabled: false,
        why: 'load is only accepted while the first load is claimed',
      },
      'release claim': {enabled: false, why: 'no claim is pending'},
    })
    expect(editorPrompts(actions)).toEqual([])
  })

  test('a rejected batch suggests a resync', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({
          rejected: batch(1),
          pending: [batch(2)],
          undoDepth: 1,
        }),
      }),
      'Editor A',
    )

    expect(actions).toEqual({
      'type': {enabled: true},
      'set style': {enabled: true},
      'put caret after': {enabled: true},
      'insert block': {enabled: true},
      'delete block': {enabled: true},
      'delete before caret': {enabled: true},
      'undo': {enabled: true},
      'read-only': {enabled: true},
      'close': {enabled: true},
      'resync': {
        enabled: true,
        suggested:
          "Editor A's batch 1 was rejected: sending is blocked until a resync",
      },
      'resync discarding': {
        enabled: true,
        why: "the user's choice: load the saved version and throw away 1 unsent change(s)",
      },
      'load': {
        enabled: false,
        why: 'load is only accepted while the first load is claimed',
      },
      'release claim': {enabled: false, why: 'no claim is pending'},
    })
    expect(editorPrompts(actions)).toEqual([
      "Editor A's batch 1 was rejected: sending is blocked until a resync",
    ])
  })

  test('an editor out of step suggests a resync', () => {
    const actions = applicableActions(
      worldSnapshot({editorA: editorSnapshot({outOfStep: true})}),
      'Editor A',
    )

    expect(actions.resync).toEqual({
      enabled: true,
      suggested: 'Editor A is out of step: resync to recover',
    })
    expect(editorPrompts(actions)).toEqual([
      'Editor A is out of step: resync to recover',
    ])
  })

  test('an editor out of step with a batch in flight suggests a resync with its outcome', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({outOfStep: true, inFlight: batch(1)}),
      }),
      'Editor A',
    )

    expect(actions.resync).toEqual({
      enabled: true,
      why: 'batch 1 is in flight: the host looks up in the transaction history whether it landed, and the resync carries that outcome',
      suggested:
        'Editor A is out of step: resync with the outcome of batch 1 to recover',
    })
    expect(editorPrompts(actions)).toEqual([
      'Editor A is out of step: resync with the outcome of batch 1 to recover',
    ])
  })

  test('read-only blocks typing, not resync or closing', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({readOnly: true, undoDepth: 1}),
      }),
      'Editor A',
    )

    expect(actions).toEqual({
      'type': {enabled: false, why: 'typing is blocked while read-only'},
      'set style': {enabled: false, why: 'typing is blocked while read-only'},
      'put caret after': {enabled: true},
      'insert block': {
        enabled: false,
        why: 'typing is blocked while read-only',
      },
      'delete block': {
        enabled: false,
        why: 'typing is blocked while read-only',
      },
      'delete before caret': {
        enabled: false,
        why: 'typing is blocked while read-only',
      },
      'undo': {enabled: false, why: 'typing is blocked while read-only'},
      'read-only': {
        enabled: false,
        why: 'the steps have no way to end read-only',
      },
      'close': {enabled: true},
      'resync': {enabled: true},
      'resync discarding': {enabled: false, why: 'nothing unsent to discard'},
      'load': {
        enabled: false,
        why: 'load is only accepted while the first load is claimed',
      },
      'release claim': {enabled: false, why: 'no claim is pending'},
    })
  })

  test('a claimed first load suggests loading or releasing the claim', () => {
    const snapshot = worldSnapshot({
      editorA: editorSnapshot({status: 'loading'}),
      editorB: editorSnapshot({status: 'loading'}),
    })
    const actions = applicableActions(snapshot, 'Editor A')

    expect(actions).toEqual({
      'type': {enabled: false, why: "the editor isn't ready yet"},
      'set style': {enabled: false, why: "the editor isn't ready yet"},
      'put caret after': {enabled: true},
      'insert block': {enabled: false, why: "the editor isn't ready yet"},
      'delete block': {enabled: false, why: "the editor isn't ready yet"},
      'delete before caret': {
        enabled: false,
        why: "the editor isn't ready yet",
      },
      'undo': {enabled: false, why: "the editor isn't ready yet"},
      'read-only': {enabled: true},
      'close': {enabled: true},
      'resync': {enabled: false, why: 'resync is only accepted once ready'},
      'resync discarding': {
        enabled: false,
        why: 'resync is only accepted once ready',
      },
      'load': {
        enabled: true,
        suggested:
          "Editor A's first load is claimed: load the first content, or release the claim",
      },
      'release claim': {
        enabled: true,
        suggested:
          "Editor A's first load is claimed: load the first content, or release the claim",
      },
    })
    expect(editorPrompts(actions)).toEqual([
      "Editor A's first load is claimed: load the first content, or release the claim",
    ])
    expect(applicableActions(snapshot, 'Editor B')['release claim']).toEqual({
      enabled: false,
      why: "the steps release Editor A's claim only",
    })
  })

  test('an unmounted editor refuses everything', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({
          status: 'unmounted',
          rejected: batch(1),
          undoDepth: 1,
        }),
      }),
      'Editor A',
    )

    expect(actions).toEqual({
      'type': {enabled: false, why: 'the editor is unmounted'},
      'set style': {enabled: false, why: 'the editor is unmounted'},
      'put caret after': {enabled: false, why: 'the editor is unmounted'},
      'insert block': {enabled: false, why: 'the editor is unmounted'},
      'delete block': {enabled: false, why: 'the editor is unmounted'},
      'delete before caret': {enabled: false, why: 'the editor is unmounted'},
      'undo': {enabled: false, why: 'the editor is unmounted'},
      'read-only': {enabled: false, why: 'the editor is unmounted'},
      'close': {enabled: false, why: 'the editor is unmounted'},
      'resync': {enabled: false, why: 'the editor is unmounted'},
      'resync discarding': {enabled: false, why: 'the editor is unmounted'},
      'load': {enabled: false, why: 'the editor is unmounted'},
      'release claim': {enabled: false, why: 'the editor is unmounted'},
    })
    expect(editorPrompts(actions)).toEqual([])
  })

  test('a held transaction suggests nothing on the editor', () => {
    const actions = applicableActions(
      worldSnapshot({
        editorA: editorSnapshot({
          held: [
            {
              transactionId: 'B-2',
              previousRev: 'r2',
              resultRev: 'r3',
              patches: [],
            },
          ],
        }),
      }),
      'Editor A',
    )

    expect(editorPrompts(actions)).toEqual([])
  })
})

describe(applicableNetworkActions.name, () => {
  test('nothing waiting suggests nothing', () => {
    expect(applicableNetworkActions(worldSnapshot({}))).toEqual({
      links: {
        'Editor A': emptyLink(),
        'Editor B': emptyLink(),
      },
      advanceClock: {enabled: true},
    })
  })

  test('a waiting save request suggests the server receives it', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({inFlight: batch(1)}),
        network: networkSnapshot({
          saveRequests: [
            {
              editor: 'Editor A',
              batchId: 'A-1',
              batchNumber: 1,
              final: false,
              patchCount: 1,
              patches: [],
            },
          ],
        }),
      }),
    )

    expect(network.links['Editor A']).toEqual({
      towardServer: {
        prompts: [
          "Editor A's batch 1 is waiting: the server receives it, or refuses it",
        ],
        saveRequests: {
          'A-1': {
            enabled: true,
            suggested:
              "Editor A's batch 1 is waiting: the server receives it, or refuses it",
          },
        },
        loseReply: {
          'A-1': {
            enabled: true,
            why: 'the server saves it, but the host never hears back',
          },
        },
      },
      towardEditor: {prompts: [], replies: {}, lostReplies: {}, feed: {}},
      feedLost: feedLostEnabled,
      held: undefined,
    })
  })

  test('a waiting rejection suggests delivering it', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({inFlight: batch(1)}),
        network: networkSnapshot({
          replies: [{editor: 'Editor A', batchId: 'A-1', batchNumber: 1}],
        }),
      }),
    )

    expect(network.links['Editor A']).toEqual({
      towardServer: {prompts: [], saveRequests: {}, loseReply: {}},
      towardEditor: {
        prompts: ["Editor A's batch 1 was refused: deliver the rejection"],
        replies: {
          'A-1': {
            enabled: true,
            suggested: "Editor A's batch 1 was refused: deliver the rejection",
          },
        },
        lostReplies: {},
        feed: {},
      },
      feedLost: feedLostEnabled,
      held: undefined,
    })
  })

  test('a final save request cannot lose its reply', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        network: networkSnapshot({
          saveRequests: [
            {
              editor: 'Editor A',
              batchId: 'A-2',
              batchNumber: 2,
              final: true,
              patchCount: 1,
              patches: [],
            },
          ],
        }),
      }),
    )

    expect(network.links['Editor A'].towardServer.loseReply).toEqual({
      'A-2': {enabled: false, why: 'a final batch gets no reply'},
    })
  })

  test('a lost reply for the batch in flight suggests retrying it, and one for a settled batch cannot be retried', () => {
    const lostReplies = [
      {editor: 'Editor A' as const, batchId: 'A-1', batchNumber: 1},
    ]
    const inFlight = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({inFlight: batch(1)}),
        network: networkSnapshot({lostReplies}),
      }),
    )
    const settled = applicableNetworkActions(
      worldSnapshot({network: networkSnapshot({lostReplies})}),
    )

    expect(inFlight.links['Editor A'].towardEditor).toEqual({
      prompts: [
        "the save reply for Editor A's batch 1 was lost: retry it with the same transaction ID",
      ],
      replies: {},
      lostReplies: {
        'A-1': {
          enabled: true,
          suggested:
            "the save reply for Editor A's batch 1 was lost: retry it with the same transaction ID",
        },
      },
      feed: {},
    })
    expect(settled.links['Editor A'].towardEditor).toEqual({
      prompts: [],
      replies: {},
      lostReplies: {
        'A-1': {
          enabled: false,
          why: "batch 1 isn't in flight anymore: the host knows what became of it",
        },
      },
      feed: {},
    })
  })

  test('a lost feed can be reported only while the editor is ready and in step', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({outOfStep: true}),
        editorB: editorSnapshot({status: 'loading'}),
      }),
    )

    expect([
      network.links['Editor A'].feedLost,
      network.links['Editor B'].feedLost,
    ]).toEqual([
      {enabled: false, why: 'the editor is out of step already: resync'},
      {enabled: false, why: 'the feed starts once the editor is ready'},
    ])
  })

  test('a waiting transaction suggests delivering it', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        network: networkSnapshot({
          feeds: {'Editor A': [], 'Editor B': [feedItem('A-1', 'r1', 'r2')]},
        }),
      }),
    )

    expect(network.links['Editor B'].towardEditor).toEqual({
      prompts: ['A-1 is waiting for Editor B: deliver it'],
      replies: {},
      lostReplies: {},
      feed: {
        'A-1': {
          enabled: true,
          suggested: 'A-1 is waiting for Editor B: deliver it',
        },
      },
    })
  })

  test('a held transaction names the missing revision and suggests delivering it or advancing the clock', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({
          held: [
            {
              transactionId: 'B-2',
              previousRev: 'r2',
              resultRev: 'r3',
              patches: [],
            },
          ],
        }),
        network: networkSnapshot({
          feeds: {
            'Editor A': [feedItem('B-1', 'r1', 'r2')],
            'Editor B': [],
          },
        }),
      }),
    )

    expect(network).toEqual({
      links: {
        'Editor A': {
          towardServer: {prompts: [], saveRequests: {}, loseReply: {}},
          towardEditor: {
            prompts: [
              "B-2 is held: it doesn't connect to r1, deliver the transaction that ends at r2, or advance 10 s",
            ],
            replies: {},
            lostReplies: {},
            feed: {
              'B-1': {
                enabled: true,
                suggested: 'deliver B-1: the held B-2 connects after it',
              },
            },
          },
          feedLost: feedLostEnabled,
          held: "B-2 is held: it doesn't connect to r1, deliver the transaction that ends at r2, or advance 10 s",
        },
        'Editor B': emptyLink(),
      },
      advanceClock: {enabled: true, suggested: 'advance 10 s to end the wait'},
    })
  })

  test('a held transaction whose missing one is not waiting suggests advancing the clock', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorA: editorSnapshot({
          held: [
            {
              transactionId: 'B-2',
              previousRev: 'r2',
              resultRev: 'r3',
              patches: [],
            },
          ],
        }),
      }),
    )

    expect(network.links['Editor A'].held).toEqual(
      "B-2 is held: it doesn't connect to r1, and no transaction that ends at r2 is waiting: advance 10 s",
    )
  })

  test('a transaction for a loading editor cannot be delivered', () => {
    const network = applicableNetworkActions(
      worldSnapshot({
        editorB: editorSnapshot({status: 'loading'}),
        network: networkSnapshot({
          feeds: {'Editor A': [], 'Editor B': [feedItem('A-1', 'r1', 'r2')]},
        }),
      }),
    )

    expect(network.links['Editor B'].towardEditor).toEqual({
      prompts: [],
      replies: {},
      lostReplies: {},
      feed: {
        'A-1': {
          enabled: false,
          why: 'transactions are only accepted once ready',
        },
      },
    })
  })
})

function worldSnapshot({
  editorA = editorSnapshot({}),
  editorB = editorSnapshot({}),
  network = networkSnapshot({}),
}: {
  editorA?: EditorSnapshot
  editorB?: EditorSnapshot
  network?: NetworkSnapshot
}): WorldSnapshot {
  return {
    editors: {
      'Editor A': {...editorA, id: 'A'},
      'Editor B': {...editorB, id: 'B'},
    },
    server: {
      value: 'B: foo',
      blocks: [],
      rev: 'r1',
      transactions: [],
      duplicates: [],
    },
    network,
  }
}

function editorSnapshot(overrides: Partial<EditorSnapshot>): EditorSnapshot {
  return {
    id: 'A',
    status: 'ready',
    sync: 'synced',
    screen: 'B: foo|',
    blocks: [],
    base: {textspec: 'B: foo', blocks: [], rev: 'r1'},
    inFlight: null,
    rejected: null,
    echoed: [],
    pending: [],
    held: [],
    outOfStep: false,
    readOnly: false,
    undoDepth: 0,
    sentBatches: [],
    events: [],
    ...overrides,
  }
}

function networkSnapshot(overrides: Partial<NetworkSnapshot>): NetworkSnapshot {
  return {
    saveRequests: [],
    replies: [],
    lostReplies: [],
    feeds: {'Editor A': [], 'Editor B': []},
    now: 0,
    ...overrides,
  }
}

function batch(batchNumber: number) {
  return {
    batchNumber,
    transactionIds: [`A-${batchNumber}`],
    patchCount: 1,
    patches: [],
  }
}

function feedItem(
  transactionId: string,
  previousRev: string,
  resultRev: string,
): NetworkSnapshot['feeds']['Editor A'][number] {
  return {
    transactionId,
    previousRev,
    resultRev,
    batchIds: [transactionId],
    patchCount: 1,
    patches: [],
    source: {
      type: 'batches',
      batches: [
        {
          name: transactionId.startsWith('A') ? 'Editor A' : 'Editor B',
          batchNumber: Number(transactionId.split('-')[1]),
        },
      ],
    },
  }
}

const feedLostEnabled = {
  enabled: true,
  why: "the host's listener reconnected or may have missed transactions",
}

function emptyLink() {
  return {
    towardServer: {prompts: [], saveRequests: {}, loseReply: {}},
    towardEditor: {prompts: [], replies: {}, lostReplies: {}, feed: {}},
    feedLost: feedLostEnabled,
    held: undefined,
  }
}
