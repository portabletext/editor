// Shapes seen in public Slack clipboard captures.

export const userMentionTexty = JSON.stringify({
  ops: [
    {
      attributes: {
        slackmention: {
          id: 'U0120JGV36K',
          label: '@cosmo',
          mention: true,
          unverified: false,
        },
      },
      insert: '@cosmo',
    },
    {insert: ' hello'},
  ],
})

export const channelTexty = JSON.stringify({
  ops: [
    {
      attributes: {
        slackmention: {
          id: 'CRXB3HYP9',
          label: '#general',
          mention: false,
          unverified: false,
        },
      },
      insert: '#general',
    },
    {insert: ' hello'},
  ],
})

export const hereTexty = JSON.stringify({
  ops: [
    {
      attributes: {
        slackmention: {
          id: 'BKhere',
          label: '@here',
          mention: true,
          unverified: false,
        },
      },
      insert: '@here',
    },
    {insert: ' test'},
  ],
})

export const channelBroadcastTexty = JSON.stringify({
  ops: [
    {
      attributes: {
        slackmention: {
          id: 'BKchannel',
          label: '@channel',
          mention: true,
          unverified: false,
        },
      },
      insert: '@channel',
    },
    {insert: ' test'},
  ],
})

export const emojiTexty = JSON.stringify({
  ops: [
    {insert: 'Hello '},
    {insert: {slackemoji: {text: ':wave:'}}},
    {insert: ' world'},
  ],
})
