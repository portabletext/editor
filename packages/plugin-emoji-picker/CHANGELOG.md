# @portabletext/plugin-emoji-picker

## 1.0.1

### Patch Changes

- [#1782](https://github.com/portabletext/editor/pull/1782) [`16b7cc9`](https://github.com/portabletext/editor/commit/16b7cc9d62ba63aa1a327cf2f17da8d4ba610315) Thanks [@christianhg](https://github.com/christianhg)! - fix: require `MatchEmojis` to return a `BaseEmojiMatch`

  The internals of the emoji picker requires a `type` `'exact'` or `'partial'` as
  well as an `emoji` prop to pluck the emoji for insertion.

  ```ts
  export type BaseEmojiMatch =
    | {
        type: 'exact'
        emoji: string
      }
    | {
        type: 'partial'
        emoji: string
      }
  ```

## 1.0.0

### Major Changes

- [#1777](https://github.com/portabletext/editor/pull/1777) [`f6c208b`](https://github.com/portabletext/editor/commit/f6c208bd0a2575ebe88030cd2d009d08f92f98e2) Thanks [@christianhg](https://github.com/christianhg)! - feat!: cut v1 of emoji picker

### Patch Changes

- [#1779](https://github.com/portabletext/editor/pull/1779) [`cf7ab69`](https://github.com/portabletext/editor/commit/cf7ab690498c3e49420f2e4e7e785ebd402ab870) Thanks [@christianhg](https://github.com/christianhg)! - fix: allow consecutive direct hits

- [#1781](https://github.com/portabletext/editor/pull/1781) [`e08c994`](https://github.com/portabletext/editor/commit/e08c994f6e4b76ecef0a08f2b3a0808890b9c672) Thanks [@christianhg](https://github.com/christianhg)! - fix: edge case with submitting with lengthy text insertion

- [#1781](https://github.com/portabletext/editor/pull/1781) [`519cce0`](https://github.com/portabletext/editor/commit/519cce04b1d81e684c842af470d8436d60c2e632) Thanks [@christianhg](https://github.com/christianhg)! - fix: wrong direct hit edge case after undo

- [#1779](https://github.com/portabletext/editor/pull/1779) [`37d26d4`](https://github.com/portabletext/editor/commit/37d26d4fa572332077ec4937e0785e1e9044eddf) Thanks [@christianhg](https://github.com/christianhg)! - fix: allow undo after direct hit

- [#1779](https://github.com/portabletext/editor/pull/1779) [`7cbe5cb`](https://github.com/portabletext/editor/commit/7cbe5cb39588eb293be60d5753a249e327c6d303) Thanks [@christianhg](https://github.com/christianhg)! - fix: properly clear state when picking direct hit after undo

## 0.0.16

### Patch Changes

- Updated dependencies [[`e7c0e93`](https://github.com/portabletext/editor/commit/e7c0e932937f2f4c1c0e1fb01ff06099bc805aa6), [`6ceff3f`](https://github.com/portabletext/editor/commit/6ceff3fb5b2fb8eac06a6ed2f7ac873beb0d5064)]:
  - @portabletext/plugin-input-rule@0.4.0

## 0.0.15

### Patch Changes

- Updated dependencies [[`75b4c38`](https://github.com/portabletext/editor/commit/75b4c38be8b82aaa9d6f86ba97ba551ee2a83255)]:
  - @portabletext/editor@2.15.5

## 0.0.14

### Patch Changes

- Updated dependencies [[`851cad1`](https://github.com/portabletext/editor/commit/851cad1a5e77ff4f069f1882e5a147b461e9e04a)]:
  - @portabletext/editor@2.15.4

## 0.0.13

### Patch Changes

- Updated dependencies [[`777b61b`](https://github.com/portabletext/editor/commit/777b61ba6c25f6a543e1a3111ad8978072999b3e)]:
  - @portabletext/editor@2.15.3

## 0.0.12

### Patch Changes

- Updated dependencies [[`e84f3e5`](https://github.com/portabletext/editor/commit/e84f3e5c3070044692a7bfaa40481c79e40a4893), [`84247b1`](https://github.com/portabletext/editor/commit/84247b1efcbaf61aa16e0d76b1079a8405dde82b), [`86b46a4`](https://github.com/portabletext/editor/commit/86b46a469c2afc1b1795aab28f5f85420a87fb59), [`fac8c2e`](https://github.com/portabletext/editor/commit/fac8c2eedea8c3fdd1f3fa496663d172b4de18f4)]:
  - @portabletext/editor@2.15.2

## 0.0.11

### Patch Changes

- Updated dependencies [[`657f0e1`](https://github.com/portabletext/editor/commit/657f0e13138f51f1c8aa5a249b9c2ffa0fe0fb65), [`73c1f43`](https://github.com/portabletext/editor/commit/73c1f43d13f1adf8aad8db03597e4e858a3a41e2)]:
  - @portabletext/editor@2.15.1

## 0.0.10

### Patch Changes

- Updated dependencies [[`f9b0849`](https://github.com/portabletext/editor/commit/f9b0849c4cf5de298fb8133230d9d14ff780e25d), [`79e3e98`](https://github.com/portabletext/editor/commit/79e3e983fae9eb3106d7741d877ff99a76d7fde5), [`36615f3`](https://github.com/portabletext/editor/commit/36615f3c42805434e5e597587a4c1e2fac73c75e)]:
  - @portabletext/editor@2.15.0

## 0.0.9

### Patch Changes

- [#1745](https://github.com/portabletext/editor/pull/1745) [`82bb94d`](https://github.com/portabletext/editor/commit/82bb94d998445f0b79c215d6ab1f3eed56c020fc) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade React Compiler to v1

- Updated dependencies [[`9d6cfdb`](https://github.com/portabletext/editor/commit/9d6cfdbe3fc67d88113da7f73b408f3185ddabef), [`82bb94d`](https://github.com/portabletext/editor/commit/82bb94d998445f0b79c215d6ab1f3eed56c020fc), [`a8a3fad`](https://github.com/portabletext/editor/commit/a8a3faddb5217fde30df34bd175e99e709983ff6)]:
  - @portabletext/editor@2.14.4

## 0.0.8

### Patch Changes

- Updated dependencies [[`54f57e3`](https://github.com/portabletext/editor/commit/54f57e3e85cc5544c5d18881c393957218ffb34a)]:
  - @portabletext/editor@2.14.3

## 0.0.7

### Patch Changes

- Updated dependencies [[`7eab00e`](https://github.com/portabletext/editor/commit/7eab00ee9b1f1186fdac76210daa1953edc2847c)]:
  - @portabletext/editor@2.14.2

## 0.0.6

### Patch Changes

- Updated dependencies [[`13a2c63`](https://github.com/portabletext/editor/commit/13a2c6337cc48773fe84baaa5f6ddbbc9502b683), [`0e90027`](https://github.com/portabletext/editor/commit/0e90027a750c49f0dfa1273b26b367fbbc20f59c), [`4041334`](https://github.com/portabletext/editor/commit/4041334f4474b00b275f94532e4baddcc1b906ab)]:
  - @portabletext/editor@2.14.1

## 0.0.5

### Patch Changes

- [#1719](https://github.com/portabletext/editor/pull/1719) [`5b86653`](https://github.com/portabletext/editor/commit/5b86653e964ff26c3f17c749ef1d6d05972529a9) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency xstate to ^5.23.0

- Updated dependencies [[`5b86653`](https://github.com/portabletext/editor/commit/5b86653e964ff26c3f17c749ef1d6d05972529a9), [`6502159`](https://github.com/portabletext/editor/commit/650215951a623af22b0d39ebfdaa66f81dcac27c), [`d593b98`](https://github.com/portabletext/editor/commit/d593b98ea62f54b879fbdb42e91a01d47c2aeb76)]:
  - @portabletext/editor@2.14.0

## 0.0.4

### Patch Changes

- Updated dependencies [[`ac41e55`](https://github.com/portabletext/editor/commit/ac41e556340cb604f9bc5533241869a69ffd53af), [`d4be819`](https://github.com/portabletext/editor/commit/d4be819bf47d3e352d767d0a62964605591b22bc), [`13b6951`](https://github.com/portabletext/editor/commit/13b6951bd126c4be2be96eee399f42ac70aa70b3)]:
  - @portabletext/editor@2.13.7

## 0.0.3

### Patch Changes

- [#1712](https://github.com/portabletext/editor/pull/1712) [`45fb678`](https://github.com/portabletext/editor/commit/45fb67805609171a69d81be643f08f0ac59c71da) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo to ^19.2.0

- Updated dependencies [[`45fb678`](https://github.com/portabletext/editor/commit/45fb67805609171a69d81be643f08f0ac59c71da)]:
  - @portabletext/editor@2.13.6

## 0.0.2

### Patch Changes

- [#1705](https://github.com/portabletext/editor/pull/1705) [`634a6c0`](https://github.com/portabletext/editor/commit/634a6c0ef6135d9b0e7a33654029ff8618b87efc) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency xstate to ^5.22.1

- Updated dependencies [[`634a6c0`](https://github.com/portabletext/editor/commit/634a6c0ef6135d9b0e7a33654029ff8618b87efc)]:
  - @portabletext/editor@2.13.5

## 0.0.1

### Patch Changes

- Updated dependencies [[`c4fd0cd`](https://github.com/portabletext/editor/commit/c4fd0cd273cb95e1d5769514c730cf9397dc279f), [`fe04fee`](https://github.com/portabletext/editor/commit/fe04fee1fa6cd2b30e83cd07313536a268ea3eed)]:
  - @portabletext/editor@2.13.4
