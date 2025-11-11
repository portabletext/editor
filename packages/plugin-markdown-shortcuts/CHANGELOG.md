# Changelog

## 3.0.8

### Patch Changes

- Updated dependencies [[`3e12791`](https://github.com/portabletext/editor/commit/3e12791fb73989811b411ace6a3d4161b984959f), [`46b5503`](https://github.com/portabletext/editor/commit/46b5503806ce8435fb55ead3a901b41581ac5631)]:
  - @portabletext/editor@2.21.1
  - @portabletext/plugin-character-pair-decorator@3.0.7
  - @portabletext/plugin-input-rule@0.6.1

## 3.0.7

### Patch Changes

- Updated dependencies [[`b32abfc`](https://github.com/portabletext/editor/commit/b32abfc202bdc1c27d40a99258fa13bd32cde7a4)]:
  - @portabletext/plugin-input-rule@0.6.0

## 3.0.6

### Patch Changes

- Updated dependencies [[`746acd3`](https://github.com/portabletext/editor/commit/746acd3a64cd8d05ee171e069f2a20c35a4e1ccf), [`9a98716`](https://github.com/portabletext/editor/commit/9a987169735f6ec97d916cf4ed0ea4f1da48dd72)]:
  - @portabletext/editor@2.21.0
  - @portabletext/plugin-character-pair-decorator@3.0.6
  - @portabletext/plugin-input-rule@0.5.7

## 3.0.5

### Patch Changes

- Updated dependencies [[`d1abdbc`](https://github.com/portabletext/editor/commit/d1abdbc4cb7aef5922086e3bd446ec7b24663343), [`2b87d38`](https://github.com/portabletext/editor/commit/2b87d387ee39f12202bcae3a1d7e82a7fc3729b9), [`f4021e5`](https://github.com/portabletext/editor/commit/f4021e53f862686bcaac087c2ff1a7033a797d04)]:
  - @portabletext/editor@2.20.0
  - @portabletext/plugin-character-pair-decorator@3.0.5
  - @portabletext/plugin-input-rule@0.5.6

## 3.0.4

### Patch Changes

- Updated dependencies [[`c0075a3`](https://github.com/portabletext/editor/commit/c0075a34e2d17a2616461ac6789daf52740926c1), [`e868069`](https://github.com/portabletext/editor/commit/e868069c8eab8e803e0da6d7a9376001f4a7363f)]:
  - @portabletext/editor@2.19.3
  - @portabletext/plugin-character-pair-decorator@3.0.4
  - @portabletext/plugin-input-rule@0.5.5

## 3.0.3

### Patch Changes

- [#1844](https://github.com/portabletext/editor/pull/1844) [`dd80369`](https://github.com/portabletext/editor/commit/dd80369dcb68b1d6910828a90a8ce5bf3e5fb5d6) Thanks [@stipsan](https://github.com/stipsan)! - fix: add support for react 18

- Updated dependencies [[`dd80369`](https://github.com/portabletext/editor/commit/dd80369dcb68b1d6910828a90a8ce5bf3e5fb5d6)]:
  - @portabletext/plugin-character-pair-decorator@3.0.3
  - @portabletext/plugin-input-rule@0.5.4
  - @portabletext/editor@2.19.2

## 3.0.2

### Patch Changes

- Updated dependencies [[`b669b14`](https://github.com/portabletext/editor/commit/b669b14cc70a12c22a0726bc8e1cb31e336acdbc)]:
  - @portabletext/editor@2.19.1
  - @portabletext/plugin-character-pair-decorator@3.0.2
  - @portabletext/plugin-input-rule@0.5.3

## 3.0.1

### Patch Changes

- [#1836](https://github.com/portabletext/editor/pull/1836) [`4af5f6b`](https://github.com/portabletext/editor/commit/4af5f6bd1c845840c44c6d449ad67c36a050f7e6) Thanks [@christianhg](https://github.com/christianhg)! - fix: make APIs backwards compatible with previous major version

- Updated dependencies [[`550b51a`](https://github.com/portabletext/editor/commit/550b51a35d5c257ef9e15d48c1c36d1492dd6a2c)]:
  - @portabletext/plugin-character-pair-decorator@3.0.1

## 3.0.0

### Major Changes

- [#1830](https://github.com/portabletext/editor/pull/1830) [`a90da35`](https://github.com/portabletext/editor/commit/a90da350e37cca38429346bad2d78c11d00b6079) Thanks [@christianhg](https://github.com/christianhg)! - feat: allow specifying actual object types for link and horizontal rule

- [#1832](https://github.com/portabletext/editor/pull/1832) [`10e282b`](https://github.com/portabletext/editor/commit/10e282bac9f196a64f469feb6eeeae3e6c021722) Thanks [@christianhg](https://github.com/christianhg)! - feat: align schema matcher callbacks

  Schema matcher callbacks now consistently receive an object with a distinct `context` property and an optional `props` property:

  **Before:**

  ```ts
  <MarkdownShortcutsPlugin
    linkObject={(context, props) => {
      const schemaType = context.schema.annotations.find(
        (annotation) => annotation.name === 'link',
      )
      const hrefField = schemaType?.fields.find(
        (field) =>
          field.name === 'href' && field.type === 'string',
      )

      if (!schemaType || !hrefField) {
        return undefined
      }

      return {
        _type: schemaType.name,
        [hrefField.name]: props.href,
      }
    }}
  />
  ```

  **After:**

  ```ts
  <MarkdownShortcutsPlugin
    linkObject={({context, props}) => {
      const schemaType = context.schema.annotations.find(
        (annotation) => annotation.name === 'link',
      )
      const hrefField = schemaType?.fields.find(
        (field) =>
          field.name === 'href' && field.type === 'string',
      )

      if (!schemaType || !hrefField) {
        return undefined
      }

      return {
        _type: schemaType.name,
        [hrefField.name]: props.href,
      }
    }}
  />
  ```

### Minor Changes

- [#1830](https://github.com/portabletext/editor/pull/1830) [`808eaa6`](https://github.com/portabletext/editor/commit/808eaa6d14f48d201cb3f07a0721818d643992fd) Thanks [@christianhg](https://github.com/christianhg)! - feat: mark APIs as public

### Patch Changes

- [#1832](https://github.com/portabletext/editor/pull/1832) [`f41b3bd`](https://github.com/portabletext/editor/commit/f41b3bd22a5e3a7e9cb68607d4076e8662dce7a8) Thanks [@christianhg](https://github.com/christianhg)! - fix: allow composing with other Behaviors

- Updated dependencies [[`10e282b`](https://github.com/portabletext/editor/commit/10e282bac9f196a64f469feb6eeeae3e6c021722), [`d860a49`](https://github.com/portabletext/editor/commit/d860a49d4eab6817da5eed56c7b27bbe9f2fb070), [`90a924f`](https://github.com/portabletext/editor/commit/90a924fddd7ba6298ce053fac638a3dae11ea638), [`ae4fd2c`](https://github.com/portabletext/editor/commit/ae4fd2cc37b87d26f2db7a09c20c41486c88ace8)]:
  - @portabletext/plugin-character-pair-decorator@3.0.0
  - @portabletext/editor@2.19.0
  - @portabletext/plugin-input-rule@0.5.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`b4c729c`](https://github.com/portabletext/editor/commit/b4c729cfaa4429c6de8e50ece79e6da2175a5e35), [`5e5d349`](https://github.com/portabletext/editor/commit/5e5d349f9d45dd472fa69820d20067b3020a03bb)]:
  - @portabletext/editor@2.18.1
  - @portabletext/plugin-character-pair-decorator@2.0.1
  - @portabletext/plugin-input-rule@0.5.1

## 2.0.0

### Major Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Require node v20.19 or later, or v22.12 or later

### Minor Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Remove CJS exports, this package is now ESM-only

### Patch Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade @sanity/pkg-utils to v9

- Updated dependencies [[`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e7f0d69`](https://github.com/portabletext/editor/commit/e7f0d6993abbdf2a6aeecad22bab970c0810eca1), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89)]:
  - @portabletext/plugin-character-pair-decorator@2.0.0
  - @portabletext/plugin-input-rule@0.5.0
  - @portabletext/editor@2.18.0

## 1.4.15

### Patch Changes

- Updated dependencies [[`ab4ac2d`](https://github.com/portabletext/editor/commit/ab4ac2d5dd29c65cdab7c328bdae70665d36bb9e)]:
  - @portabletext/editor@2.17.2
  - @portabletext/plugin-character-pair-decorator@1.1.18
  - @portabletext/plugin-input-rule@0.4.4

## 1.4.14

### Patch Changes

- [#1798](https://github.com/portabletext/editor/pull/1798) [`78c8470`](https://github.com/portabletext/editor/commit/78c847010e262c7e1755d6c143a614dcd8a4d9ab) Thanks [@christianhg](https://github.com/christianhg)! - fix: make markdown link shortcut RegExp less greedy

- Updated dependencies [[`5beedd2`](https://github.com/portabletext/editor/commit/5beedd2778149a70e5e6464c28da8e31d9bef3ac), [`fdac1f0`](https://github.com/portabletext/editor/commit/fdac1f0f5fc264dff703b0b6e814e407964004ad)]:
  - @portabletext/editor@2.17.1
  - @portabletext/plugin-character-pair-decorator@1.1.17
  - @portabletext/plugin-input-rule@0.4.3

## 1.4.13

### Patch Changes

- Updated dependencies [[`5442326`](https://github.com/portabletext/editor/commit/5442326569c145a0c146d2523f99ca245bf92623)]:
  - @portabletext/editor@2.17.0
  - @portabletext/plugin-character-pair-decorator@1.1.16
  - @portabletext/plugin-input-rule@0.4.2

## 1.4.12

### Patch Changes

- Updated dependencies [[`9aee71a`](https://github.com/portabletext/editor/commit/9aee71a463dbcaadc0037170addb23f28ba40250), [`5f4cac4`](https://github.com/portabletext/editor/commit/5f4cac440d766cf8415e7392dc9f72e6327fdb8c), [`31f61c4`](https://github.com/portabletext/editor/commit/31f61c49607b141a1500e5ec3b9703e7cdf1786c), [`db80acc`](https://github.com/portabletext/editor/commit/db80acc5a189d45069d30b4bfc98c42d8ff88f67), [`dc886f5`](https://github.com/portabletext/editor/commit/dc886f586c9f0d70a5650e438a0407366a5e60a6)]:
  - @portabletext/editor@2.16.0
  - @portabletext/plugin-character-pair-decorator@1.1.15
  - @portabletext/plugin-input-rule@0.4.1

## 1.4.11

### Patch Changes

- Updated dependencies [[`e7c0e93`](https://github.com/portabletext/editor/commit/e7c0e932937f2f4c1c0e1fb01ff06099bc805aa6), [`6ceff3f`](https://github.com/portabletext/editor/commit/6ceff3fb5b2fb8eac06a6ed2f7ac873beb0d5064)]:
  - @portabletext/plugin-input-rule@0.4.0

## 1.4.10

### Patch Changes

- Updated dependencies [[`75b4c38`](https://github.com/portabletext/editor/commit/75b4c38be8b82aaa9d6f86ba97ba551ee2a83255)]:
  - @portabletext/editor@2.15.5
  - @portabletext/plugin-character-pair-decorator@1.1.14
  - @portabletext/plugin-input-rule@0.3.11

## 1.4.9

### Patch Changes

- Updated dependencies [[`851cad1`](https://github.com/portabletext/editor/commit/851cad1a5e77ff4f069f1882e5a147b461e9e04a)]:
  - @portabletext/editor@2.15.4
  - @portabletext/plugin-character-pair-decorator@1.1.13
  - @portabletext/plugin-input-rule@0.3.10

## 1.4.8

### Patch Changes

- Updated dependencies [[`777b61b`](https://github.com/portabletext/editor/commit/777b61ba6c25f6a543e1a3111ad8978072999b3e)]:
  - @portabletext/editor@2.15.3
  - @portabletext/plugin-character-pair-decorator@1.1.12
  - @portabletext/plugin-input-rule@0.3.9

## 1.4.7

### Patch Changes

- Updated dependencies [[`e84f3e5`](https://github.com/portabletext/editor/commit/e84f3e5c3070044692a7bfaa40481c79e40a4893), [`84247b1`](https://github.com/portabletext/editor/commit/84247b1efcbaf61aa16e0d76b1079a8405dde82b), [`86b46a4`](https://github.com/portabletext/editor/commit/86b46a469c2afc1b1795aab28f5f85420a87fb59), [`fac8c2e`](https://github.com/portabletext/editor/commit/fac8c2eedea8c3fdd1f3fa496663d172b4de18f4)]:
  - @portabletext/editor@2.15.2
  - @portabletext/plugin-character-pair-decorator@1.1.11
  - @portabletext/plugin-input-rule@0.3.8

## 1.4.6

### Patch Changes

- Updated dependencies [[`657f0e1`](https://github.com/portabletext/editor/commit/657f0e13138f51f1c8aa5a249b9c2ffa0fe0fb65), [`73c1f43`](https://github.com/portabletext/editor/commit/73c1f43d13f1adf8aad8db03597e4e858a3a41e2)]:
  - @portabletext/editor@2.15.1
  - @portabletext/plugin-character-pair-decorator@1.1.10
  - @portabletext/plugin-input-rule@0.3.7

## 1.4.5

### Patch Changes

- Updated dependencies [[`f9b0849`](https://github.com/portabletext/editor/commit/f9b0849c4cf5de298fb8133230d9d14ff780e25d), [`79e3e98`](https://github.com/portabletext/editor/commit/79e3e983fae9eb3106d7741d877ff99a76d7fde5), [`36615f3`](https://github.com/portabletext/editor/commit/36615f3c42805434e5e597587a4c1e2fac73c75e)]:
  - @portabletext/editor@2.15.0
  - @portabletext/plugin-input-rule@0.3.6
  - @portabletext/plugin-character-pair-decorator@1.1.9

## 1.4.4

### Patch Changes

- Updated dependencies [[`258768f`](https://github.com/portabletext/editor/commit/258768f5b7c2791c5c05e7c29649774809324dac)]:
  - @portabletext/plugin-character-pair-decorator@1.1.8

## 1.4.3

### Patch Changes

- [#1745](https://github.com/portabletext/editor/pull/1745) [`82bb94d`](https://github.com/portabletext/editor/commit/82bb94d998445f0b79c215d6ab1f3eed56c020fc) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade React Compiler to v1

- Updated dependencies [[`9d6cfdb`](https://github.com/portabletext/editor/commit/9d6cfdbe3fc67d88113da7f73b408f3185ddabef), [`82bb94d`](https://github.com/portabletext/editor/commit/82bb94d998445f0b79c215d6ab1f3eed56c020fc), [`a8a3fad`](https://github.com/portabletext/editor/commit/a8a3faddb5217fde30df34bd175e99e709983ff6)]:
  - @portabletext/editor@2.14.4
  - @portabletext/plugin-character-pair-decorator@1.1.7
  - @portabletext/plugin-input-rule@0.3.5

## 1.4.2

### Patch Changes

- Updated dependencies [[`54f57e3`](https://github.com/portabletext/editor/commit/54f57e3e85cc5544c5d18881c393957218ffb34a)]:
  - @portabletext/editor@2.14.3
  - @portabletext/plugin-character-pair-decorator@1.1.6
  - @portabletext/plugin-input-rule@0.3.4

## 1.4.1

### Patch Changes

- [#1737](https://github.com/portabletext/editor/pull/1737) [`dac0d17`](https://github.com/portabletext/editor/commit/dac0d1728c2bcbe2913f1f769a6133427bd7c2b8) Thanks [@christianhg](https://github.com/christianhg)! - fix(perf): optimise `MarkdownShortcutsPlugin`

- Updated dependencies [[`7eab00e`](https://github.com/portabletext/editor/commit/7eab00ee9b1f1186fdac76210daa1953edc2847c)]:
  - @portabletext/editor@2.14.2
  - @portabletext/plugin-character-pair-decorator@1.1.5
  - @portabletext/plugin-input-rule@0.3.3

## 1.4.0

### Minor Changes

- [#1735](https://github.com/portabletext/editor/pull/1735) [`f8ae10e`](https://github.com/portabletext/editor/commit/f8ae10e6f2b2b998f59975600f1a715652379d38) Thanks [@christianhg](https://github.com/christianhg)! - feat: add link shortcut

### Patch Changes

- [#1735](https://github.com/portabletext/editor/pull/1735) [`f1adeda`](https://github.com/portabletext/editor/commit/f1adeda3d6d6c6486c66d2413d2db7451d342e89) Thanks [@christianhg](https://github.com/christianhg)! - fix: adjust @portabletext/plugin-input-rule semver range

## 1.3.1

### Patch Changes

- Updated dependencies [[`3099c65`](https://github.com/portabletext/editor/commit/3099c65dc00bb6b2b117185134ce5477f94009d3)]:
  - @portabletext/plugin-input-rule@0.3.2

## 1.3.0

### Minor Changes

- [#1731](https://github.com/portabletext/editor/pull/1731) [`dc3e528`](https://github.com/portabletext/editor/commit/dc3e5287f6850fd6746b6416ffeb7fcbfcdbcd9f) Thanks [@christianhg](https://github.com/christianhg)! - feat: rewrite Behaviors as Input Rules

  This greatly simplifies the code and makes the markdown shortcuts more robust,
  especially on mobile.

### Patch Changes

- [#1731](https://github.com/portabletext/editor/pull/1731) [`30c90f4`](https://github.com/portabletext/editor/commit/30c90f455917ced77883e01b3731cb27013c7637) Thanks [@christianhg](https://github.com/christianhg)! - fix: preserve list level if present

  When toggling an ordered or unordered list, the existing `level` of the text
  block is now preserved if present.

- Updated dependencies [[`13a2c63`](https://github.com/portabletext/editor/commit/13a2c6337cc48773fe84baaa5f6ddbbc9502b683), [`0e90027`](https://github.com/portabletext/editor/commit/0e90027a750c49f0dfa1273b26b367fbbc20f59c), [`4041334`](https://github.com/portabletext/editor/commit/4041334f4474b00b275f94532e4baddcc1b906ab), [`3af9410`](https://github.com/portabletext/editor/commit/3af9410dfdedf51fccc66ba6e060713f09fa9d31)]:
  - @portabletext/editor@2.14.1
  - @portabletext/plugin-input-rule@0.3.1
  - @portabletext/plugin-character-pair-decorator@1.1.4

## 1.2.0

### Minor Changes

- [#1727](https://github.com/portabletext/editor/pull/1727) [`957746a`](https://github.com/portabletext/editor/commit/957746ab4f5ac76c54cae27567ad127e41f60c87) Thanks [@christianhg](https://github.com/christianhg)! - feat: allow `"—-"` to match a horizontal rule

### Patch Changes

- Updated dependencies [[`bb10e48`](https://github.com/portabletext/editor/commit/bb10e48d0f3bc6373ce3280cdebdbf00f130d32b), [`ede0ba7`](https://github.com/portabletext/editor/commit/ede0ba71f49210096d133048501726d2348ac90f)]:
  - @portabletext/plugin-input-rule@0.3.0

## 1.1.4

### Patch Changes

- [`8d44f0a`](https://github.com/portabletext/editor/commit/8d44f0af8a19784f7f8f41414b64e999c919dd2f) Thanks [@christianhg](https://github.com/christianhg)! - fix: @portabletext/editor dependency

## 1.1.3

### Patch Changes

- [#1722](https://github.com/portabletext/editor/pull/1722) [`b7c1e14`](https://github.com/portabletext/editor/commit/b7c1e14ca63990adf2cec0fb858fd9170ae86518) Thanks [@christianhg](https://github.com/christianhg)! - fix: move plugin to editor repository

- Updated dependencies [[`b7c1e14`](https://github.com/portabletext/editor/commit/b7c1e14ca63990adf2cec0fb858fd9170ae86518)]:
  - @portabletext/plugin-character-pair-decorator@1.1.3

## 1.1.2

### Patch Changes

- [#100](https://github.com/portabletext/plugins/pull/100) [`afc2ce0`](https://github.com/portabletext/plugins/commit/afc2ce0047bc66fe84adb6324efddc5fea182a71) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- Updated dependencies [[`afc2ce0`](https://github.com/portabletext/plugins/commit/afc2ce0047bc66fe84adb6324efddc5fea182a71)]:
  - @portabletext/plugin-character-pair-decorator@1.1.2

## 1.1.1

### Patch Changes

- [#102](https://github.com/portabletext/plugins/pull/102) [`a0371f1`](https://github.com/portabletext/plugins/commit/a0371f122f95a3bb38907230c53ee5f2c559dd18) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @portabletext/editor to ^2.6.9

- [`b3018a8`](https://github.com/portabletext/plugins/commit/b3018a83ed088942cd42317074732b4e7bd580c0) Thanks [@stipsan](https://github.com/stipsan)! - Improve memoization in markdown plugin

- Updated dependencies [[`a0371f1`](https://github.com/portabletext/plugins/commit/a0371f122f95a3bb38907230c53ee5f2c559dd18), [`44ef52c`](https://github.com/portabletext/plugins/commit/44ef52cc2102c81b075c887ac2686dabaf2f8ac7)]:
  - @portabletext/plugin-character-pair-decorator@1.1.1

## 1.1.0

### Minor Changes

- [`909b379`](https://github.com/portabletext/plugins/commit/909b379df26d9c0dfc59dc9ede21e80a163f0a03) Thanks [@stipsan](https://github.com/stipsan)! - add react compiler

### Patch Changes

- Updated dependencies [[`909b379`](https://github.com/portabletext/plugins/commit/909b379df26d9c0dfc59dc9ede21e80a163f0a03)]:
  - @portabletext/plugin-character-pair-decorator@1.1.0

## 1.0.16

### Patch Changes

- [#92](https://github.com/portabletext/plugins/pull/92) [`2a4179a`](https://github.com/portabletext/plugins/commit/2a4179a5d76028180f722fd126aa4c41503d10f5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @portabletext/editor to ^2.4.1

- Updated dependencies [[`2a4179a`](https://github.com/portabletext/plugins/commit/2a4179a5d76028180f722fd126aa4c41503d10f5)]:
  - @portabletext/plugin-character-pair-decorator@1.0.17

## [1.0.15](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.14...plugin-markdown-shortcuts-v1.0.15) (2025-08-20)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.58.0 ([a5f36da](https://github.com/portabletext/plugins/commit/a5f36dac0dc2cd6fcfa5c1d5a257226a5ee4ffbd))
- **deps:** update dependency @portabletext/editor to ^2.1.11 ([cf70d4f](https://github.com/portabletext/plugins/commit/cf70d4f7348339b89fd20f64798a0cb6966847d8))
- **deps:** update dependency @portabletext/editor to v2 ([52841e5](https://github.com/portabletext/plugins/commit/52841e5beea4a906bd0659c816c3269660110e9b))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.16

## [1.0.14](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.13...plugin-markdown-shortcuts-v1.0.14) (2025-07-02)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.55.12 ([2eecd58](https://github.com/portabletext/plugins/commit/2eecd58d618e21ffcf73762439a7fc03d57b0ed5))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.15

## [1.0.13](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.12...plugin-markdown-shortcuts-v1.0.13) (2025-07-01)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.55.11 ([aa47a1e](https://github.com/portabletext/plugins/commit/aa47a1eb87956780825b2be36d2d26dd3db68f17))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.14

## [1.0.12](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.11...plugin-markdown-shortcuts-v1.0.12) (2025-06-23)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.55.0 ([da3e8dd](https://github.com/portabletext/plugins/commit/da3e8ddbe4c620d53e52c91b4903d9709a8f04e3))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.13

## [1.0.11](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.10...plugin-markdown-shortcuts-v1.0.11) (2025-06-19)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.52.8 ([760d9c4](https://github.com/portabletext/plugins/commit/760d9c471a69c4465b0e6e3b7fe3c69987f39ab1))
- **deps:** update dependency @portabletext/editor to ^1.54.0 ([315def2](https://github.com/portabletext/plugins/commit/315def2633aa6171012f5faf26ab3f6df96f598d))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.12

## [1.0.10](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.9...plugin-markdown-shortcuts-v1.0.10) (2025-06-13)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.52.7 ([e3d31d9](https://github.com/portabletext/plugins/commit/e3d31d93a5e801c6cd0f1d12d00c789e419d5043))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.11

## [1.0.9](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.8...plugin-markdown-shortcuts-v1.0.9) (2025-06-04)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.50.8 ([e5b925c](https://github.com/portabletext/plugins/commit/e5b925cae8b0ba4eb4f51146f0bfacea5c07d063))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.10

## [1.0.8](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.7...plugin-markdown-shortcuts-v1.0.8) (2025-05-27)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.50.7 ([83d7330](https://github.com/portabletext/plugins/commit/83d7330cb5ce6e69713ce7255412f70f0e2ca321))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.9

## [1.0.7](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.6...plugin-markdown-shortcuts-v1.0.7) (2025-05-17)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.50.2 ([f99057e](https://github.com/portabletext/plugins/commit/f99057e55f6b3f2c4ba54beb268a6d8270a52e48))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.8

## [1.0.6](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.5...plugin-markdown-shortcuts-v1.0.6) (2025-05-05)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.48.15 ([011ed21](https://github.com/portabletext/plugins/commit/011ed21c5e16141543544f612c8c1df797d51014))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.7

## [1.0.5](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.4...plugin-markdown-shortcuts-v1.0.5) (2025-05-03)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.48.13 ([c982189](https://github.com/portabletext/plugins/commit/c982189d0d06e15a4b23b511f7da7b9c854e6d64))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.6

## [1.0.4](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.3...plugin-markdown-shortcuts-v1.0.4) (2025-05-02)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.48.11 ([8e448ce](https://github.com/portabletext/plugins/commit/8e448ce8d898cab85f114c8bbbeea371d8820c0b))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.5

## [1.0.3](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.2...plugin-markdown-shortcuts-v1.0.3) (2025-05-01)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.48.9 ([2a5d8b3](https://github.com/portabletext/plugins/commit/2a5d8b304bcc84a619864f003bb952fc807af327))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.4

## [1.0.2](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.1...plugin-markdown-shortcuts-v1.0.2) (2025-05-01)

### Bug Fixes

- **deps:** update dependency @portabletext/editor to ^1.48.8 ([e58c7d0](https://github.com/portabletext/plugins/commit/e58c7d0d7672bd71b3228d25017353099a5cc527))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.3

## [1.0.1](https://github.com/portabletext/plugins/compare/plugin-markdown-shortcuts-v1.0.0...plugin-markdown-shortcuts-v1.0.1) (2025-05-01)

### Bug Fixes

- **deps:** upgrade @portabletext/editor ([03fd19d](https://github.com/portabletext/plugins/commit/03fd19dca833e83ed3c747f217fd54df8cf1af39))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.2

## 1.0.0 (2025-05-01)

### Features

- introduce @portabletext/plugin-markdown-shortcuts ([3b1e3b0](https://github.com/portabletext/plugins/commit/3b1e3b05160033431e9b1429c45f935780c2b518))

### Bug Fixes

- **deps:** upgrade @portabletext/editor ([5b1c854](https://github.com/portabletext/plugins/commit/5b1c8547ef2c18e004682d1dacfd8bfd25483274))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/plugin-character-pair-decorator bumped to 1.0.1
