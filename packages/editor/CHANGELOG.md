# Changelog

## [1.48.5](https://github.com/portabletext/editor/compare/editor-v1.48.4...editor-v1.48.5) (2025-04-30)


### Bug Fixes

* **behaviors:** prevent native events on `execute` ([90dc13b](https://github.com/portabletext/editor/commit/90dc13bdcd67ebd325d3c978b0c7ac11509f845f))

## [1.48.4](https://github.com/portabletext/editor/compare/editor-v1.48.3...editor-v1.48.4) (2025-04-30)


### Bug Fixes

* **deps:** upgrade to react compiler RC ([#1112](https://github.com/portabletext/editor/issues/1112)) ([3229149](https://github.com/portabletext/editor/commit/3229149fd065ba2d8e3591b44dd584282424bd39))

## [1.48.3](https://github.com/portabletext/editor/compare/editor-v1.48.2...editor-v1.48.3) (2025-04-30)


### Bug Fixes

* **deps:** update dependency slate-dom to ^0.114.0 ([0126134](https://github.com/portabletext/editor/commit/012613406b34ca9cd869a116e858722e1423e573))
* **deps:** update sanity monorepo to ^3.87.0 ([facf2cf](https://github.com/portabletext/editor/commit/facf2cf6a0451788f4d5be7cbcc40ce4e7fe5a00))
* **deps:** Update slate to v0.114.0 ([7676255](https://github.com/portabletext/editor/commit/7676255cfbc838354945753e3c54d757afe77cf0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.22

## [1.48.2](https://github.com/portabletext/editor/compare/editor-v1.48.1...editor-v1.48.2) (2025-04-28)


### Bug Fixes

* **behaviors:** prevent native events in all cases except `forward` ([642f75b](https://github.com/portabletext/editor/commit/642f75b2f93d4f50b3336a3f5bc4754bbd34bb54))

## [1.48.1](https://github.com/portabletext/editor/compare/editor-v1.48.0...editor-v1.48.1) (2025-04-28)


### Bug Fixes

* **one-line plugin:** avoid reducing empty array ([22111cb](https://github.com/portabletext/editor/commit/22111cbc4762ccfaab7c2fea236ea559531d9cf5))

## [1.48.0](https://github.com/portabletext/editor/compare/editor-v1.47.15...editor-v1.48.0) (2025-04-28)


### Features

* **behaviors:** simplify event propagation by introducing `forward(event)` ([10d37ba](https://github.com/portabletext/editor/commit/10d37ba3e54c845a718232087f22940e9f2e1444))

## [1.47.15](https://github.com/portabletext/editor/compare/editor-v1.47.14...editor-v1.47.15) (2025-04-25)


### Bug Fixes

* provide `Editor` from a global Context ([15f8c42](https://github.com/portabletext/editor/commit/15f8c4281d8eb70ce3e2e21dd878950c5a637dd2))

## [1.47.14](https://github.com/portabletext/editor/compare/editor-v1.47.13...editor-v1.47.14) (2025-04-24)


### Bug Fixes

* **`insert.blocks`:** allow omission of block `_key`s ([8f7c2cb](https://github.com/portabletext/editor/commit/8f7c2cb5646a5abbcee6ab8769a6908a93af1da4))
* **deps:** update sanity monorepo to ^3.86.1 ([7161552](https://github.com/portabletext/editor/commit/7161552c1d9b9d274dc884d93553fb069ba0f3f5))
* hide the concept of "abstract" events from debug logs ([9a46656](https://github.com/portabletext/editor/commit/9a4665616923876a9f59645aeb7e9816950f0201))
* log if synthetic or custom events were raised or executed ([d32bdad](https://github.com/portabletext/editor/commit/d32bdada0f9a67b20b91f7096c8af5b20cc1ff9e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.21

## [1.47.13](https://github.com/portabletext/editor/compare/editor-v1.47.12...editor-v1.47.13) (2025-04-23)


### Bug Fixes

* **behaviors:** disallow `execute` of Custom Events ([3d35d28](https://github.com/portabletext/editor/commit/3d35d282d623140b87b1ea220aedcd562c1aadc0))
* **behaviors:** hide the concept of Abstract Events ([a2035de](https://github.com/portabletext/editor/commit/a2035de5ba861370c3a419a4e357b6a5a47788d2))
* **deps:** update sanity monorepo to ^3.86.0 ([8c0c285](https://github.com/portabletext/editor/commit/8c0c28559f3ca634c8a4b94d88b42789dd831ac7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.20

## [1.47.12](https://github.com/portabletext/editor/compare/editor-v1.47.11...editor-v1.47.12) (2025-04-22)


### Bug Fixes

* **`insert.block`:** issues with inserting on expanded selection ([890e30c](https://github.com/portabletext/editor/commit/890e30c7df83c2b7ea1b249f3bbea709ee820702))
* **behaviors:** define 'breaking entire content' as a Core Behavior ([8be9b52](https://github.com/portabletext/editor/commit/8be9b52127b02d864ea0744f39f35a74948ffd3b))
* **behaviors:** rename `split.block` to `split` ([8668142](https://github.com/portabletext/editor/commit/86681420c48be88a65175820b40d4bb16006aaa4))
* ensure corrent selection when breaking entire-block selection ([cc45d25](https://github.com/portabletext/editor/commit/cc45d258fb8834681c4c0436ca5857bff01d9c50))
* **one-line plugin:** remove unneeded `split` Behavior ([28102f2](https://github.com/portabletext/editor/commit/28102f2f0e7e0b88e69390f9d926e858cc70ee90))

## [1.47.11](https://github.com/portabletext/editor/compare/editor-v1.47.10...editor-v1.47.11) (2025-04-21)


### Bug Fixes

* **behaviors:** turn `split.block` into an Abstract Event ([0b83080](https://github.com/portabletext/editor/commit/0b83080cc69f24c8ea15a54f6acefae83aa0ec99))

## [1.47.10](https://github.com/portabletext/editor/compare/editor-v1.47.9...editor-v1.47.10) (2025-04-19)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.2.4

## [1.47.9](https://github.com/portabletext/editor/compare/editor-v1.47.8...editor-v1.47.9) (2025-04-18)


### Bug Fixes

* mitigate range decoration runtime errors ([432a792](https://github.com/portabletext/editor/commit/432a792e2fcdfa9cd5ce47799a923a3bf60e9983))

## [1.47.8](https://github.com/portabletext/editor/compare/editor-v1.47.7...editor-v1.47.8) (2025-04-16)


### Bug Fixes

* avoid potentially splitting placeholder ([2a27d1b](https://github.com/portabletext/editor/commit/2a27d1ba4109b893edb6addc6a7d147621a8c8b4))

## [1.47.7](https://github.com/portabletext/editor/compare/editor-v1.47.6...editor-v1.47.7) (2025-04-16)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.85.1 ([2aa02fc](https://github.com/portabletext/editor/commit/2aa02fc54643839815964d14bdb76b599d9a4315))
* simplify and memo `internalEditor` setup ([fdb0a82](https://github.com/portabletext/editor/commit/fdb0a8238354e833a7508666958787f0d4bea827))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.19

## [1.47.6](https://github.com/portabletext/editor/compare/editor-v1.47.5...editor-v1.47.6) (2025-04-15)


### Bug Fixes

* **block parsing:** strip unknown fields from spans ([4c05295](https://github.com/portabletext/editor/commit/4c052950d6648621499d1711e80957d59c5e4033))
* **block parsing:** strip unknown fields from text blocks ([1c5daa8](https://github.com/portabletext/editor/commit/1c5daa823d36e7a4a6a7606c3ea5130e1cccd2c2))

## [1.47.5](https://github.com/portabletext/editor/compare/editor-v1.47.4...editor-v1.47.5) (2025-04-14)


### Bug Fixes

* **revert:** add back initial focus selection ([1fa3262](https://github.com/portabletext/editor/commit/1fa3262490df9eb057353377b879cbe1832b21c9))

## [1.47.4](https://github.com/portabletext/editor/compare/editor-v1.47.3...editor-v1.47.4) (2025-04-14)


### Bug Fixes

* **behaviors:** make all default actions go through `performAction` ([da9ede4](https://github.com/portabletext/editor/commit/da9ede4eabb75eee8d4086aba20cfbdfafce8c3e))
* don't call `onChange` during normalization ([b9721bd](https://github.com/portabletext/editor/commit/b9721bd62ace47ae7a8944a47bb17dcd18fa5781))
* handle `blur`/`focus` events outside Behaviors ([f7ee633](https://github.com/portabletext/editor/commit/f7ee633b43eb097fa74759a7f0c923512be8dd01))

## [1.47.3](https://github.com/portabletext/editor/compare/editor-v1.47.2...editor-v1.47.3) (2025-04-14)


### Bug Fixes

* emit selection *after* focus ([94f1563](https://github.com/portabletext/editor/commit/94f156332569796932528487c013bc1b01b8875c))

## [1.47.2](https://github.com/portabletext/editor/compare/editor-v1.47.1...editor-v1.47.2) (2025-04-14)


### Bug Fixes

* **editable:** simplify schema access ([60bc14f](https://github.com/portabletext/editor/commit/60bc14fec2afbe372b4eac36f78f915f25fd5579))

## [1.47.1](https://github.com/portabletext/editor/compare/editor-v1.47.0...editor-v1.47.1) (2025-04-11)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.84.0 ([e714ae6](https://github.com/portabletext/editor/commit/e714ae6c7bc4d89c30274b47fe631b19e76f71bb))
* simplify `EditorSchema` ([b07d32d](https://github.com/portabletext/editor/commit/b07d32d2f9de599327137285dd965958c2b79ba1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.18

## [1.47.0](https://github.com/portabletext/editor/compare/editor-v1.46.0...editor-v1.47.0) (2025-04-10)


### Features

* **behaviors:** add `move.backward` and `move.forward` events ([0f77f47](https://github.com/portabletext/editor/commit/0f77f476a12edb05879512a3517110517736b2a3))

## [1.46.0](https://github.com/portabletext/editor/compare/editor-v1.45.4...editor-v1.46.0) (2025-04-09)


### Features

* **behaviors:** replace Synthetic Event Actions with `execute(...)` ([08300ec](https://github.com/portabletext/editor/commit/08300ec3d3104e8776e20e96b4895f9bcba65f5a))

## [1.45.4](https://github.com/portabletext/editor/compare/editor-v1.45.3...editor-v1.45.4) (2025-04-09)


### Bug Fixes

* **behaviors:** provide each action set with a new snapshot ([655634e](https://github.com/portabletext/editor/commit/655634e2f31d9b2f3dae87b8f26f05a7ffc88ef8))
* **behaviors:** remove deprecated `context` ([b7445e9](https://github.com/portabletext/editor/commit/b7445e943109ffa702872ba7c73177b8eed99cc9))

## [1.45.3](https://github.com/portabletext/editor/compare/editor-v1.45.2...editor-v1.45.3) (2025-04-08)


### Bug Fixes

* avoid fields with `undefined` values on objects ([313b46e](https://github.com/portabletext/editor/commit/313b46e7c805aafbe2cb7d8117490a7c7df55a55))
* **deps:** update sanity monorepo to ^3.83.0 ([0b67d87](https://github.com/portabletext/editor/commit/0b67d8780b680960c6bcf0f651ae9aa97e27c356))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.17

## [1.45.2](https://github.com/portabletext/editor/compare/editor-v1.45.1...editor-v1.45.2) (2025-04-08)


### Bug Fixes

* allow `insert.text` without a selection ([39d77e1](https://github.com/portabletext/editor/commit/39d77e16c56a04ca8ffae5c182df25731f7b4515))
* turn `delete.text` into an abstract event ([992bbce](https://github.com/portabletext/editor/commit/992bbce514f087f4572ad1800186385d13248e55))

## [1.45.1](https://github.com/portabletext/editor/compare/editor-v1.45.0...editor-v1.45.1) (2025-04-07)


### Bug Fixes

* **markdown behaviors:** fix hr paste regex ([e565043](https://github.com/portabletext/editor/commit/e5650436ccf935e5ee962c6ca336fda6e24190e7))

## [1.45.0](https://github.com/portabletext/editor/compare/editor-v1.44.16...editor-v1.45.0) (2025-04-07)


### Features

* introduce `fields` on schema types defined using `defineSchema` ([eb7a01c](https://github.com/portabletext/editor/commit/eb7a01c3ae26be92c947f6cb83b38f5057a67b35))


### Bug Fixes

* **behaviors:** align and use `at` to specify event location ([c6aa8eb](https://github.com/portabletext/editor/commit/c6aa8eb68f90286795c24e8f285dcf9076983373))

## [1.44.16](https://github.com/portabletext/editor/compare/editor-v1.44.15...editor-v1.44.16) (2025-04-06)


### Bug Fixes

* turn `insert.break` into an abstract event ([40e89d6](https://github.com/portabletext/editor/commit/40e89d64ce3ab8a30f558aec6e955a3842301d30))
* turn `insert.soft break` into an abstract event ([2b6e75d](https://github.com/portabletext/editor/commit/2b6e75d9063536038f07af932178d60afc78e35f))

## [1.44.15](https://github.com/portabletext/editor/compare/editor-v1.44.14...editor-v1.44.15) (2025-04-05)


### Bug Fixes

* **deserialize:** avoid running ignored Converters ([3f3d0f3](https://github.com/portabletext/editor/commit/3f3d0f324d41db8a1fbb948b090d19cdf70908d2))

## [1.44.14](https://github.com/portabletext/editor/compare/editor-v1.44.13...editor-v1.44.14) (2025-04-04)


### Bug Fixes

* parse blocks in `text/html`/`text/plain` converters ([354bef2](https://github.com/portabletext/editor/commit/354bef283ce11dea2efb44ff7b7cd91c94fcb4b2))

## [1.44.13](https://github.com/portabletext/editor/compare/editor-v1.44.12...editor-v1.44.13) (2025-04-04)


### Bug Fixes

* **schema definition:** improve default fields workaround ([6b75a53](https://github.com/portabletext/editor/commit/6b75a537a9eb09a14a3d527b513675a21c0c9928))

## [1.44.12](https://github.com/portabletext/editor/compare/editor-v1.44.11...editor-v1.44.12) (2025-04-03)


### Bug Fixes

* allow `mouse.click` events when read-only ([dde2b41](https://github.com/portabletext/editor/commit/dde2b41b7eaa11dfe5cd7e5a76538e6a1442c928))
* allow ordinary mouse events when no `EventPosition` is found ([54a9480](https://github.com/portabletext/editor/commit/54a9480ef822332065b872c828eca6824494ccc9))
* **clipboard.copy:** read selection from Slate directly ([1551cfe](https://github.com/portabletext/editor/commit/1551cfe3e43e1ed4c137a57fd024f421549b6477))
* don't calculate `EventPosition` while setting up ([c42ca62](https://github.com/portabletext/editor/commit/c42ca6288d8638d81e2dd4231e6bda7bd06f9d40))

## [1.44.11](https://github.com/portabletext/editor/compare/editor-v1.44.10...editor-v1.44.11) (2025-04-03)


### Bug Fixes

* **sync:** only delete text from non-empty spans ([77db64c](https://github.com/portabletext/editor/commit/77db64c3700f9b27e46b55b3a215ed5c8ceba93e))

## [1.44.10](https://github.com/portabletext/editor/compare/editor-v1.44.9...editor-v1.44.10) (2025-04-02)


### Bug Fixes

* allow skipping range decoration setup ([5689d8a](https://github.com/portabletext/editor/commit/5689d8ab4f30ee09693bf6b7ed7e7fe38f5234a0))

## [1.44.9](https://github.com/portabletext/editor/compare/editor-v1.44.8...editor-v1.44.9) (2025-04-02)


### Bug Fixes

* **behaviors:** allow sending all `AbstractBehaviorEvent`s ([1c65fcb](https://github.com/portabletext/editor/commit/1c65fcb3adfa68381118a00f234972d48de75f19))

## [1.44.8](https://github.com/portabletext/editor/compare/editor-v1.44.7...editor-v1.44.8) (2025-04-02)


### Bug Fixes

* make `decorate` more reliable ([ae24e3b](https://github.com/portabletext/editor/commit/ae24e3b742971443ac5975a17f7a2ac2ecd0e99b))
* trigger rerender when initial range decorations are set up ([b576609](https://github.com/portabletext/editor/commit/b57660973b58b771799208dbbf681a3e2089fdb1))

## [1.44.7](https://github.com/portabletext/editor/compare/editor-v1.44.6...editor-v1.44.7) (2025-04-01)


### Bug Fixes

* trigger rerender when range decorations change ([349eb51](https://github.com/portabletext/editor/commit/349eb515260da5b4bfce244c664728e6620385f3))

## [1.44.6](https://github.com/portabletext/editor/compare/editor-v1.44.5...editor-v1.44.6) (2025-04-01)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#930](https://github.com/portabletext/editor/issues/930)) ([7aadacd](https://github.com/portabletext/editor/commit/7aadacd5191355a8d348a34c4775d081a5e76449))

## [1.44.5](https://github.com/portabletext/editor/compare/editor-v1.44.4...editor-v1.44.5) (2025-04-01)


### Bug Fixes

* **perf:** only create `decorate` function once ([a8ea1b5](https://github.com/portabletext/editor/commit/a8ea1b535e20dd5d641297b74716152614242eab))

## [1.44.4](https://github.com/portabletext/editor/compare/editor-v1.44.3...editor-v1.44.4) (2025-04-01)


### Bug Fixes

* try-catch unsafe code ([1ec9dff](https://github.com/portabletext/editor/commit/1ec9dff8b493f1fac3d0f403f95172446337ed46))

## [1.44.3](https://github.com/portabletext/editor/compare/editor-v1.44.2...editor-v1.44.3) (2025-04-01)


### Bug Fixes

* **deps:** update react monorepo ([18b6c3e](https://github.com/portabletext/editor/commit/18b6c3eaca5380705c435efe1b0aa74f9a3aff1d))
* **perf:** avoid expensive `fromSlateValue` when calculating Slate Range ([c0905f8](https://github.com/portabletext/editor/commit/c0905f8a8de8b23711f4eaa623654b8be036b754))
* try-catch unsafe code ([7d62f67](https://github.com/portabletext/editor/commit/7d62f671f23fe7612a6ee231ffc0017f5a48c24c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.16

## [1.44.2](https://github.com/portabletext/editor/compare/editor-v1.44.1...editor-v1.44.2) (2025-03-28)


### Bug Fixes

* better `Behavior` type docs ([8c08736](https://github.com/portabletext/editor/commit/8c08736ed21110c61dfb90ed0bd47299a6b41827))
* **perf:** improve internal `getFocusBlock` ([9040fd8](https://github.com/portabletext/editor/commit/9040fd8c3be110a193e66eaabe77ea6a3e5056e4))
* turn `move.block (down|up)` into abstract events ([684f68a](https://github.com/portabletext/editor/commit/684f68a9f1443c1755bc698254cd2ef980a6dfe8))

## [1.44.1](https://github.com/portabletext/editor/compare/editor-v1.44.0...editor-v1.44.1) (2025-03-27)


### Bug Fixes

* turn `(annotation|decorator).toggle` into external/internal events ([02a42c2](https://github.com/portabletext/editor/commit/02a42c29debcd64ea8a7a468413ea13755513ac2))

## [1.44.0](https://github.com/portabletext/editor/compare/editor-v1.43.1...editor-v1.44.0) (2025-03-26)


### Features

* **selectors:** add `getSelectedTextBlocks` ([aa00d91](https://github.com/portabletext/editor/commit/aa00d91a22c179ddb3c34b370b320363fcf032df))


### Bug Fixes

* make all deserialize/serialize related events internal ([1b52cb2](https://github.com/portabletext/editor/commit/1b52cb2c43190fc02df49e078024a864dac57499))
* pasting one text block on a text block ([2522381](https://github.com/portabletext/editor/commit/25223813aa6b515adf220d509940e12587b40498))
* turn `insert.blocks`/`select.(next|previous) block` into external/internal events ([7b2a7e5](https://github.com/portabletext/editor/commit/7b2a7e5247f353360c2170ee4d16388a02e05667))
* turn `list item.*` events into external/internal events ([bf36a8d](https://github.com/portabletext/editor/commit/bf36a8d3535e429f937d2a833d446da848e13b6c))
* turn `style.*` events into external/internal events ([71a34db](https://github.com/portabletext/editor/commit/71a34db0a336f22082607418ea9f674b2a28bb3a))

## [1.43.1](https://github.com/portabletext/editor/compare/editor-v1.43.0...editor-v1.43.1) (2025-03-26)


### Bug Fixes

* speed up initial value sync ([984fbf9](https://github.com/portabletext/editor/commit/984fbf949870db16c0bbebf0db77b257e534bf61))

## [1.43.0](https://github.com/portabletext/editor/compare/editor-v1.42.1...editor-v1.43.0) (2025-03-25)


### Features

* support sensible Shift+Paste Behavior by default ([38d28ba](https://github.com/portabletext/editor/commit/38d28ba331037a487d6840de542c5d9ebcd62659))


### Bug Fixes

* **`getActiveAnnotations`:** account for selection right before annotation ([9339969](https://github.com/portabletext/editor/commit/9339969888ee4d03e22feefdd1d35f2e802c35a7))
* add debug logs for Behavior Actions ([66b8308](https://github.com/portabletext/editor/commit/66b83081f49144c5bbfcc55ca350a86a7df4c028))
* **deps:** update sanity monorepo to ^3.81.0 ([ec993c4](https://github.com/portabletext/editor/commit/ec993c466cfed2db3b478098e91cc6fa3399338b))
* make raised Behavior events recursive ([04fcbbb](https://github.com/portabletext/editor/commit/04fcbbbd1f2ca64da061bc8df324e75772c074a5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.15

## [1.42.1](https://github.com/portabletext/editor/compare/editor-v1.42.0...editor-v1.42.1) (2025-03-25)


### Bug Fixes

* **performance:** bail out of empty action sets ([37f2cd6](https://github.com/portabletext/editor/commit/37f2cd69e1bd97c9eb1ffc31751231472acf7ca9))

## [1.42.0](https://github.com/portabletext/editor/compare/editor-v1.41.4...editor-v1.42.0) (2025-03-24)


### Features

* **plugins:** export `CoreBehaviorsPlugin` ([40a3b6b](https://github.com/portabletext/editor/commit/40a3b6b24a93ac28507c2fa89f72226596a3d5f3))


### Bug Fixes

* remove internal `options` from `insert.text` event ([431c56c](https://github.com/portabletext/editor/commit/431c56c05abd547c5ba5f1a4cecd703f10c4f1a9))

## [1.41.4](https://github.com/portabletext/editor/compare/editor-v1.41.3...editor-v1.41.4) (2025-03-22)


### Bug Fixes

* **dnd:** prevent `drag.dragover` default behavior using Behavior ([8e390bd](https://github.com/portabletext/editor/commit/8e390bd08c506ee7c931d919cfdd4d801421de5f))
* **dnd:** remove unnecessary event prevention ([0df9c60](https://github.com/portabletext/editor/commit/0df9c603769fbd378e1026477a369aabf835e1b3))
* **dnd:** select as part of default `drag.drop` Behavior ([27050ac](https://github.com/portabletext/editor/commit/27050ace8ef1474b6da7f153321944c7bc8b481d))

## [1.41.3](https://github.com/portabletext/editor/compare/editor-v1.41.2...editor-v1.41.3) (2025-03-21)


### Bug Fixes

* drag selection for inline object in expanded selection ([e0289be](https://github.com/portabletext/editor/commit/e0289be83cd4b51592dc14537c6d465812f67cb4))

## [1.41.2](https://github.com/portabletext/editor/compare/editor-v1.41.1...editor-v1.41.2) (2025-03-21)


### Bug Fixes

* **dnd:** edge case with inline objects and block objects sharing name ([6881a7c](https://github.com/portabletext/editor/commit/6881a7c93c7d8c326ae811f1c99c780c2ff33e1a))
* mitigate potential error when removing drag ghost ([da324d8](https://github.com/portabletext/editor/commit/da324d8b22da55174f777e1935a804be3a979e19))

## [1.41.1](https://github.com/portabletext/editor/compare/editor-v1.41.0...editor-v1.41.1) (2025-03-21)


### Bug Fixes

* **drag events:** remove aggressive usage of `preventDefault` and early returns ([3f6c449](https://github.com/portabletext/editor/commit/3f6c4498c93bb8ded94202ecb765f7b954dc2f49))

## [1.41.0](https://github.com/portabletext/editor/compare/editor-v1.40.4...editor-v1.41.0) (2025-03-21)


### Features

* **utils:** add `getSelection(Start|End)Point` ([cdb5045](https://github.com/portabletext/editor/commit/cdb504553390b2062933320856473640a7fee05f))


### Bug Fixes

* account for long editors when calculating `EventPositionBlock` ([bf7a0c8](https://github.com/portabletext/editor/commit/bf7a0c803e12db44c8413f0a99a0ad2c40b33dfb))
* add back default `[Name]` serialization of objects when dragging ([92c9651](https://github.com/portabletext/editor/commit/92c9651f42fc3b5817b8e808a4438f53c377d124))
* adjust selection when dragging starts ([50e74f7](https://github.com/portabletext/editor/commit/50e74f7b353c151f7e607363692cfaa007d99e35))
* always prevent Slate from handling drag events ([60c717f](https://github.com/portabletext/editor/commit/60c717f3a7aa51d2b0d9e979fa12b51c990815af))
* ensure Slate can find a position within drop indicators ([591c94e](https://github.com/portabletext/editor/commit/591c94e8365e10c30c978062adcfd425ee981951))
* make `EventPosition`s more resilient ([4f63395](https://github.com/portabletext/editor/commit/4f63395ceea1f5c553c1199f624b38523e324310))
* prevent cursor from moving if dragging over drag origin ([872ba8b](https://github.com/portabletext/editor/commit/872ba8ba2f77338a7189c11d2b6867b676ba05ea))
* reuese `EventPosition` to mitigate potential `findEventRange` error ([2193276](https://github.com/portabletext/editor/commit/21932761ec9c92678f9423051c84390490b45116))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.2.3

## [1.40.4](https://github.com/portabletext/editor/compare/editor-v1.40.3...editor-v1.40.4) (2025-03-20)


### Bug Fixes

* **`insert.blocks`:** account for text blocks inserted on block object ([f4ff9b7](https://github.com/portabletext/editor/commit/f4ff9b777368941c395509d7ff30d1eec35f6bb7))
* adjust `EventPosition` if event node and selection are mismatching ([3f8ec05](https://github.com/portabletext/editor/commit/3f8ec058ab5ba5588303062fce566c7bbd3aa205))
* drag selection edge case ([259cc0a](https://github.com/portabletext/editor/commit/259cc0ae50dcb9784b3a8e434750767e534da52d))

## [1.40.3](https://github.com/portabletext/editor/compare/editor-v1.40.2...editor-v1.40.3) (2025-03-19)


### Bug Fixes

* **`delete.block`:** rename `blockPath` to `at` ([8fb9a76](https://github.com/portabletext/editor/commit/8fb9a7614e37e0698f7e0a7bb7734842c4c994ea))
* **`insert.block`:** allow omitting the `_key` ([78df7e5](https://github.com/portabletext/editor/commit/78df7e51daabf8ffcbf49f9c81661a7caad2c629))
* allow listening to all Behavior event namespaces ([b639fce](https://github.com/portabletext/editor/commit/b639fce78e393f84db8b994c58e9ddc03c73f749))
* **deps:** update sanity monorepo to ^3.80.1 ([d12edbe](https://github.com/portabletext/editor/commit/d12edbe0d11516621934b20cf6b904b1e93db275))
* remove `insert.text block` event and action ([75df505](https://github.com/portabletext/editor/commit/75df5059b5848715c053882861fed99e723f305a))
* turn `insert.block object` into an `ExternalBehaviorEvent` ([28750ff](https://github.com/portabletext/editor/commit/28750ff52f369ed13f93d4bdce21f30c15509f81))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.14

## [1.40.2](https://github.com/portabletext/editor/compare/editor-v1.40.1...editor-v1.40.2) (2025-03-18)


### Bug Fixes

* edge case related to toggling decorators ([e5f1e67](https://github.com/portabletext/editor/commit/e5f1e6760423523b31fdb318743e3bc965916634))

## [1.40.1](https://github.com/portabletext/editor/compare/editor-v1.40.0...editor-v1.40.1) (2025-03-18)


### Bug Fixes

* allow dragging block objects in Firefox ([13f74e0](https://github.com/portabletext/editor/commit/13f74e03b59f5ea71e1ac529ccd80fb3fa19c754))
* fail `application/x-portable-text` serialization if no blocks are selected ([a1de3ab](https://github.com/portabletext/editor/commit/a1de3abf7f83760ac0193196754d858226d81da0))
* raise `input.*` instead of `deserialize` ([23b86e1](https://github.com/portabletext/editor/commit/23b86e13827ee5204e6acd84c8c22eee279d3cf0))
* remove default `[Name]` serialization of objects ([6228c6c](https://github.com/portabletext/editor/commit/6228c6ccd5b9fb22a58553a35e8e60726976ee86))

## [1.40.0](https://github.com/portabletext/editor/compare/editor-v1.39.1...editor-v1.40.0) (2025-03-17)


### Features

* support drag images no matter which block is dragged ([2d6dce8](https://github.com/portabletext/editor/commit/2d6dce8a6c63d626df39d5091d11496ede2b056a))
* **utils:** add `blockOffsetToBlockSelectionPoint` ([3824bb2](https://github.com/portabletext/editor/commit/3824bb23ff378310385dcf62563ca30b185d06a4))
* **utils:** add `blockOffsetToSelectionPoint` ([5576ac5](https://github.com/portabletext/editor/commit/5576ac5367d04dd4c53563b214b4baff0c49ed72))
* **utils:** add `isEqualSelections` ([3f31a1b](https://github.com/portabletext/editor/commit/3f31a1ba5df36be3967a87d0423f44dda1a1cfba))
* **utils:** add `selectionPointToBlockOffset` ([c64887e](https://github.com/portabletext/editor/commit/c64887e2dc2f87deec46bf511ab8e72301e8d147))


### Bug Fixes

* **`decorator.add`:** account for selections starting/ending on block object ([5eb2e1f](https://github.com/portabletext/editor/commit/5eb2e1f4d7d4dbeacc1b532355ec5ebf85528fce))
* **default behaviors:** delete internal dropped blocks before inserting ([ccb05eb](https://github.com/portabletext/editor/commit/ccb05eb43d373145ca851c2c49456e8c848ada4e))
* **deps:** update react compiler dependencies 🤖 ✨ ([#901](https://github.com/portabletext/editor/issues/901)) ([2701993](https://github.com/portabletext/editor/commit/27019937582b671b33feb2c551bdf2d5b57ba39f))
* **dnd:** calculate the correct drag selection ([c3edab4](https://github.com/portabletext/editor/commit/c3edab4f7f69f093cdfbbf3bc72a7ab9bf96341b))
* **dnd:** compute manual drag ghost when dragging inline objects ([2bcfb4e](https://github.com/portabletext/editor/commit/2bcfb4ee8d00c80e3a23643f29a1e7201a4afbca))
* **dnd:** inline object drag selection edge case ([6e30b87](https://github.com/portabletext/editor/commit/6e30b8715bbab5ef73fc6c33a6e602a8174d6331))
* hide _internal Editor prop ([6f6eddc](https://github.com/portabletext/editor/commit/6f6eddc7c83a74c2b7a5563afa110f8c396052ca))
* only arrow-create empty text block above/below block object for collapsed selections ([a462f03](https://github.com/portabletext/editor/commit/a462f0374be7f170990d51d3d32dd1109c5e5262))
* only click-create empty text block above/below block object for collapsed selections ([20bb726](https://github.com/portabletext/editor/commit/20bb72605e3f8b15d20809a9aba507d8db34e568))
* only toggle decorator on collapsed selection if span is selected ([843bcb5](https://github.com/portabletext/editor/commit/843bcb5fc834e32eab0b73e856d3dcad047f8408))
* remove irrelevant EventPosition props on drag.startstart and clipboard.* events ([f30d7fe](https://github.com/portabletext/editor/commit/f30d7fe7ddfbd9006acffeb8110a7d260e2699a8))
* use unique objects for inline children when generating Slate value ([a30cc9e](https://github.com/portabletext/editor/commit/a30cc9ed476a8e24b0037ea9c822648049bbfcba))
* **utils:** account for block objects in `blockOffsetsToSelection` ([912d2b7](https://github.com/portabletext/editor/commit/912d2b7ac42a611680d8c907ae224702a33e4e9c))

## [1.39.1](https://github.com/portabletext/editor/compare/editor-v1.39.0...editor-v1.39.1) (2025-03-13)


### Bug Fixes

* account for InputEvents holding DataTransfer objects ([5b4d718](https://github.com/portabletext/editor/commit/5b4d718cca84d5b171001ccbab9f8041058b4ed0))

## [1.39.0](https://github.com/portabletext/editor/compare/editor-v1.38.1...editor-v1.39.0) (2025-03-12)


### Features

* **behaviors:** allow listening for `mouse.*` events ([3f81e0e](https://github.com/portabletext/editor/commit/3f81e0eefd05217b3481fa764dae3ec1494721c0))
* **behaviors:** clipboard events are now consistent with other native events ([667f6d3](https://github.com/portabletext/editor/commit/667f6d3b367441851fcd994bac1287b33d2990a1))
* **behaviors:** establish `originEvent` pattern on native events ([fd761e8](https://github.com/portabletext/editor/commit/fd761e8abde72daac9f0b067af3bcef75b80a3ac))
* **behaviors:** keyboard events are now consistent with other native events ([c3603d1](https://github.com/portabletext/editor/commit/c3603d12a5cf67f76bee04f40192080860551b0a))

## [1.38.1](https://github.com/portabletext/editor/compare/editor-v1.38.0...editor-v1.38.1) (2025-03-12)


### Bug Fixes

* don't spam console during drag ([9b5c0d8](https://github.com/portabletext/editor/commit/9b5c0d8177bb04380a984e18ef79ff82e5ec2e94))

## [1.38.0](https://github.com/portabletext/editor/compare/editor-v1.37.0...editor-v1.38.0) (2025-03-12)


### Features

* **`insert.block`:** allow specifying selection of inserted block ([c074363](https://github.com/portabletext/editor/commit/c07436371e94115227ad5815a24557c666a32f16))
* **behaviors:** add `mouse.click` event ([c70f455](https://github.com/portabletext/editor/commit/c70f45542f24991c1df79ad2f6fadadb1c3eb1d4))
* first-class dnd ([14b61a7](https://github.com/portabletext/editor/commit/14b61a773b62e768fd5b03463315806685588f42))


### Bug Fixes

* **`insert.block`:** account for inserting block object on inline object ([6ec15bd](https://github.com/portabletext/editor/commit/6ec15bdd2d95a760db3e03385adf6943f8bb90b9))
* **`insert.block`:** account for inserting text block on inline object ([b5c2432](https://github.com/portabletext/editor/commit/b5c2432db2c6909edb3b74017f95ac497eae279c))
* **`insert.blocks`:** improve logic by using `insert.block` under the hood ([298b90c](https://github.com/portabletext/editor/commit/298b90c34413e07c889f7b7602694438fad8b07a))
* **`insert.blocks`:** parse blocks before inserting ([5848ed0](https://github.com/portabletext/editor/commit/5848ed0c5d8430508a68bafb94276f96dae353e7))
* **`insert.break`:** always split ([56892d0](https://github.com/portabletext/editor/commit/56892d0a68a01a63e29917d3569293de5ebb4020))
* **deps:** downgrade `react-compiler-runtime` ([ffb7297](https://github.com/portabletext/editor/commit/ffb72979bce69c8e786fbad3aa288dbd44c40ca5))
* **deps:** update react compiler dependencies 🤖 ✨ ([c17f415](https://github.com/portabletext/editor/commit/c17f41510675a140d18b71f0ff30821ff2f5f6d6))
* **deps:** update sanity monorepo to ^3.78.1 ([2902cf0](https://github.com/portabletext/editor/commit/2902cf06674a136d4145fc2fff108b581e6d0efa))
* **deps:** update sanity monorepo to ^3.79.0 ([f2a1768](https://github.com/portabletext/editor/commit/f2a1768c82af579f60126a8c5c4c5fc28dda929f))
* **insert.block:** don't manipulate the current selection ([521a019](https://github.com/portabletext/editor/commit/521a019b5ed5667cb3f6f89affa87e5d35da8bbf))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.13
  * devDependencies
    * racejar bumped to 1.2.2

## [1.37.0](https://github.com/portabletext/editor/compare/editor-v1.36.6...editor-v1.37.0) (2025-03-06)


### Features

* add `readOnly` to `EditorContext` ([190bd0c](https://github.com/portabletext/editor/commit/190bd0cdd18137ba1e86a7cc5eb2119008581a75))
* **selectors:** add `getFocusInlineObject` ([c7c5016](https://github.com/portabletext/editor/commit/c7c5016228b4073c196b6dfcbec197a80d21a915))
* **selectors:** add `isSelectingEntireBlocks` ([08b9668](https://github.com/portabletext/editor/commit/08b966823ae2209379791cd39bcd35b15846e66d))


### Bug Fixes

* **`delete` action:** delete without selecting beforehand ([b3ea0aa](https://github.com/portabletext/editor/commit/b3ea0aad19d242f0cf1598b28d33b7b9ab576fe8))
* **`insert.blocks`:** account for edge cases related to inline objects ([b4b5426](https://github.com/portabletext/editor/commit/b4b542620a37586547271f090558def28fc066e7))
* **`insert.blocks`:** insert after block objects if placement is `auto` ([c91e8a1](https://github.com/portabletext/editor/commit/c91e8a1fa4a2f639dc2334df1a1e058addf32314))
* **`isOverlappingSelection`:** account for more edge cases ([d051978](https://github.com/portabletext/editor/commit/d0519788e6e8669c1687dfe39cf9d32f75070efc))
* **`isOverlappingSelection`:** account for more edge cases ([dc9adf8](https://github.com/portabletext/editor/commit/dc9adf8e51c174042600d46ecda19d8fa4d023a9))
* **`isPointAfterSelection`:** don't reverse selection if not backward ([b69fbc7](https://github.com/portabletext/editor/commit/b69fbc763a2fa63c49605291a3e2ac4318a7a131))
* **`isPointBeforeSelection`:** don't reverse selection if not backward ([0dd79a3](https://github.com/portabletext/editor/commit/0dd79a3731788729104811113a53623d47b8bf33))
* **behavior actions:** don't pass entire context to actions ([e82b23d](https://github.com/portabletext/editor/commit/e82b23dadd8ec823724323637ea3e50626cead88))
* **deps:** update sanity monorepo to ^3.78.0 ([7bcaac8](https://github.com/portabletext/editor/commit/7bcaac8977d97567905fcf3f577f2c271472f09d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.12

## [1.36.6](https://github.com/portabletext/editor/compare/editor-v1.36.5...editor-v1.36.6) (2025-03-03)


### Bug Fixes

* **insert.blocks:** support and require placement of insertion ([d157f17](https://github.com/portabletext/editor/commit/d157f1744da59809e4eb25a4419fa550beba40d7))
* **insert.blocks:** support insertion without a selection ([291365d](https://github.com/portabletext/editor/commit/291365d2de84b0b69816869781509bfd42e25cd2))

## [1.36.5](https://github.com/portabletext/editor/compare/editor-v1.36.4...editor-v1.36.5) (2025-03-03)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#863](https://github.com/portabletext/editor/issues/863)) ([ecad51c](https://github.com/portabletext/editor/commit/ecad51c80ec5d2f79255e6a8f27d50e935bb6b3d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.2.1

## [1.36.4](https://github.com/portabletext/editor/compare/editor-v1.36.3...editor-v1.36.4) (2025-02-28)


### Bug Fixes

* **types:** rename `BehaviorActionIntend`-&gt;`BehaviorAction` ([907cf8c](https://github.com/portabletext/editor/commit/907cf8c8883d93e70a6ab3b7b1536a4296be3f8e))

## [1.36.3](https://github.com/portabletext/editor/compare/editor-v1.36.2...editor-v1.36.3) (2025-02-28)


### Bug Fixes

* avoid hijacking Shift+Enter `key.down` event ([087bea2](https://github.com/portabletext/editor/commit/087bea29ccd7259c079d35491fa36f82ceee1e12))

## [1.36.2](https://github.com/portabletext/editor/compare/editor-v1.36.1...editor-v1.36.2) (2025-02-28)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.77.2 ([1f9792e](https://github.com/portabletext/editor/commit/1f9792ea6468e2ca13c819b0abe94041b5238a27))
* **text/html converter:** fail if no blocks were deserialized ([6be9830](https://github.com/portabletext/editor/commit/6be98301b94d40e959b24882ff20153712a0bfad))
* **text/plain converter:** fail if no blocks were deserialized ([6921d73](https://github.com/portabletext/editor/commit/6921d736b17ffd0a064b38a9804c7760521e3572))
* **types:** don't reexport behavior types ([0e8b47f](https://github.com/portabletext/editor/commit/0e8b47fee156210655b481023a106130abd859c1))
* **types:** fix typedoc issues ([a7706bd](https://github.com/portabletext/editor/commit/a7706bd8a5e8fbbeef7b0c21599caea6616f4915))
* **types:** remove cyclic dependencies ([d718b2d](https://github.com/portabletext/editor/commit/d718b2da6624b4a90c4cb8e27b6987f9fe9bdb4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.11

## [1.36.1](https://github.com/portabletext/editor/compare/editor-v1.36.0...editor-v1.36.1) (2025-02-25)


### Bug Fixes

* mitigate syncing getting stuck if value changed while syncing ([cfa7523](https://github.com/portabletext/editor/commit/cfa7523cab8cd160086fdddde1f3d9b7a5e58ca3))

## [1.36.0](https://github.com/portabletext/editor/compare/editor-v1.35.4...editor-v1.36.0) (2025-02-25)


### Features

* **behaviors:** allow listening for all events using `"*"` ([baaf310](https://github.com/portabletext/editor/commit/baaf3107be5bad8fcd0436e79932cdda6db85bb6))
* **plugins:** export `DecoratorShortcutPlugin` ([3dc9d1a](https://github.com/portabletext/editor/commit/3dc9d1af7f7da7bddc5b801bad0c23fc147f1cfa))


### Bug Fixes

* deprecate `PortableTextEditor.(undo|redo)` ([73fd0b0](https://github.com/portabletext/editor/commit/73fd0b0d6de9fc3cf0f723608912af67d05644c1))
* **deps:** update sanity monorepo to ^3.77.1 ([3704f06](https://github.com/portabletext/editor/commit/3704f069fce69fd9c6956fa14d557223ee56e01a))
* only warn on `(deserialization|serialization).failure` ([b28369c](https://github.com/portabletext/editor/commit/b28369c4216fecb4320c73d17c4fe89ded111a15))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.10

## [1.35.4](https://github.com/portabletext/editor/compare/editor-v1.35.3...editor-v1.35.4) (2025-02-24)


### Bug Fixes

* bulk mutations by action ID ([3cc2e69](https://github.com/portabletext/editor/commit/3cc2e69fee91196a0036dd0c3c3a9d71843cede5))
* replace mutation debounce with a typing debounce ([9114aa3](https://github.com/portabletext/editor/commit/9114aa3a2fd1f93348b89da5d04429d82650aadc))

## [1.35.3](https://github.com/portabletext/editor/compare/editor-v1.35.2...editor-v1.35.3) (2025-02-24)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#831](https://github.com/portabletext/editor/issues/831)) ([6c27e5a](https://github.com/portabletext/editor/commit/6c27e5a3e3f8d5745dd43621e81664461a92702e))

## [1.35.2](https://github.com/portabletext/editor/compare/editor-v1.35.1...editor-v1.35.2) (2025-02-24)


### Bug Fixes

* avoid mutation emission getting stuck ([71f66d4](https://github.com/portabletext/editor/commit/71f66d4dd95f546c3ecf0d91234404cac955960e))
* **deps:** update dependency rxjs to ^7.8.2 ([be33cc7](https://github.com/portabletext/editor/commit/be33cc7c42e3c3609b8fd6f38167f6f736023b1b))

## [1.35.1](https://github.com/portabletext/editor/compare/editor-v1.35.0...editor-v1.35.1) (2025-02-21)


### Bug Fixes

* deprecate `EditorEventListener` ([3c83e84](https://github.com/portabletext/editor/commit/3c83e84d6ec656a5dd8dd8b29319bd1198b73d51))
* don't refresh keys when dragging internally ([14ec982](https://github.com/portabletext/editor/commit/14ec982d6545b243f6eb55badf9bc658096c7abf))

## [1.35.0](https://github.com/portabletext/editor/compare/editor-v1.34.1...editor-v1.35.0) (2025-02-21)


### Features

* **behavior:** provide `EditorSnapshot` in guards and actions ([7922708](https://github.com/portabletext/editor/commit/79227080dde8bb739ba0a5ee7eb15e2dc6fa1a3a))
* **markdown plugin:** add ``code`` shortcut support ([522afb9](https://github.com/portabletext/editor/commit/522afb945bebed964d75dce9a9294293e7d18302))
* **markdown plugin:** add ~~strike-through~~ shortcut support ([cc718d3](https://github.com/portabletext/editor/commit/cc718d335f916c6284f93294b3a879be29fbeede))


### Bug Fixes

* **deps:** update sanity monorepo to ^3.76.1 ([03e26b9](https://github.com/portabletext/editor/commit/03e26b9939ef0bb8e1679927c5261a60859cf2fd))
* **deps:** update sanity monorepo to ^3.76.3 ([149a654](https://github.com/portabletext/editor/commit/149a6548afed5464f289fd2f2a6fce453873f7d3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.9

## [1.34.1](https://github.com/portabletext/editor/compare/editor-v1.34.0...editor-v1.34.1) (2025-02-18)


### Bug Fixes

* add missing `originEvent` on `serialization.failure` ([9f7ce71](https://github.com/portabletext/editor/commit/9f7ce718dd96fee97932720d883d46c43e301aca))
* allow serializing dragged data ([a503272](https://github.com/portabletext/editor/commit/a5032729d553bfe26f05121157d2cb7f0fbe6cfd))

## [1.34.0](https://github.com/portabletext/editor/compare/editor-v1.33.6...editor-v1.34.0) (2025-02-18)


### Features

* **utils:** add `childSelectionPointToBlockOffset` ([a30afea](https://github.com/portabletext/editor/commit/a30afea94535c12caf050f21e360e91c33b48726))


### Bug Fixes

* **`decorator.add`:** use `offsets` rather than `selection` ([3911b20](https://github.com/portabletext/editor/commit/3911b20fde1dbc269e7ca73e623c3520aa263a48))
* **markdown emphasis:** account for variable `insert.text` text length ([9fb8d31](https://github.com/portabletext/editor/commit/9fb8d31366df63b2c5ba99e80612fe95b52a5267))
* **markdown emphasis:** guard against inline objects in prefixes/suffixes ([37e5a06](https://github.com/portabletext/editor/commit/37e5a0659ce56e5dd4b366095fb71abae003b6bb))
* **markdown emphasis:** remove decorator from caret after emphasis ([7665f29](https://github.com/portabletext/editor/commit/7665f2939711dddd4e5d10023048b1d38844cec8))

## [1.33.6](https://github.com/portabletext/editor/compare/editor-v1.33.5...editor-v1.33.6) (2025-02-17)


### Bug Fixes

* **`block.set`:** remove reliance on knowing block type ([eaa9f0c](https://github.com/portabletext/editor/commit/eaa9f0cfafbcd817a9265f8ce8e83110225aec08))
* **`block.unset`:** remove reliance on knowing block type ([12d01fc](https://github.com/portabletext/editor/commit/12d01fc7a69068fb82396fb230651f3cb9393d58))
* **behaviors:** remove `text block.(set|unset)` ([be9d834](https://github.com/portabletext/editor/commit/be9d834a3671a6ab297aade5458543885daea51b))
* **deps:** update sanity monorepo to ^3.75.1 ([144b978](https://github.com/portabletext/editor/commit/144b978191b78a48f944b0e885c11f6263ec7ba4))
* improve block parsing ([5a14b0e](https://github.com/portabletext/editor/commit/5a14b0e7fe04d66774f4b32156c55dd23e05853f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.8

## [1.33.5](https://github.com/portabletext/editor/compare/editor-v1.33.4...editor-v1.33.5) (2025-02-17)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#806](https://github.com/portabletext/editor/issues/806)) ([e4961d8](https://github.com/portabletext/editor/commit/e4961d8249a23aac675af90880c28f22a37aae3c))

## [1.33.4](https://github.com/portabletext/editor/compare/editor-v1.33.3...editor-v1.33.4) (2025-02-14)


### Bug Fixes

* **`sliceBlock`:** issue with slicing a single block ([ee42fa2](https://github.com/portabletext/editor/commit/ee42fa238ee3c5d427c6056613ee659f9b6ea1ec))

## [1.33.3](https://github.com/portabletext/editor/compare/editor-v1.33.2...editor-v1.33.3) (2025-02-13)


### Bug Fixes

* **`blockOffsetToSpanSelectionPoint`:** account for the direction of the offset ([b55d3f2](https://github.com/portabletext/editor/commit/b55d3f26919c3e62a217b045b2fcf885e0c0b945))
* **`getSelectionText`:** account for more edge cases ([9a73f62](https://github.com/portabletext/editor/commit/9a73f624448812cdaaea773996143072e49afb87))

## [1.33.2](https://github.com/portabletext/editor/compare/editor-v1.33.1...editor-v1.33.2) (2025-02-12)


### Bug Fixes

* make sure Mod+Backspace can delete line backwards ([da95223](https://github.com/portabletext/editor/commit/da9522342c451e8b1ffe6ac055cf537a49310a2a))

## [1.33.1](https://github.com/portabletext/editor/compare/editor-v1.33.0...editor-v1.33.1) (2025-02-12)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.75.0 ([8f9bd9b](https://github.com/portabletext/editor/commit/8f9bd9bccdb0ba824885a592be3c497280af288b))
* **markdown emphasis:** fix edge case producing wrong match ([48361cf](https://github.com/portabletext/editor/commit/48361cf968fd1eac0d7e3ca94331de03cd1da7f6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.7

## [1.33.0](https://github.com/portabletext/editor/compare/editor-v1.32.0...editor-v1.33.0) (2025-02-11)


### Features

* **`decorator.add`:** allow manual `selection` ([1d1daaa](https://github.com/portabletext/editor/commit/1d1daaa589df023e7563ac95ce39b1be13fda7b9))
* **markdown plugin:** add bold/italic shortcut support ([1051546](https://github.com/portabletext/editor/commit/1051546e8017c5ddd6d41b98f1d522e5821d0d0c))
* **selectors:** add `getAnchor(Block|Child|Span|TextBlock)` ([e860e22](https://github.com/portabletext/editor/commit/e860e220459668d074e2b6f58991f102b670f3fd))
* **selectors:** add `getTrimmedSelection` ([0f71c5f](https://github.com/portabletext/editor/commit/0f71c5f0bc668c6851a239abb582b6aadf67741c))
* **utils:** add `blockOffsetsToSelection` ([09de8d8](https://github.com/portabletext/editor/commit/09de8d8557632ab7097a08238ec8a830518d9ac1))


### Bug Fixes

* **`delete.text`:** trim inline objects on the selection edge ([ef387b4](https://github.com/portabletext/editor/commit/ef387b4dc1019db2bc8aae14d9cbe4658ad095ca))
* **markdown behaviors:** respect preceding inline objects ([31d06ab](https://github.com/portabletext/editor/commit/31d06abd5afc4e982cdd203a555ade5eb7fb961c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped to 1.1.3

## [1.32.0](https://github.com/portabletext/editor/compare/editor-v1.31.2...editor-v1.32.0) (2025-02-10)


### Features

* **behaviors:** add `history.redo`/`history.undo` events and actions ([9e1e78d](https://github.com/portabletext/editor/commit/9e1e78d838d515a4ba196bdb533e4e78807eb23d))
* **behaviors:** merge action sets into single undo steps ([7d1d24b](https://github.com/portabletext/editor/commit/7d1d24b7fe185af0f802837c97469aec5d132a6b))

## [1.31.2](https://github.com/portabletext/editor/compare/editor-v1.31.1...editor-v1.31.2) (2025-02-10)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#786](https://github.com/portabletext/editor/issues/786)) ([938ac18](https://github.com/portabletext/editor/commit/938ac180435dafef851ffdb6f4984f09e0a10573))

## [1.31.1](https://github.com/portabletext/editor/compare/editor-v1.31.0...editor-v1.31.1) (2025-02-10)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.2.0

## [1.31.0](https://github.com/portabletext/editor/compare/editor-v1.30.6...editor-v1.31.0) (2025-02-07)


### Features

* **selectors:** add `getCaretWordSelection` and more ([763e64a](https://github.com/portabletext/editor/commit/763e64a98a7779fc3c3696d7601df423ffc3f05d))


### Bug Fixes

* avoid error when adding annotation ad the end of a block ([501fc0f](https://github.com/portabletext/editor/commit/501fc0f8684b12779d27a1a5425e739acfe47a69))

## [1.30.6](https://github.com/portabletext/editor/compare/editor-v1.30.5...editor-v1.30.6) (2025-02-06)


### Bug Fixes

* **deps:** update dependency @portabletext/to-html to ^2.0.14 ([e44c098](https://github.com/portabletext/editor/commit/e44c098b69874ebd0ef84aa197d8ec561947ffe3))

## [1.30.5](https://github.com/portabletext/editor/compare/editor-v1.30.4...editor-v1.30.5) (2025-02-06)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.74.1 ([bc4b1bc](https://github.com/portabletext/editor/commit/bc4b1bcb15e66d9ff49771944c20e4c9eccae45d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.6

## [1.30.4](https://github.com/portabletext/editor/compare/editor-v1.30.3...editor-v1.30.4) (2025-02-05)


### Bug Fixes

* **selector.getSelectedSpans:** don't include spans at the edge of a selection ([9f50557](https://github.com/portabletext/editor/commit/9f505579036e1280ac4aeb4cf16b78adcde65e9b))

## [1.30.3](https://github.com/portabletext/editor/compare/editor-v1.30.2...editor-v1.30.3) (2025-02-05)


### Bug Fixes

* add debug statements to sync machine ([1b88141](https://github.com/portabletext/editor/commit/1b88141b8df307aa9aac80dbfc18a5ca23cbd8b7))
* **deps:** update sanity monorepo to ^3.73.0 ([8825ef6](https://github.com/portabletext/editor/commit/8825ef6ad652c1227f404eb222b8bcda2638c4c8))
* **deps:** update sanity monorepo to ^3.74.0 ([1a3296e](https://github.com/portabletext/editor/commit/1a3296e506f06a23a2a7a82c9ecec45bfac41f39))
* make sure value sync is retried when busy ([02213d1](https://github.com/portabletext/editor/commit/02213d1b792664488d6a75019170f3599e906be2))
* remove noisy debug statement ([7078fcd](https://github.com/portabletext/editor/commit/7078fcd91934488c42eb6d4ff24135a659db258a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.5
  * devDependencies
    * racejar bumped to 1.1.3

## [1.30.2](https://github.com/portabletext/editor/compare/editor-v1.30.1...editor-v1.30.2) (2025-02-04)


### Bug Fixes

* fall back to custom insert.soft break action ([bf7e467](https://github.com/portabletext/editor/commit/bf7e467d425136c029f7d02d8950a51b8ca43824))
* make line breaks work on WebKit ([9d40139](https://github.com/portabletext/editor/commit/9d401392bbd58bcef7dbc0510b87988b2fe47f5e))
* remove `coreBehavior` export ([1c801dd](https://github.com/portabletext/editor/commit/1c801dd79ea0ccc330d109bafa726bb178cd635a))

## [1.30.1](https://github.com/portabletext/editor/compare/editor-v1.30.0...editor-v1.30.1) (2025-02-03)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([4b48c5b](https://github.com/portabletext/editor/commit/4b48c5b41df1b9002abd430dc5d6c5bf98587a26))

## [1.30.0](https://github.com/portabletext/editor/compare/editor-v1.29.0...editor-v1.30.0) (2025-02-03)


### Features

* **selectors:** add `isOverlappingSelection` ([906f577](https://github.com/portabletext/editor/commit/906f577708c269e05535ae23853ceff71eda2f11))


### Bug Fixes

* add more deprecation messages to `PortableTextEditor` methods ([aaf0736](https://github.com/portabletext/editor/commit/aaf073619e022ebec7cbfde84f8fef4696252b93))
* make sure you can set block object properties using patches ([268dec9](https://github.com/portabletext/editor/commit/268dec92e30a0e5c6ba7a49acac627b92db08d0e))

## [1.29.0](https://github.com/portabletext/editor/compare/editor-v1.28.0...editor-v1.29.0) (2025-02-03)


### Features

* **behaviors:** add `delete` event and action ([d8673cd](https://github.com/portabletext/editor/commit/d8673cd5d7554f29e305ba657fc1e7f40e916a58))
* **plugins:** add `BehaviorPlugin` ([cf45c53](https://github.com/portabletext/editor/commit/cf45c5373012f986ae3c67ac397ac02c58ccb828))
* **plugins:** add `OneLinePlugin` ([e31fd23](https://github.com/portabletext/editor/commit/e31fd232afe4ba0c2c929da6046f2a2ee05d7528))
* **selectors:** add `getSelection(Start|End)Point` ([9dfca56](https://github.com/portabletext/editor/commit/9dfca5604ce47e36a10cb624610b7966c8269841))
* **utils:** add `isSpan/isTextBlock/mergeTextBlocks/splitTextBlock` ([97d08bf](https://github.com/portabletext/editor/commit/97d08bf6bbdb600be30c4965fc4159be9ab63987))


### Bug Fixes

* **behaviors:** don't hijack `insert.soft break` ([111b66f](https://github.com/portabletext/editor/commit/111b66f9fbcb32f9bdd95528cfb19a438e6b7695))
* **behaviors:** raise `insert.blocks` on `deserialization.success` ([324c64b](https://github.com/portabletext/editor/commit/324c64ba1e917c6cd5af583c9432ca69873b1803))

## [1.28.0](https://github.com/portabletext/editor/compare/editor-v1.27.0...editor-v1.28.0) (2025-01-31)


### Features

* **selectors:** add `getActiveAnnotations` ([2c86729](https://github.com/portabletext/editor/commit/2c8672957958c04ce7bfed61d631fabeeb1f7558))
* **selectors:** add `getSelection` ([950df9f](https://github.com/portabletext/editor/commit/950df9f6e7210bf57fa238cf02611cb861766c8d))
* **selectors:** add `getValue` ([b43e54d](https://github.com/portabletext/editor/commit/b43e54dcdd3efa48947f8286f94680ab8c103ad2))


### Bug Fixes

* add deprecation messages to `PortableTextEditor` methods ([e21a591](https://github.com/portabletext/editor/commit/e21a591483c52bc23577c14602485570dc01bd8c))
* avoid crash on `insert.break` before inline object ([a759bd4](https://github.com/portabletext/editor/commit/a759bd4a1cdfa6c0b56b377a5042cd7f8f2ec8a1))
* **deps:** update dependency slate-dom to ^0.112.2 ([50cf13a](https://github.com/portabletext/editor/commit/50cf13a7c60b05239726f49551a1cfa61423652c))
* remove confusing default annotation component ([9c0c903](https://github.com/portabletext/editor/commit/9c0c9033139735894716b2fbf29826ad9d1b161f))
* render default inline object as a span ([8fb51ae](https://github.com/portabletext/editor/commit/8fb51ae540b18008d21e237335538bbf7cb7e009))

## [1.27.0](https://github.com/portabletext/editor/compare/editor-v1.26.3...editor-v1.27.0) (2025-01-29)


### Features

* ship initial `@portabletext/editor/plugins` ([c026557](https://github.com/portabletext/editor/commit/c0265574960cfcdfcf0244dcb84397de8d9555e1))


### Bug Fixes

* avoid clearing initial placeholder value ([072d729](https://github.com/portabletext/editor/commit/072d729c31d4aaf9782a7c2708edeb59f1d4eedd))
* **deps:** update sanity monorepo to ^3.72.1 ([8a82ff8](https://github.com/portabletext/editor/commit/8a82ff8a838d2ee7759060a81fbd819b64061a9c))
* mark `mutation` and `patches` events `[@public](https://github.com/public)` ([17eea93](https://github.com/portabletext/editor/commit/17eea932bc6e923ffeed2a08af98452098c1217d))
* mark `PickFromUnion`/`OmitFromUnion` `[@internal](https://github.com/internal)` ([76dd35b](https://github.com/portabletext/editor/commit/76dd35bf0ce181d885b7a139d6eadf35f1ba7ee8))
* remove `[@internal](https://github.com/internal)` type exports ([8c74ea3](https://github.com/portabletext/editor/commit/8c74ea3c3a2029c5d58b247bb0dad1cc27a43386))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.4

## [1.26.3](https://github.com/portabletext/editor/compare/editor-v1.26.2...editor-v1.26.3) (2025-01-27)


### Bug Fixes

* allow safe behaviors while syncing ([cd2813a](https://github.com/portabletext/editor/commit/cd2813ae0b4c1633e25911b4cc5bac7a504a1b6d))

## [1.26.2](https://github.com/portabletext/editor/compare/editor-v1.26.1...editor-v1.26.2) (2025-01-27)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#735](https://github.com/portabletext/editor/issues/735)) ([f3ce24d](https://github.com/portabletext/editor/commit/f3ce24d52b70c55e668cda64a1477e7b091168a6))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.1.2

## [1.26.1](https://github.com/portabletext/editor/compare/editor-v1.26.0...editor-v1.26.1) (2025-01-24)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.71.2 ([5c815ce](https://github.com/portabletext/editor/commit/5c815ce18ce0e7445cedf09749161d768fe51cc7))
* make text block parsing more lax ([7032886](https://github.com/portabletext/editor/commit/703288667ca038c79baa156f253535189856f59f))
* only generate new `_key`s when necessary ([4552bd4](https://github.com/portabletext/editor/commit/4552bd4b017b9d8782ee5a2c5f37eb0dc9893db7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.3

## [1.26.0](https://github.com/portabletext/editor/compare/editor-v1.25.0...editor-v1.26.0) (2025-01-23)


### Features

* **behaviors:** add `block.(set|unset)` events and actions ([f804157](https://github.com/portabletext/editor/commit/f804157fb2f2bfa6d099dc20086980ac0487eafd))
* **behaviors:** add `insert.block` event and action ([0fd745b](https://github.com/portabletext/editor/commit/0fd745b9358c4622056a3541e44c3b92cb018b0c))
* **core behaviors:** raise `insert.text` event from `insert.sort break` Behavior ([c35b7bd](https://github.com/portabletext/editor/commit/c35b7bd284278f3d7eee89c4fd0382a0c4bbbfc9))
* move `insert.break` at start/end of text block to core Behaviors ([56ff60b](https://github.com/portabletext/editor/commit/56ff60bd1e3c1eb71379b31448fb066d6e3edd49))
* **selectors:** add `isAtThe(End|Start)OfBlock` ([470d533](https://github.com/portabletext/editor/commit/470d53390074878485f2e25d2d8697ee8a22e8c6))
* **utils:** add `getBlockEndPoint` ([e9d208f](https://github.com/portabletext/editor/commit/e9d208f89eb31ae8106f9517d16afdbacdd1ff2f))
* **utils:** add `isEqualSelectionPoints` ([d8c3941](https://github.com/portabletext/editor/commit/d8c394131b6da6b62960ee88a34292d925fae3ad))


### Bug Fixes

* fix issue with inserting block before/after empty block in empty editor ([3622e7d](https://github.com/portabletext/editor/commit/3622e7de303e493a7730b0fc9b524b6cf7db48ae))
* **selectors:** account for no selection in `isSelectionCollapsed` ([e3e5766](https://github.com/portabletext/editor/commit/e3e5766a3b323193ebf0577e2a46b1ee73230ffe))

## [1.25.0](https://github.com/portabletext/editor/compare/editor-v1.24.0...editor-v1.25.0) (2025-01-22)


### Features

* **behaviors:** promote `annotation.toggle` to an event ([8383b3b](https://github.com/portabletext/editor/commit/8383b3bf14106c889d75c86a34311e699e38312e))
* **behaviors:** promote `decorator.(add|remove)` to events ([079b4e4](https://github.com/portabletext/editor/commit/079b4e48ab5ec3103fe619099823486115de82d4))
* **behaviors:** promote `delete.block` to an event ([df466a3](https://github.com/portabletext/editor/commit/df466a3c19cef002c943dd6da9530e80ab7af232))
* **behaviors:** promote `delete.text` to an event ([435de66](https://github.com/portabletext/editor/commit/435de66c00e811b9d4241aa3b6d7d50fd47d2c45))
* **behaviors:** promote `insert.span` to an event ([7b3b2c3](https://github.com/portabletext/editor/commit/7b3b2c34876a852a29499391fe85dd1f092c5011))
* **behaviors:** promote `insert.text block` to an event ([3c78ed2](https://github.com/portabletext/editor/commit/3c78ed2906feed58bc08bbbb2e55ddb5f1742400))
* **behaviors:** promote `list item.(add|remove)` to events ([63cbaca](https://github.com/portabletext/editor/commit/63cbacac38bc95c0e986f35547572a3d8a6d678e))
* **behaviors:** promote `move.*` actions to events ([485e189](https://github.com/portabletext/editor/commit/485e189b0569748a2af40d7d16c4d09fc5ab035a))
* **behaviors:** promote `select.*` actions to events ([81f3858](https://github.com/portabletext/editor/commit/81f385805631b21bb75b3b3c77454437da2b0cb9))
* **behaviors:** promote `style.(add|remove)` to events ([6a5f1f6](https://github.com/portabletext/editor/commit/6a5f1f6a5e645f1d2e1083dd3c6eb447ab0dab8e))
* **behaviors:** promote `text block.*` actions to events ([b9057da](https://github.com/portabletext/editor/commit/b9057daaa1c90fa90802964002f55411be6a6efa))
* **core behaviors:** raise `annotation.(add|remove)` events ([3ff7498](https://github.com/portabletext/editor/commit/3ff74985d90d2552f2f796a2582679442ce280ae))
* **core behaviors:** raise `decorator.(add|remove)` events ([ce99235](https://github.com/portabletext/editor/commit/ce99235d4faadb144acc057016cd75499754a911))
* **core behaviors:** raise `delete.block` and `select` ([ab5fb23](https://github.com/portabletext/editor/commit/ab5fb23c119fcc73cd3bfa777558dc3469505270))
* **core behaviors:** raise `insert.text block` and `select.previous block` events ([17bc728](https://github.com/portabletext/editor/commit/17bc72801b8b40bc812a8e117e2bb2dc39cfa511))
* **core behaviors:** raise `list item.(add|remove)` events ([2b1fdb7](https://github.com/portabletext/editor/commit/2b1fdb7658c360ec82cff41fc82711f9eb07c193))
* **core behaviors:** raise `style.(add|remove)` events ([6f5acb8](https://github.com/portabletext/editor/commit/6f5acb85d5a928cc58ed2929b32bbe981e540fb1))
* **core behaviors:** raise `text block.*` events ([6c4b581](https://github.com/portabletext/editor/commit/6c4b581695a81628e13b84845fcd29de8b3be4de))


### Bug Fixes

* **behaviors:** add missing events to `editor.send(...)` ([03f3192](https://github.com/portabletext/editor/commit/03f31922f25805947277f089132b8372ab280b39))
* **deps:** update sanity monorepo to ^3.71.1 ([6234d33](https://github.com/portabletext/editor/commit/6234d33cd970e2a7f8b9397848181e5c9c8685fc))
* **EditorEventListener:** only emit external events ([f5df2e3](https://github.com/portabletext/editor/commit/f5df2e307c3d38b448e3f3a89084721dd5ba3839))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.2

## [1.24.0](https://github.com/portabletext/editor/compare/editor-v1.23.0...editor-v1.24.0) (2025-01-22)


### Features

* **behaviors:** add `data transfer.set` event and action ([be40256](https://github.com/portabletext/editor/commit/be402565a6b69569b46f677bd5b19f54fe1bb2e9))
* **behaviors:** add `deserialize`/`deserialization.(failure|success)` events ([e7e0327](https://github.com/portabletext/editor/commit/e7e0327383937f6277e90b74043bbd7d484278f1))
* **behaviors:** add `insert.blocks` event and action ([eb3d40f](https://github.com/portabletext/editor/commit/eb3d40fee67be6d904def56fda7bbc3ec9e94535))
* **behaviors:** add `serialize`/`serialization.(failure|success)` events ([7381a27](https://github.com/portabletext/editor/commit/7381a27990e281a813b153e9cc5f382d497b2009))


### Bug Fixes

* **behaviors:** add `reason` to `(de)serialization.failure` events ([e925306](https://github.com/portabletext/editor/commit/e925306ebb2915337c1fe975371dde8967135e10))
* **behaviors:** allow `selection` events when read-only ([3fed8d4](https://github.com/portabletext/editor/commit/3fed8d464c7d6c6821e11f5630cd61befab4a43b))
* **behaviors:** handle `copy/deserialize` events when read-only ([f92006d](https://github.com/portabletext/editor/commit/f92006dfd1955c79541a7c5b482c17a15c7166bf))
* **converters:** implement `application/json` deserialization ([d32e582](https://github.com/portabletext/editor/commit/d32e582366d967f1c1626756d8b57ed324767d72))
* **deps:** update dependency @sanity/diff-match-patch to ^3.2.0 ([371ac30](https://github.com/portabletext/editor/commit/371ac30d5ae8d3eece2fa9789a227a34ae35afc6))
* **deps:** update dependency slate-react to v0.112.1 ([7f34dab](https://github.com/portabletext/editor/commit/7f34dab6a2d914d61632da32c51e2e4da75505f1))
* **deps:** update sanity monorepo to ^3.71.0 ([8527763](https://github.com/portabletext/editor/commit/85277637914a4f9b00e79346874fbe9b3a35eac8))
* improve default `application/x-portable-text` deserialization ([fb36703](https://github.com/portabletext/editor/commit/fb3670364bd54611377742def115d223172a988c))
* improve default `text/html` serialization ([f0c1380](https://github.com/portabletext/editor/commit/f0c138079dc5f94c1b0de721aa39248253648071))
* remove unused `application/x-portable-text-event-origin` ([d018a88](https://github.com/portabletext/editor/commit/d018a88c76f85871a48ab4b51bac0739b6ca43e8))
* **serialize:** remove `drag` `originEvent` ([6610f24](https://github.com/portabletext/editor/commit/6610f2466278b83c3744dce8ecb63be421fa6e43))
* **sliceBlocks:** better inline object handling ([1007296](https://github.com/portabletext/editor/commit/100729683b05be67a81f71a15fc0b86cc96bcd83))
* **sliceBlocks:** handle starting on a non-text block ([b6e936d](https://github.com/portabletext/editor/commit/b6e936d804adc2eced79f9fa52f67ecffba90d0d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.1
    * @portabletext/patches bumped to 1.1.2

## [1.23.0](https://github.com/portabletext/editor/compare/editor-v1.22.0...editor-v1.23.0) (2025-01-20)


### Features

* allow updating `keyGenerator` using event ([b3b31dc](https://github.com/portabletext/editor/commit/b3b31dcd62549bb3a015f973dd399d93aae39236))


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#711](https://github.com/portabletext/editor/issues/711)) ([dc88d46](https://github.com/portabletext/editor/commit/dc88d4696bee390d1eac18296b251e3b0600a2bb))
* **utils:** improve `sliceBlocks` ([17e4eaa](https://github.com/portabletext/editor/commit/17e4eaac7c91f063bd84cfc9fe6177b1ba6be4ba))

## [1.22.0](https://github.com/portabletext/editor/compare/editor-v1.21.6...editor-v1.22.0) (2025-01-17)


### Features

* **selectors:** add `getSelectedSlice` ([401429e](https://github.com/portabletext/editor/commit/401429e112e8a87f24a85c4675c2ae3c629b883b))
* **utils:** add `sliceBlocks` ([d623151](https://github.com/portabletext/editor/commit/d623151e666e12a48619dc9aa58045e0baaad4d8))


### Bug Fixes

* avoid accidentally titling `image` `"Tmp Image"` ([1c0cb2c](https://github.com/portabletext/editor/commit/1c0cb2c4ead0814854b409040c863d66e1ee6323))

## [1.21.6](https://github.com/portabletext/editor/compare/editor-v1.21.5...editor-v1.21.6) (2025-01-15)


### Bug Fixes

* **deps:** update dependency debug to ^4.4.0 ([388a8fa](https://github.com/portabletext/editor/commit/388a8fa1c5ca36c5be0c1a2e1dbca5c958690d34))
* **deps:** update sanity monorepo to ^3.70.0 ([b345181](https://github.com/portabletext/editor/commit/b345181e424e8702f88f5d2f10a0ca7cbce0061e))
* **deps:** Update xstate ([35e12a1](https://github.com/portabletext/editor/commit/35e12a18fbeefc940ca89e442ffc9bce54d16050))
* forward `keyGenerator` to `block-tools` ([dedba0c](https://github.com/portabletext/editor/commit/dedba0cb40219fe239938acba1d04bee99b092c5))
* remove redundant calls to `normalizeBlock` ([e1bf217](https://github.com/portabletext/editor/commit/e1bf217499257bc581ca1220525ddf27a5500ad4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.1.0

## [1.21.5](https://github.com/portabletext/editor/compare/editor-v1.21.4...editor-v1.21.5) (2025-01-14)


### Bug Fixes

* **editor:** align workspace package references ([ed09c5d](https://github.com/portabletext/editor/commit/ed09c5dac4db8db8cba2839beaa3a861b97a7f66))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.0.2

## [1.21.4](https://github.com/portabletext/editor/compare/editor-v1.21.3...editor-v1.21.4) (2025-01-14)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/block-tools bumped to 1.0.1

## [1.21.3](https://github.com/portabletext/editor/compare/editor-v1.21.2...editor-v1.21.3) (2025-01-13)


### Bug Fixes

* **editor:** use `@portabletext/block-tools` ([01f70e6](https://github.com/portabletext/editor/commit/01f70e6b0dda909742129339630c2cedb1cc5db2))

## [1.21.2](https://github.com/portabletext/editor/compare/editor-v1.21.1...editor-v1.21.2) (2025-01-13)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([56f2eef](https://github.com/portabletext/editor/commit/56f2eefa12727077bc817f313e9a601cf551b836))
* **deps:** update react compiler dependencies 🤖 ✨ ([#684](https://github.com/portabletext/editor/issues/684)) ([573eb23](https://github.com/portabletext/editor/commit/573eb23f63d5527971e183b56ebf9af56057e8fc))

## [1.21.1](https://github.com/portabletext/editor/compare/editor-v1.21.0...editor-v1.21.1) (2025-01-10)


### Bug Fixes

* automatically recover from faulty operations ([710d079](https://github.com/portabletext/editor/commit/710d079cef45cdad9a1cfce6e0c9d066499f56ea))
* **behaviors:** fall back to built-in Slate `select` and `insertText` events ([ce182c2](https://github.com/portabletext/editor/commit/ce182c2221260f0e52a71ca76043123c2f4f97a4))
* guard against potential infinite loops ([aa5b43f](https://github.com/portabletext/editor/commit/aa5b43f29a2782ba95c8e863ada78a408db28f92))

## [1.21.0](https://github.com/portabletext/editor/compare/editor-v1.20.0...editor-v1.21.0) (2025-01-09)


### Features

* **behaviors:** allow raising of custom events ([4fb287c](https://github.com/portabletext/editor/commit/4fb287c00610088bb2016e59680224416299241b))
* **behaviors:** support custom behavior events ([3e61f6d](https://github.com/portabletext/editor/commit/3e61f6dc83baafa839e44756a69daa7c02a93495))
* **selectors:** add `isPointAfterSelection` ([83f50f7](https://github.com/portabletext/editor/commit/83f50f79e4330c89db9ca280828bf41dca697677))
* **selectors:** add `isPointBeforeSelection` ([e07875b](https://github.com/portabletext/editor/commit/e07875b072e9f90358f747c76a0e5991cbb7fd8d))
* ship initial `@portabletext/editor/utils` ([c0022ad](https://github.com/portabletext/editor/commit/c0022ad98b5871621717e336bfd308578f2294d4))


### Bug Fixes

* **deps:** update sanity monorepo to ^3.69.0 ([f9336b8](https://github.com/portabletext/editor/commit/f9336b81e06735c86e1fbb980282a5b805d5ecb4))
* export `PortableTextSpan` ([5dcb14a](https://github.com/portabletext/editor/commit/5dcb14aaf62586280c49fbb497ee67f0e5878a4b))
* **selectors:** fix issue with `getSelectionText` ([aa8e247](https://github.com/portabletext/editor/commit/aa8e2478eb71881ed8eb5099c8c03c60a05452c7))
* **utils:** make `spanSelectionPointToBlockOffset` more lax ([7593026](https://github.com/portabletext/editor/commit/759302641219a5ce79c5b077d3240f77f5521fd2))

## [1.20.0](https://github.com/portabletext/editor/compare/editor-v1.19.0...editor-v1.20.0) (2025-01-07)


### Features

* **behavior:** add `editor.registerBehavior` for ad-hoc behavior registering ([b482ad0](https://github.com/portabletext/editor/commit/b482ad0c86a1a5fe39789efd4074e3000496463d))


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([b58e9f9](https://github.com/portabletext/editor/commit/b58e9f900488593f94b97a7268aecd0305004f96))
* remove styled-components ([f7fcd53](https://github.com/portabletext/editor/commit/f7fcd534a43dc668c62b5294dfd780316dac73f8))
* temp downgrade compiler runtime ([1b2ecea](https://github.com/portabletext/editor/commit/1b2ecea0c488ea9edf68a915ce6b984095f181f9))

## [1.19.0](https://github.com/portabletext/editor/compare/editor-v1.18.7...editor-v1.19.0) (2025-01-03)


### Features

* **behavior:** add `raise` action for raising synthetic events ([3cd64ac](https://github.com/portabletext/editor/commit/3cd64ac994f2e384bd7782424bc6f6a98286a650))
* **behavior:** add `select` event ([b2dcb37](https://github.com/portabletext/editor/commit/b2dcb372f5d7796ac44b35a1ac961d81304e5689))


### Bug Fixes

* **behavior:** remove `annotation.toggle` and `decorator.(add|remove)` events ([3888535](https://github.com/portabletext/editor/commit/38885357f0bb17a7ad221bf7b132b5c97e7fdd64))
* **behavior:** remove `reselect` action ([eddd8b3](https://github.com/portabletext/editor/commit/eddd8b3aeddb12e2a29436ba23a39fce89294286))
* **selectors:** fix issue with `getSelectedSpans` selecting too much ([bd0f8c0](https://github.com/portabletext/editor/commit/bd0f8c03e84f0fd58193215409c1572f8e3f4f2a))

## [1.18.7](https://github.com/portabletext/editor/compare/editor-v1.18.6...editor-v1.18.7) (2024-12-30)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([2c6c8b0](https://github.com/portabletext/editor/commit/2c6c8b04415a476f78c5c1be2ec7d1091ac54ad8))
* **deps:** Update xstate ([293da67](https://github.com/portabletext/editor/commit/293da6771e372d45ed54b11362c4e40040de8e23))

## [1.18.6](https://github.com/portabletext/editor/compare/editor-v1.18.5...editor-v1.18.6) (2024-12-24)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([566120a](https://github.com/portabletext/editor/commit/566120a4c3b99bca6250ddc5255793bb37076365))

## [1.18.5](https://github.com/portabletext/editor/compare/editor-v1.18.4...editor-v1.18.5) (2024-12-20)


### Bug Fixes

* **deps:** update sanity monorepo to ^3.68.2 ([4a17f61](https://github.com/portabletext/editor/commit/4a17f616bba3c80b63c483f8f2e2ada9b6c69343))
* **deps:** update sanity monorepo to ^3.68.3 ([4b633fa](https://github.com/portabletext/editor/commit/4b633fa15521b4fd2a65a3f97b284f65be3678c7))
* **emoji picker:** only abort on Escape ([5a0ef7b](https://github.com/portabletext/editor/commit/5a0ef7b116d9dd2b5ff9145188411a8ed7741f28))
* guard against trying to select a block directly ([bbd3a22](https://github.com/portabletext/editor/commit/bbd3a22e6740416dcc5e0584b2305eeb682cc6f0))

## [1.18.4](https://github.com/portabletext/editor/compare/editor-v1.18.3...editor-v1.18.4) (2024-12-20)


### Bug Fixes

* **schema definition:** remove `icon` ([b83c1e4](https://github.com/portabletext/editor/commit/b83c1e47c6bced5df40b1503e1cdb3f5a505de5e))

## [1.18.3](https://github.com/portabletext/editor/compare/editor-v1.18.2...editor-v1.18.3) (2024-12-20)


### Bug Fixes

* **link behavior:** improve URL matching ([a019665](https://github.com/portabletext/editor/commit/a019665e0c5545e8e01c35ad7e8ca7128c97a547))

## [1.18.2](https://github.com/portabletext/editor/compare/editor-v1.18.1...editor-v1.18.2) (2024-12-19)


### Bug Fixes

* **link behavior:** improve URL matching ([2aacbc8](https://github.com/portabletext/editor/commit/2aacbc8a132ffcad6317406efe0a7fdc9c9e50b7))

## [1.18.1](https://github.com/portabletext/editor/compare/editor-v1.18.0...editor-v1.18.1) (2024-12-19)


### Bug Fixes

* **emoji picker:** direct-hit : selection ([5a9d57c](https://github.com/portabletext/editor/commit/5a9d57c41aba24ca2a4330e0a21ca3618b34d194))

## [1.18.0](https://github.com/portabletext/editor/compare/editor-v1.17.1...editor-v1.18.0) (2024-12-19)


### Features

* add `editor.getSnapshot()` ([f74cbea](https://github.com/portabletext/editor/commit/f74cbeae8ce9664d75fc0228eb8e701d5bed825a))


### Bug Fixes

* **deps:** update sanity monorepo to ^3.68.1 ([97e42e1](https://github.com/portabletext/editor/commit/97e42e1fe8670a36d04b02e5b5a7d461d791bb5d))
* offer `value` alternative to `snapshot` ([1e91d07](https://github.com/portabletext/editor/commit/1e91d079c971fe0d395af005bc192ea226797e36))
* **types:** deprecate `PortableTextEditor` and `usePortableTextEditor(Selection)()` ([01a4009](https://github.com/portabletext/editor/commit/01a400954c063bd13a5017fe039733babadd0e3b))
* **types:** mark Behavior API `beta` and all other new APIs `public` ([5fc4a1e](https://github.com/portabletext/editor/commit/5fc4a1e02b3088360caa622a1db5cfc6b6dae05d))

## [1.17.1](https://github.com/portabletext/editor/compare/editor-v1.17.0...editor-v1.17.1) (2024-12-18)


### Bug Fixes

* **deps:** update dependency @sanity/diff-match-patch to ^3.1.2 ([29af4b0](https://github.com/portabletext/editor/commit/29af4b00c2d2631d38252125a2312e8c5e4c83d1))
* **deps:** update sanity monorepo to ^3.68.0 ([23fc94c](https://github.com/portabletext/editor/commit/23fc94cb098a42ac4def3c8dc5bbc46bde63e774))
* **emoji picker:** only hijack ArrowUp/ArrowDown if we have matches ([f0356de](https://github.com/portabletext/editor/commit/f0356deba787ba6d5eef7948fe51065244f5d7e0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.1.0 to 1.1.1

## [1.17.0](https://github.com/portabletext/editor/compare/editor-v1.16.4...editor-v1.17.0) (2024-12-18)


### Features

* **behavior:** add experimental emoji picker behavior ([bbe5ebf](https://github.com/portabletext/editor/commit/bbe5ebf56ea387c9b27f6b30b47d4b5c2832820f))

## [1.16.4](https://github.com/portabletext/editor/compare/editor-v1.16.3...editor-v1.16.4) (2024-12-17)


### Bug Fixes

* **event:** allow `annotation.add` and `annotation.remove` ([64d54e3](https://github.com/portabletext/editor/commit/64d54e36d7380bcb5137a41c08b344264df2604d))

## [1.16.3](https://github.com/portabletext/editor/compare/editor-v1.16.2...editor-v1.16.3) (2024-12-16)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([f6845e9](https://github.com/portabletext/editor/commit/f6845e9fbda5df7471ac72bc6a04e40df1941a78))

## [1.16.2](https://github.com/portabletext/editor/compare/editor-v1.16.1...editor-v1.16.2) (2024-12-16)


### Bug Fixes

* **perf:** stream the initial value into the editor ([135288b](https://github.com/portabletext/editor/commit/135288b582527683390e416f9f64e0c709deaa37))

## [1.16.1](https://github.com/portabletext/editor/compare/editor-v1.16.0...editor-v1.16.1) (2024-12-16)


### Bug Fixes

* **event:** replace `toggle readOnly` with `update readOnly` ([0e6efbc](https://github.com/portabletext/editor/commit/0e6efbc70e5e23d4b36a9d4b897809fc00ceb546))

## [1.16.0](https://github.com/portabletext/editor/compare/editor-v1.15.3...editor-v1.16.0) (2024-12-13)


### Features

* add `activeDecorators` to `EditorContext` ([e38e020](https://github.com/portabletext/editor/commit/e38e020ce108864ec3f4a270ec5301cfb9f708d6))
* **selectors:** add `getActiveStyle` and `isActiveStyle` ([37ba256](https://github.com/portabletext/editor/commit/37ba2567b7d299e7263cf4ce513e6184a28d7a14))
* **selectors:** add `getSelectedSpans` ([55b5e9e](https://github.com/portabletext/editor/commit/55b5e9e0beb3340d0e9495629dacf026b0357991))
* **selectors:** add `isActiveAnnotation` ([6f7a172](https://github.com/portabletext/editor/commit/6f7a1725bf086646ff984a8349d89e1004a1046c))
* **selectors:** add `isActiveListItem` ([efd64bf](https://github.com/portabletext/editor/commit/efd64bfe1de4c8f1d401f91381179563fbcbe21c))
* **selectors:** add `isSelection(Collapsed|Expanded)` ([8440022](https://github.com/portabletext/editor/commit/8440022a8743d367ee73ae47427a19d7530f44bf))
* **selectors:** add higher-order `isDecoratorActive` ([4ce4e55](https://github.com/portabletext/editor/commit/4ce4e554de3c107689430c1fde08839beec9841d))


### Bug Fixes

* abort value sync if value hasn't changed ([1590795](https://github.com/portabletext/editor/commit/15907955f391367869ff4d8dd1399ff1f050c97f))
* **deps:** update sanity monorepo to ^3.67.0 ([3526fa5](https://github.com/portabletext/editor/commit/3526fa507a3dce51bb206ca0de045d26730881f3))
* **deps:** update sanity monorepo to ^3.67.1 ([1852219](https://github.com/portabletext/editor/commit/18522190a7eb3194c02b428cb2e2997e539715d0))
* make editor read-only while setting up ([3ff4318](https://github.com/portabletext/editor/commit/3ff431853e7c3a385698f30b2bba7e3f160feb87))
* **perf:** don't emit selection while setting up ([6f92cf2](https://github.com/portabletext/editor/commit/6f92cf29851441059be3e0e346a59b9a35601558))
* **perf:** don't sync range decorations while setting up ([af70759](https://github.com/portabletext/editor/commit/af7075954b035956413317fecb56fbbb67bc214d))
* **selectors:** account for non-span decorators in `isActiveDecorator` ([9e287da](https://github.com/portabletext/editor/commit/9e287da46755fd7bb05069757aaef277f46d40fa))
* **selectors:** rename `isDecoratorActive`-&gt;`isActiveDecorator` ([184f7f6](https://github.com/portabletext/editor/commit/184f7f6ddd86f14cf2ee294a9914b44c99540a7b))
* **selectors:** rename `selectionIsCollapsed`-&gt;`isSelectionCollapsed` ([6d880d0](https://github.com/portabletext/editor/commit/6d880d03440a531f37ccfc9afb9dbdbb6b72c047))

## [1.15.3](https://github.com/portabletext/editor/compare/editor-v1.15.2...editor-v1.15.3) (2024-12-09)


### Bug Fixes

* **behavior:** make `EditorSnapshot.selection` nullable ([a69f570](https://github.com/portabletext/editor/commit/a69f57023ddef599eecca3c30843e5a7a02c3216))
* **behavior:** namespace all `select.*` actions ([7c04667](https://github.com/portabletext/editor/commit/7c046673ec59682df6b8ec39e84476ccbe026b0c))
* **types:** reexport `PortableTextMemberSchemaTypes` as `EditorSchema` ([2d70782](https://github.com/portabletext/editor/commit/2d707825ef41a7f02cee9c3aacaafbe165a62193))

## [1.15.2](https://github.com/portabletext/editor/compare/editor-v1.15.1...editor-v1.15.2) (2024-12-09)


### Bug Fixes

* **behavior:** add `context`/`event` back in `BehaviorActionIntendSet` callback ([af9e9e4](https://github.com/portabletext/editor/commit/af9e9e462d4c14506d27c00d70cc3618eb241dde))
* **behavior:** export behaviors and behavior types from subpath ([618cc16](https://github.com/portabletext/editor/commit/618cc16a338298f4b0826c7c2c02864104069df4))
* **deps:** update react compiler dependencies 🤖 ✨ ([#540](https://github.com/portabletext/editor/issues/540)) ([fe3438a](https://github.com/portabletext/editor/commit/fe3438ace20a1f81b6a9238dcde7fb2244c8753f))

## [1.15.1](https://github.com/portabletext/editor/compare/editor-v1.15.0...editor-v1.15.1) (2024-12-08)


### Bug Fixes

* **deps:** Update slate to v0.112.0 ([6caa85a](https://github.com/portabletext/editor/commit/6caa85aae2ae287e48fd32c20a92e0bd01893df4))

## [1.15.0](https://github.com/portabletext/editor/compare/editor-v1.14.2...editor-v1.15.0) (2024-12-06)


### Features

* support React 19 ([#526](https://github.com/portabletext/editor/issues/526)) ([cb87f1b](https://github.com/portabletext/editor/commit/cb87f1bae5f4e172f20f65c01cbbb7bdf41d7a8d))

## [1.14.2](https://github.com/portabletext/editor/compare/editor-v1.14.1...editor-v1.14.2) (2024-12-06)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.66.1 ([#510](https://github.com/portabletext/editor/issues/510)) ([6d1f0d0](https://github.com/portabletext/editor/commit/6d1f0d0e5401ab8f326388179958ad53fb624a2a))
* **performance regression:** bail out quicker on native behavior events ([437e87e](https://github.com/portabletext/editor/commit/437e87e7efff54f6fea6157462a0391a4317f53e))

## [1.14.1](https://github.com/portabletext/editor/compare/editor-v1.14.0...editor-v1.14.1) (2024-12-06)


### Bug Fixes

* **editor-events:** emit `blurred/focused` instead of `blur/focus` ([30a93d4](https://github.com/portabletext/editor/commit/30a93d4af81f58559aee55d99b07db0284629221))

## [1.14.0](https://github.com/portabletext/editor/compare/editor-v1.13.0...editor-v1.14.0) (2024-12-06)


### Features

* add experimental `useEditorSelector` ([04a290c](https://github.com/portabletext/editor/commit/04a290c7ad7b2d4b156a6f18fbe411fcde920023))
* **behavior:** add 'move block down/up' actions ([d53a844](https://github.com/portabletext/editor/commit/d53a84466259297a187e5bddc1c3bc623c4690de))
* **behavior:** add `blur` event and action ([e4720e5](https://github.com/portabletext/editor/commit/e4720e5b2ee468fba2347239b0db3d5af59c55c0))
* **behavior:** add `insert.inline object` event and action ([39407b8](https://github.com/portabletext/editor/commit/39407b8dee8a8070f0bace569256b7a4e8062819))
* **behavior:** add `list item.toggle` event and `list item.(add|remove|toggle)` actions ([2152950](https://github.com/portabletext/editor/commit/2152950dc11d0ad638c7e67531608841bbe25ec7))
* **behavior:** add `noop` action ([0139a7c](https://github.com/portabletext/editor/commit/0139a7cf7d494eff2d524f175132d82213ff5243))
* **behavior:** add `style.toggle` event and `style.(add|remove|toggle)` actions ([12825bd](https://github.com/portabletext/editor/commit/12825bd4c2ea70ff259847a858b1a8368f539b8a))
* **behavior:** allow code editor behaviors to move multiple blocks ([5da6b4f](https://github.com/portabletext/editor/commit/5da6b4fa324a7ecbc7b722af905da41ee8905172))
* **behavior:** allow imperative `decorator.(add|remove|toggle)` ([bb5fbfd](https://github.com/portabletext/editor/commit/bb5fbfd0e2199c8997aa436783e73c7e2d07e54c))
* **behavior:** allow imperative `insert block object` ([eaeb5ed](https://github.com/portabletext/editor/commit/eaeb5ed1a413a34ba5f5421d9bdc8c3579201ea9))
* **behavior:** allow imperative `insert.inline object` ([3ddf73d](https://github.com/portabletext/editor/commit/3ddf73d1347f4b11ed8933622d1fd3ace16054bd))
* **behavior:** allow imperative `list item.toggle` ([3927074](https://github.com/portabletext/editor/commit/39270745a968f7973e1133f83957525dbac8cf79))
* **behavior:** allow imperative `style.toggle` ([174b64d](https://github.com/portabletext/editor/commit/174b64d002aed98e427bb26f0cb9305fed3a329d))
* export experimental `getActiveListItem` selector ([2fd7261](https://github.com/portabletext/editor/commit/2fd72612eb5df50712efef5e9c428db3855cb09a))


### Bug Fixes

* **behavior:** '(un)set block' actions now only accept one path ([35ed503](https://github.com/portabletext/editor/commit/35ed5030e517a219547b813327d4621436026ff0))
* **behavior:** mark `editable` as `_internal` ([a8156fc](https://github.com/portabletext/editor/commit/a8156fccc58ec0c8004c5c6a4e7706ade51c4b6b))
* **behavior:** merge `EditorContext` and `EditorState` into `EditorSnapshot` ([27ee5ac](https://github.com/portabletext/editor/commit/27ee5ac0e3df43589ecf0eaf53a1dca4c4ddb1a0))
* **behavior:** move `schema` from `EditorState` to `EditorContext` ([cc3d61b](https://github.com/portabletext/editor/commit/cc3d61bc4de423ae8bc49e8ec45cd6caad39773d))
* **behavior:** namespace all `delete.*` events and actions ([915d373](https://github.com/portabletext/editor/commit/915d373bd24e9e5f66208f1015bdef09382d4948))
* **behavior:** namespace all `insert.*` events and actions ([982cc9e](https://github.com/portabletext/editor/commit/982cc9ec66a56e98fa8d9a0bf3cabbad0b7d9250))
* **behavior:** namespace all `move.*` actions ([46b1249](https://github.com/portabletext/editor/commit/46b124996eb4e3ab559d5cd4ddadb96a80e85604))
* **behavior:** remove `noop` event ([763fdff](https://github.com/portabletext/editor/commit/763fdffde290e2f86db7e7cdaf5072c6a3ae7ad2))
* **behavior:** rename `(set|unset) block` to `text block.(set|unset)` ([0ef0396](https://github.com/portabletext/editor/commit/0ef039669e5256a73e23da3386f9026ad61c6981))
* **behavior:** rename `BehaviorContext`-&gt;`EditorState` ([88fd672](https://github.com/portabletext/editor/commit/88fd672716da84a6707b53cfb5eaf26388a97a1e))
* **behavior:** rename `blockPath`-&gt;`at` in 'move block' action ([4bb435e](https://github.com/portabletext/editor/commit/4bb435ee68687715e8180fe24674dad14143857b))
* **behavior:** rename `config`-&gt;`initialConfig` ([48718be](https://github.com/portabletext/editor/commit/48718be23346d084bc574db1ffd5bf88938634a3))
* **behavior:** rename `useEditorContext`-&gt;`useEditor` ([927e165](https://github.com/portabletext/editor/commit/927e1650b97506f3a59aa869a757f901b04df0bd))
* **behavior:** route legacy focus method through behaviors ([3d091c7](https://github.com/portabletext/editor/commit/3d091c791d6516b1e7f65bfbe404059711a5dc37))
* **behavior:** simplify `BehaviorActionIntendSet` callback ([a6f9a48](https://github.com/portabletext/editor/commit/a6f9a48f2c402024deac4fbec26855aefe858789))
* **deps:** update sanity monorepo to ^3.66.0 ([#505](https://github.com/portabletext/editor/issues/505)) ([58fa31e](https://github.com/portabletext/editor/commit/58fa31e623b4f8c2a3f25a0a8827a11dbfbb82c9))
* guard against nullable target block when producing move node patch ([eb7049f](https://github.com/portabletext/editor/commit/eb7049f80cd05de8f62077decf8726c6397bfcf3))
* **selectors:** export all experimental selectors ([cf042a7](https://github.com/portabletext/editor/commit/cf042a7e611db753a04f2d5e06c07e09aa4fbcef))
* switch to `"type": "module"` ([a8c7c78](https://github.com/portabletext/editor/commit/a8c7c789e750dfa4699d06b8b2311e42786d5210))

## [1.13.0](https://github.com/portabletext/editor/compare/editor-v1.12.3...editor-v1.13.0) (2024-12-03)


### Features

* **behavior:** add 'copy' event ([54db5e9](https://github.com/portabletext/editor/commit/54db5e978f36371e3e64453c97382a9c653208cd))
* **behavior:** add 'key.down' and 'key.up' events ([99d7335](https://github.com/portabletext/editor/commit/99d733520d48e34098ac7702720d7a3c96149616))
* **behavior:** add 'move block' action ([69a259e](https://github.com/portabletext/editor/commit/69a259e5f144df97833bfa2d222a36afb2deea46))
* **behavior:** add 'select previous block' and 'select next block' actions ([9b5fecb](https://github.com/portabletext/editor/commit/9b5fecb34deeab0805f2d8d0c2712ba205706e92))
* **behavior:** ship experimental code editor behaviors ([b97b218](https://github.com/portabletext/editor/commit/b97b218b9a696c71d1e1a517c5dd6e6d72a5d071))


### Bug Fixes

* **behavior:** allow guards to return falsy ([21cb638](https://github.com/portabletext/editor/commit/21cb638bf3baad74f6937bb79c73505c7e94958f))
* **behavior:** fix `selectionIsCollapsed` utility function ([dd67720](https://github.com/portabletext/editor/commit/dd67720c7418eb9120ad5d7e0f008766f55a9f59))
* **behavior:** rename `clipboardData`-&gt;`data` ([6e139c8](https://github.com/portabletext/editor/commit/6e139c80986585c9d93f61053eb0781e8d532f70))
* **behavior:** use React event as 'native' event ([35a9fcf](https://github.com/portabletext/editor/commit/35a9fcfc9822443da450fae802b5905d06ba6ede))
* make sure you can hit Enter on an expanded selection ([d2ebbbe](https://github.com/portabletext/editor/commit/d2ebbbe90e4f977970476c149bf0b74427c910ae))
* remove decorators from new block when splitting empty decorated block ([109b7c4](https://github.com/portabletext/editor/commit/109b7c41465813bb9b8b9e0780e6f695b00bc678))

## [1.12.3](https://github.com/portabletext/editor/compare/editor-v1.12.2...editor-v1.12.3) (2024-11-29)


### Bug Fixes

* **deps:** inline and simplify `isHotkey` dependency ([2040452](https://github.com/portabletext/editor/commit/2040452f1bd311748349a523a5cd30dd487299d6))

## [1.12.2](https://github.com/portabletext/editor/compare/editor-v1.12.1...editor-v1.12.2) (2024-11-28)


### Bug Fixes

* **markdown behavior:** fix ordered list matcher regex ([4ca9114](https://github.com/portabletext/editor/commit/4ca911413a63e013f4af9dee99886cc634170f0a))
* **markdown behavior:** make list toggling disregard spans ([3b996bd](https://github.com/portabletext/editor/commit/3b996bdab1414492bb02065ba1f9d708d178e725))

## [1.12.1](https://github.com/portabletext/editor/compare/editor-v1.12.0...editor-v1.12.1) (2024-11-28)


### Bug Fixes

* **behavior:** allow inserting blocks 'before' ([f66b3b6](https://github.com/portabletext/editor/commit/f66b3b6ea5e28660fd648b8a6159514b6f62f8de))
* **deps:** Update sanity monorepo to ^3.65.0 ([6062310](https://github.com/portabletext/editor/commit/60623109400a114a89a7d6f3f60fd1b58c1cf783))
* **deps:** Update sanity monorepo to ^3.65.1 ([ef4c370](https://github.com/portabletext/editor/commit/ef4c3700b53ae23d3958d9d1d407d826dd0f94c6))
* **markdown behavior:** allow inserting hr with trailing content ([c0eb8e0](https://github.com/portabletext/editor/commit/c0eb8e0bb4672cc17ef57c9e06f5bed0ba6a4112))

## [1.12.0](https://github.com/portabletext/editor/compare/editor-v1.11.3...editor-v1.12.0) (2024-11-26)


### Features

* **behavior:** add 'delete block' action ([bb111ea](https://github.com/portabletext/editor/commit/bb111ea65f22a4ccf671a0c6dce8c020f46ca87e))
* **behavior:** improve 'insert text block' action ([81c90e2](https://github.com/portabletext/editor/commit/81c90e207cf5d71a221e6146b1722ef523d4d776))
* **markdown behavior:** support pasting horisontal rules ([27fecc9](https://github.com/portabletext/editor/commit/27fecc960bd2d9b9b339cef3601f3409908500da))


### Bug Fixes

* **behavior:** add 'delete text' and remove 'delete' action ([29a2c95](https://github.com/portabletext/editor/commit/29a2c95c27fca2ad95cfd9bfb86c63c956384109))
* **markdown behavior:** ignore spans in auto blockquote/heading/llist behaviors ([a1cd1ee](https://github.com/portabletext/editor/commit/a1cd1eeac45939575bbb019febe115d401b1815a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.0.0

## [1.11.3](https://github.com/portabletext/editor/compare/editor-v1.11.2...editor-v1.11.3) (2024-11-25)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#456](https://github.com/portabletext/editor/issues/456)) ([bb70432](https://github.com/portabletext/editor/commit/bb70432c97c3cc3bb5ba2b85e2629df5112ca531))

## [1.11.2](https://github.com/portabletext/editor/compare/editor-v1.11.1...editor-v1.11.2) (2024-11-22)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.3 ([ad0da8f](https://github.com/portabletext/editor/commit/ad0da8fad181adc9ff74b13abdb187297e76cf93))
* make sure a subsequent empty action set can't trigger a default action ([50f34b4](https://github.com/portabletext/editor/commit/50f34b47d40db908a57ffe7c6823b767fa2084c6))

## [1.11.1](https://github.com/portabletext/editor/compare/editor-v1.11.0...editor-v1.11.1) (2024-11-21)


### Bug Fixes

* **regression:** don't block operations when readOnly ([c35f646](https://github.com/portabletext/editor/commit/c35f646c13015c58136d7c6394acbb488d308f29))

## [1.11.0](https://github.com/portabletext/editor/compare/editor-v1.10.2...editor-v1.11.0) (2024-11-21)


### Features

* add `EditorProvider` and `EditorEventListener` ([55edcde](https://github.com/portabletext/editor/commit/55edcde2262e2b798b79cff33b594855f1ff8808))


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.2 ([7b6d138](https://github.com/portabletext/editor/commit/7b6d1389165919745c9213a5d63f92e46ca59021))
* **useEditor:** allow configure of initial readOnly and remove Editor.readOnly ([edcee2c](https://github.com/portabletext/editor/commit/edcee2cfcbc7b3b31f824292dfc6ad6f1aca3cf5))
* **useEditor:** improve types and memoization ([41ef38a](https://github.com/portabletext/editor/commit/41ef38a9ea6132cf701d03bf193ed9a457ce609f))

## [1.10.2](https://github.com/portabletext/editor/compare/editor-v1.10.1...editor-v1.10.2) (2024-11-18)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#430](https://github.com/portabletext/editor/issues/430)) ([ea98c12](https://github.com/portabletext/editor/commit/ea98c12400a8a3a172dd20c93d4f828f0266461a))
* remove online/offline listener ([3395d62](https://github.com/portabletext/editor/commit/3395d62fc3e2a9a5bf6c79e49e522784a8ec7c94))

## [1.10.1](https://github.com/portabletext/editor/compare/editor-v1.10.0...editor-v1.10.1) (2024-11-18)


### Bug Fixes

* **experimental `useEditor`:** move value update handling to `editor` ([c064849](https://github.com/portabletext/editor/commit/c06484977a4e0055d5e25005eeebfe88f9214341))
* **experimental `useEditor`:** remove `editorRef` prop ([2b9c07c](https://github.com/portabletext/editor/commit/2b9c07c74c08c868d13540de3d37fc28a94649cf))
* guard against possibly undefined `window` ([34836ca](https://github.com/portabletext/editor/commit/34836caf038f66b413f4f8ec6e8c33084817224c))

## [1.10.0](https://github.com/portabletext/editor/compare/editor-v1.9.0...editor-v1.10.0) (2024-11-15)


### Features

* **markdown behavior:** support * and _ for horizontal rules ([1e13952](https://github.com/portabletext/editor/commit/1e139523cdeea7935cb3041d511d7532a2bb8de8))


### Bug Fixes

* **link behavior:** rename mapLinkAnnotation-&gt;linkAnnotation ([602ea1f](https://github.com/portabletext/editor/commit/602ea1f2065eae3ed4915e01d82c4561226b012a))
* **markdown behavior:** rename and clean up schema mappings ([23b1450](https://github.com/portabletext/editor/commit/23b1450024eea58a6bfeed96a9902548cc96cf4e))

## [1.9.0](https://github.com/portabletext/editor/compare/editor-v1.8.0...editor-v1.9.0) (2024-11-15)


### Features

* **behavior:** export small link behaviors plugin ([5ca657e](https://github.com/portabletext/editor/commit/5ca657eafc70ba7dd34ad57fd3ccd342c310f4ea))
* **behavior:** support 'insert span' action ([f5a8531](https://github.com/portabletext/editor/commit/f5a85311ab40d11a6470d6705aa7060d39b79c6c))
* **behavior:** support 'paste' action and event ([8844ae4](https://github.com/portabletext/editor/commit/8844ae456aecbc3e748f210208483b629e96a512))


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.1 ([0e9ec3d](https://github.com/portabletext/editor/commit/0e9ec3da435bcc4f6cb612c585d70680d9e054c4))
* fix isMarkActive false positive when only selecting objects ([05cccad](https://github.com/portabletext/editor/commit/05cccada65eb8fab3b73a023eba700e86150b0e0))
* fix issue with expanded selection potentially removing selection ([fe01442](https://github.com/portabletext/editor/commit/fe01442b16c001330dd9ba4dd78d6bccf322dbeb))
* only prevent default paste event when necessary ([49303e2](https://github.com/portabletext/editor/commit/49303e22ef802d5edc52dac7b098a371fa42d58b))

## [1.8.0](https://github.com/portabletext/editor/compare/editor-v1.7.1...editor-v1.8.0) (2024-11-13)


### Features

* **behavior:** support 'insert block object' action ([d45b230](https://github.com/portabletext/editor/commit/d45b2305b4f40870e1cc490688c726cdaf42854c))
* **markdown behavior:** add automatic break behavior ([36821d7](https://github.com/portabletext/editor/commit/36821d7cb9f276401a68ef8389015918e0d918cb))


### Bug Fixes

* **markdown behavior:** make all schema mapping optional ([388ae38](https://github.com/portabletext/editor/commit/388ae3852df39c78a05a7641969eebd3f6b24d03))
* remove unneeded export ([69985b4](https://github.com/portabletext/editor/commit/69985b4289d5179b4afc6ae32fe012f6f5927ff9))

## [1.7.1](https://github.com/portabletext/editor/compare/editor-v1.7.0...editor-v1.7.1) (2024-11-13)


### Bug Fixes

* **deps:** update dependency @xstate/react to v5 ([65cebaa](https://github.com/portabletext/editor/commit/65cebaaf8541978dfdcaae85b7fae7a9ac5629a2))
* **deps:** update dependency xstate to v5.19.0 ([b90e0c4](https://github.com/portabletext/editor/commit/b90e0c4c7ac9a14db0abad52151c0daff8e52a37))
* **deps:** Update sanity monorepo to ^3.64.0 ([ba0fc26](https://github.com/portabletext/editor/commit/ba0fc26736d69d7aef6a92b0a60fa9b74f462b02))
* move Slate editor teardown logic to createSlateEditor ([e353c64](https://github.com/portabletext/editor/commit/e353c649159df5b3c9d0db96bdff5843703ba2cf))

## [1.7.0](https://github.com/portabletext/editor/compare/editor-v1.6.1...editor-v1.7.0) (2024-11-12)


### Features

* **behavior:** add annotation.(add|remove|toggle) events and actions ([9b6a334](https://github.com/portabletext/editor/commit/9b6a334bbf0dc80a77f17f5948e701e862c0004f))
* **behavior:** support for imperative annotation.(add|remove|toggle) and focus ([1b7b374](https://github.com/portabletext/editor/commit/1b7b374a00b93b74d3a2aef7b6d69589b0c751dc))


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([6551392](https://github.com/portabletext/editor/commit/65513924603ee2b10a8d4c9a02fac73acd4fd250))
* **internals:** create Slate editor outside of React ([1c11745](https://github.com/portabletext/editor/commit/1c11745d3d7d0661599df99c1f1243c53d89557e))
* remove @sanity/util dependency ([c11c44c](https://github.com/portabletext/editor/commit/c11c44c46b3965510c290c0ca656efc7baf9068c))

## [1.6.1](https://github.com/portabletext/editor/compare/editor-v1.6.0...editor-v1.6.1) (2024-11-07)


### Bug Fixes

* **react-compiler:** handle mutation violation ([#338](https://github.com/portabletext/editor/issues/338)) ([1e6ea1c](https://github.com/portabletext/editor/commit/1e6ea1cb27acfb4585d69739a83855cf6f5a04bc))

## [1.6.0](https://github.com/portabletext/editor/compare/editor-v1.5.6...editor-v1.6.0) (2024-11-07)


### Features

* **behavior:** add decorator.(add|remove|toggle) events and actions ([42fc03b](https://github.com/portabletext/editor/commit/42fc03b19ec7cd95ca8e4ef9fae79c1723cad7f1))


### Bug Fixes

* **markdown behavior:** explicitly set default style when toggling list ([c8575d2](https://github.com/portabletext/editor/commit/c8575d2c0394a6aaa118190fa65057cc2f228e86))

## [1.5.6](https://github.com/portabletext/editor/compare/editor-v1.5.5...editor-v1.5.6) (2024-11-07)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#383](https://github.com/portabletext/editor/issues/383)) ([be449e1](https://github.com/portabletext/editor/commit/be449e1f393c7d88fe095b9d65ee96a31e6d9fb5))

## [1.5.5](https://github.com/portabletext/editor/compare/editor-v1.5.4...editor-v1.5.5) (2024-11-06)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.63.0 ([#375](https://github.com/portabletext/editor/issues/375)) ([c9f9289](https://github.com/portabletext/editor/commit/c9f9289cebd71ffc14e00646bf839070729dd5c1))
* **markdown behavior:** allow automatic headings in non-empty block ([8f3c0cb](https://github.com/portabletext/editor/commit/8f3c0cb7819089d8586eaa6d2b23ee012f85e02a))
* **markdown behavior:** clear style on backspace in non-empty block ([8bd2011](https://github.com/portabletext/editor/commit/8bd2011c9715d2ffb669bad598c357d88107745c))
* **markdown behavior:** fix automatic blockquote edge cases ([4da37fa](https://github.com/portabletext/editor/commit/4da37fa4702a82cffa97318c34261b7a8ca66bfb))
* **markdown behavior:** fix automatic list edge cases ([d3a55a2](https://github.com/portabletext/editor/commit/d3a55a2c57e09f745ce858d43d90dc2eca8b4165))
* **markdown behavior:** prevent automatic heading if caret is not at the end of heading ([cb4f3b7](https://github.com/portabletext/editor/commit/cb4f3b7a27793c7579a64fcb664da57e10635d1f))
* skip undo history logic hwne changing remotely or undoing/redoing ([6c54599](https://github.com/portabletext/editor/commit/6c545994d4491b6c494d8fc10df31f64c5b7f052))

## [1.5.4](https://github.com/portabletext/editor/compare/editor-v1.5.3...editor-v1.5.4) (2024-11-04)


### Bug Fixes

* **deps:** update dependency react-compiler-runtime to v19.0.0-beta-9ee70a1-20241017 ([bbe5ebd](https://github.com/portabletext/editor/commit/bbe5ebda017092d25a414420485283eff5b20999))
* merge spans with same but different-ordered marks ([cf72032](https://github.com/portabletext/editor/commit/cf7203215cb530b0aa963f950c60f71ceca6acd9))

## [1.5.3](https://github.com/portabletext/editor/compare/editor-v1.5.2...editor-v1.5.3) (2024-11-04)


### Bug Fixes

* fix edge case related to writing next to annotated decorator ([0747807](https://github.com/portabletext/editor/commit/0747807ff654d2abf056503ea311398ad75047da))
* fix HMR issue related to schema compilation ([6806ab6](https://github.com/portabletext/editor/commit/6806ab6475415fb9badbde4c84c88afcb6753efa))

## [1.5.2](https://github.com/portabletext/editor/compare/editor-v1.5.1...editor-v1.5.2) (2024-11-04)


### Bug Fixes

* allow core behaviors to be overwritten ([08b5924](https://github.com/portabletext/editor/commit/08b592495a4bbb3170d829de46c6aa3fc456e06a))
* **markdown behavior:** clear list props before applying heading style ([74d5b03](https://github.com/portabletext/editor/commit/74d5b0343221b0dec9057b26019e1c06749765f3))

## [1.5.1](https://github.com/portabletext/editor/compare/editor-v1.5.0...editor-v1.5.1) (2024-11-03)


### Bug Fixes

* **types:** re-export PortableTextChild ([63756d1](https://github.com/portabletext/editor/commit/63756d10eea97f63a9510c43150886157ef79fff))

## [1.5.0](https://github.com/portabletext/editor/compare/editor-v1.4.1...editor-v1.5.0) (2024-11-03)


### Features

* allow passing a simple schema definition to useEditor ([b25316d](https://github.com/portabletext/editor/commit/b25316dbef244f590b9156950c1f7af8b00a9137))


### Bug Fixes

* **types:** re-export PortableTextBlock ([494d9db](https://github.com/portabletext/editor/commit/494d9db4d00430bd490bf8a7d26ea0e7fc261070))

## [1.4.1](https://github.com/portabletext/editor/compare/editor-v1.4.0...editor-v1.4.1) (2024-11-03)


### Bug Fixes

* **deps:** update dependency slate-react to v0.111.0 ([995bbe5](https://github.com/portabletext/editor/commit/995bbe5e43f62061c4ebe8a71403c26c2a3acbea))
* move `@xstate/react` from dev to production dependency ([861e6b6](https://github.com/portabletext/editor/commit/861e6b6dd2da66243d6ffa818b0159ed4251b02a))

## [1.4.0](https://github.com/portabletext/editor/compare/editor-v1.3.1...editor-v1.4.0) (2024-11-01)


### Features

* add new `PortableTextEditor.editor` prop with access to Behavior API ([39f5484](https://github.com/portabletext/editor/commit/39f5484ffbe9fe5020e3ba5c2e4ea087d6c52163))
* add optional markdown behaviors ([7994b43](https://github.com/portabletext/editor/commit/7994b43465725a0aaaaeb5c963bf1d76d430c6e4))

## [1.3.1](https://github.com/portabletext/editor/compare/editor-v1.3.0...editor-v1.3.1) (2024-11-01)


### Bug Fixes

* **performance:** allow `Synchronizer` to be compiled ([#327](https://github.com/portabletext/editor/issues/327)) ([1a086f0](https://github.com/portabletext/editor/commit/1a086f0993c9f7a37061274f756d8ef56c42da89))
* route remote patches through editor machine ([b586f24](https://github.com/portabletext/editor/commit/b586f249dc79d0bab09e3b91261877645ff8c8ec))

## [1.3.0](https://github.com/portabletext/editor/compare/editor-v1.2.1...editor-v1.3.0) (2024-11-01)


### Features

* use react-compiler to optimise render ([#319](https://github.com/portabletext/editor/issues/319)) ([35b6c27](https://github.com/portabletext/editor/commit/35b6c27ea1a12ae2bd725f2d15a79fcc15c930ec))

## [1.2.1](https://github.com/portabletext/editor/compare/editor-v1.2.0...editor-v1.2.1) (2024-11-01)


### Bug Fixes

* fix edge cases related to toggling decorators next to other marks ([75776f8](https://github.com/portabletext/editor/commit/75776f8634e5f99c3a54d3c46a720ab570ca30e0))

## [1.2.0](https://github.com/portabletext/editor/compare/editor-v1.1.12...editor-v1.2.0) (2024-10-31)


### Features

* **editor:** better built-in list keyboard shortcuts ([0f77347](https://github.com/portabletext/editor/commit/0f773475d808f7d32111ddd1f739c57bca3ea886))

## [1.1.12](https://github.com/portabletext/editor/compare/editor-v1.1.11...editor-v1.1.12) (2024-10-31)


### Bug Fixes

* **editor:** handle edge case with deleting empty text blocks next to block objects ([3e7e815](https://github.com/portabletext/editor/commit/3e7e81516b1b5e0a45b7dc84a0f38df2303a34df))
* handle `exhaustive-deps` violations ([#322](https://github.com/portabletext/editor/issues/322)) ([cb29da2](https://github.com/portabletext/editor/commit/cb29da2b6a00d7fb47c519316a274f4bb179bf72))

## [1.1.11](https://github.com/portabletext/editor/compare/editor-v1.1.10...editor-v1.1.11) (2024-10-30)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.62.3 ([122f5b1](https://github.com/portabletext/editor/commit/122f5b1c3b85c597fe0dbc5bf63afeabec342f23))
* **editor:** refactor internal Behavior API ([5de869b](https://github.com/portabletext/editor/commit/5de869b84e281de6e975600964e484ba26cc3293))

## [1.1.10](https://github.com/portabletext/editor/compare/editor-v1.1.9...editor-v1.1.10) (2024-10-29)


### Bug Fixes

* **editor:** preserve list properties when splitting at the end (regression) ([a7e8578](https://github.com/portabletext/editor/commit/a7e85783686ab75279d8187d76e7e69bf58b285b))
* **editor:** preserve list properties when splitting at the start ([e47d150](https://github.com/portabletext/editor/commit/e47d1500960eea1ec0036f184eedfe024c861ef0))

## [1.1.9](https://github.com/portabletext/editor/compare/editor-v1.1.8...editor-v1.1.9) (2024-10-28)


### Bug Fixes

* **editor:** fix Firefox inconsistency with inserting text before decorator ([61f4caf](https://github.com/portabletext/editor/commit/61f4cafd7e1a2aad36a116cfbad39834a13bba37))

## [1.1.8](https://github.com/portabletext/editor/compare/editor-v1.1.7...editor-v1.1.8) (2024-10-28)


### Bug Fixes

* **editor:** fix inconsistency with break insertion in styled block ([af6aebb](https://github.com/portabletext/editor/commit/af6aebb1c114a62d7740e9c6c73b1ea118e03838))

## [1.1.7](https://github.com/portabletext/editor/compare/editor-v1.1.6...editor-v1.1.7) (2024-10-24)


### Bug Fixes

* **deps:** update dependency slate-react to v0.110.3 ([71e565a](https://github.com/portabletext/editor/commit/71e565a0844476f11c621024acdcee71567b99c6))
* **deps:** Update sanity monorepo to ^3.62.2 ([2d0cedc](https://github.com/portabletext/editor/commit/2d0cedc7bf9245c536a22b8620178f351bf844f2))

## [1.1.6](https://github.com/portabletext/editor/compare/editor-v1.1.5...editor-v1.1.6) (2024-10-24)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.62.0 ([1124a41](https://github.com/portabletext/editor/commit/1124a41bcf768ca2b118792a5b8e20d0052d595a))
* **deps:** Update sanity monorepo to ^3.62.1 ([2d019b3](https://github.com/portabletext/editor/commit/2d019b3ca19bef4d0ae9a0dd34f929fdd489f6d1))
* **editor:** fix inconsistency with text insertion in decorated annotation ([a85fff2](https://github.com/portabletext/editor/commit/a85fff21b16c90a349498b9c3b15a5d2a56ab000))
* **editor:** preserve decorators when removing all-decorated text ([46f299a](https://github.com/portabletext/editor/commit/46f299a164f4a869c9ffe4e6d4b8d6ff18302839))
* **editor:** use OS-aware undo/redo shortcuts ([8dac26d](https://github.com/portabletext/editor/commit/8dac26dd2de4822e9b833bd18e23e2feb87d7134))

## [1.1.5](https://github.com/portabletext/editor/compare/editor-v1.1.4...editor-v1.1.5) (2024-10-21)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.60.0 ([81f3e3f](https://github.com/portabletext/editor/commit/81f3e3f7a495286c750603f02c2cfb4d40463483))
* **deps:** Update sanity monorepo to ^3.61.0 ([556f18c](https://github.com/portabletext/editor/commit/556f18c95c1b260c98111a2b020949d455e47704))
* **deps:** Update slate to v0.110.2 ([ccb3ee1](https://github.com/portabletext/editor/commit/ccb3ee130fad51d74a8ee253a43200e70eab6924))
* **editor:** fix PortableTextEditable type ([bb74c5c](https://github.com/portabletext/editor/commit/bb74c5c372c1811f94d2d62cb39e80cd911660bf))
* **editor:** programmatically select ArrowDown-inserted text block ([a136ae0](https://github.com/portabletext/editor/commit/a136ae097f8bef4927b5827183b25f5c68e1dcb5))

## [1.1.4](https://github.com/portabletext/editor/compare/editor-v1.1.3...editor-v1.1.4) (2024-10-04)


### Bug Fixes

* **editor:** treat annotations as proper boundaries ([2553d72](https://github.com/portabletext/editor/commit/2553d72bbdee1e5017a1baedccc568bf392456af))

## [1.1.3](https://github.com/portabletext/editor/compare/editor-v1.1.2...editor-v1.1.3) (2024-10-03)


### Bug Fixes

* **editor:** fix inconsistency with text insertion after inline object, before annotation ([ad47833](https://github.com/portabletext/editor/commit/ad4783365655d911b8050d9a6763e87b68c8a960))
* **editor:** fix inconsistency with text insertion before annotation ([333e559](https://github.com/portabletext/editor/commit/333e5596acaf6acdcd4ab4dbbdb128279ccad945))

## [1.1.2](https://github.com/portabletext/editor/compare/editor-v1.1.1...editor-v1.1.2) (2024-10-01)


### Bug Fixes

* **deps:** update dependency @sanity/ui to ^2.8.9 ([59a66f8](https://github.com/portabletext/editor/commit/59a66f84a1c5a0581faa6629a531affbbb5053fc))
* **deps:** update dependency rxjs to ^7.8.1 ([479d764](https://github.com/portabletext/editor/commit/479d7648e8b8aa356d47daa4e3948832b9e39456))
* **deps:** update dependency slate-react to v0.110.1 ([0abe247](https://github.com/portabletext/editor/commit/0abe2475ea9f15f232dceea5c9e336358d16da68))
* **deps:** update dependency styled-components to ^6.1.13 ([8f5322e](https://github.com/portabletext/editor/commit/8f5322e38dccc9bc4d1bc86becdb5278ca1617f5))
* **editor:** add missing return after normalization ([262f5fb](https://github.com/portabletext/editor/commit/262f5fb849c9051db3997f6f925d67bb6760de04))
* **editor:** avoid emitting loading state for sync task ([1ad52a3](https://github.com/portabletext/editor/commit/1ad52a3e5803c5f27dbd132544b0ed556ea3e787))
* **editor:** defer patch/mutation changes until the editor is dirty ([c40f5df](https://github.com/portabletext/editor/commit/c40f5dff98a3013e95735363bdd32374afb89ff3))
* **editor:** remove initial loading state ([e1fc90d](https://github.com/portabletext/editor/commit/e1fc90dd4bd6b05b8fcd33b32b10e5d81cf46f18))
* **editor:** remove redundant validation ([d2cac6c](https://github.com/portabletext/editor/commit/d2cac6cf509bbf06ff9fa9043a2293e6c77213ae))

## [1.1.1](https://github.com/portabletext/editor/compare/editor-v1.1.0...editor-v1.1.1) (2024-09-16)


### Bug Fixes

* **editor:** only reset range decoration state if necessary ([9212008](https://github.com/portabletext/editor/commit/9212008f769c1d7453aae839a1e6a18f22e58613))

## [1.1.0](https://github.com/portabletext/editor/compare/editor-v1.0.19...editor-v1.1.0) (2024-09-12)


### Features

* **editor:** support annotations across blocks, annotations and decorators ([50266f5](https://github.com/portabletext/editor/commit/50266f54d3e60bc5187816fbff56043399a69cf5))


### Bug Fixes

* **editor:** a collapsed selection can now toggle off an entire annotation ([dbc1cee](https://github.com/portabletext/editor/commit/dbc1ceec4ff82d8e0719649cb70d74b0f9b5dae8))
* **editor:** allow empty block to be decorated ([d944641](https://github.com/portabletext/editor/commit/d944641f955e519657e959569142ad0bdf82830f))
* **editor:** allow trailing empty line in a cross-selected to be decorated ([5f8866d](https://github.com/portabletext/editor/commit/5f8866d0e602dd59af4f5d32ffa5fa4721f6e374))
* **editor:** assign new keys to annotations split across blocks ([5976628](https://github.com/portabletext/editor/commit/5976628fc88282a0676590fedafcf0326004b789))
* **editor:** avoid extra newline when splitting block at the edge of decorator ([0fd05f0](https://github.com/portabletext/editor/commit/0fd05f0331fc1cfaba69aee5a3c37b8c17a99a8e))
* **editor:** dedupe markDefs based on their _key ([c81525b](https://github.com/portabletext/editor/commit/c81525bbe3d1b17c4f770d21a2aa75b1447fed6f))
* **editor:** make sure text blocks always have markDefs ([0ec7e70](https://github.com/portabletext/editor/commit/0ec7e707265f8614328e9574f838061df138f7f3))
* **editor:** preserve decorator when splitting block at the beginning ([fa76d4b](https://github.com/portabletext/editor/commit/fa76d4ba98ca480f9a4d346271f0363c7dbfa41b))
* **editor:** pressing backspace before a block object now deletes it ([4c6474c](https://github.com/portabletext/editor/commit/4c6474c0ae2aef798da2e1c90b1eef5fc179526d))

## [1.0.19](https://github.com/portabletext/editor/compare/editor-v1.0.18...editor-v1.0.19) (2024-08-29)


### Bug Fixes

* **editor:** avoid adding annotation if focus span is empty ([64df227](https://github.com/portabletext/editor/commit/64df227d4e375e8aea127e6fb3925f3390d259c3))

## [1.0.18](https://github.com/portabletext/editor/compare/editor-v1.0.17...editor-v1.0.18) (2024-08-26)


### Bug Fixes

* **editor:** bail out of ambiguous merge (set/unset) patch creation ([db9b470](https://github.com/portabletext/editor/commit/db9b47004bbc5834c603bd115be11dc90d0743a0))
* **editor:** bail out of ambiguous unset patch creation ([d0cdb39](https://github.com/portabletext/editor/commit/d0cdb3932a6b787caa57d50122e174591793e56b))

## [1.0.17](https://github.com/portabletext/editor/compare/editor-v1.0.16...editor-v1.0.17) (2024-08-23)


### Bug Fixes

* **editor:** remove extra immediately-deleted span after adding annotation ([4fe02c5](https://github.com/portabletext/editor/commit/4fe02c54761fd608458103594432520e561a7915))

## [1.0.16](https://github.com/portabletext/editor/compare/editor-v1.0.15...editor-v1.0.16) (2024-08-21)


### Bug Fixes

* **editor:** allow removing decorators across empty blocks ([0b375eb](https://github.com/portabletext/editor/commit/0b375eba94e0aa6f35f98f34f08dde710f7bb8f5))

## [1.0.15](https://github.com/portabletext/editor/compare/editor-v1.0.14...editor-v1.0.15) (2024-08-19)


### Bug Fixes

* **editor:** fix merge spans normalisation logic ([763de2a](https://github.com/portabletext/editor/commit/763de2a55843ddfcd57089ce306685c49c2ded58))

## [1.0.14](https://github.com/portabletext/editor/compare/editor-v1.0.13...editor-v1.0.14) (2024-08-16)


### Bug Fixes

* **editor:** guard against apply side effects when processing remote changes ([aa4fbed](https://github.com/portabletext/editor/commit/aa4fbedd729c39eac5cee6bc52f2aa391011fbb1))
* **editor:** guard against apply side effects when undoing/redoing ([4970289](https://github.com/portabletext/editor/commit/497028901e99fb558bb033e7d587f932530e52a9))
* **editor:** guard against erroneous undo/redo ([53c3c61](https://github.com/portabletext/editor/commit/53c3c61f6233ef67e0b7dd417b2e81292898263c))
* **editor:** make sure annotations are removed when writing on top of them ([88c42fb](https://github.com/portabletext/editor/commit/88c42fb783d1d4ab03cbcb6fa88079781b3b9404))

## [1.0.13](https://github.com/portabletext/editor/compare/editor-v1.0.12...editor-v1.0.13) (2024-08-14)


### Bug Fixes

* **editor:** avoid extra text insertion and adverse cascading effects ([a35715f](https://github.com/portabletext/editor/commit/a35715f9abee099d92e4585cd4cb27523e2295bc))

## [1.0.12](https://github.com/portabletext/editor/compare/editor-v1.0.11...editor-v1.0.12) (2024-08-09)


### Bug Fixes

* **deps:** update slate and slate-react ([c9a4375](https://github.com/portabletext/editor/commit/c9a43751660c654e85abafe78291e7184f86c470))
* **editor:** allow undoing part-deletion of annotated text ([42c2cdf](https://github.com/portabletext/editor/commit/42c2cdf1050e74840a7d94c9f5b1c271143c859b))

## [1.0.11](https://github.com/portabletext/editor/compare/editor-v1.0.10...editor-v1.0.11) (2024-08-05)


### Bug Fixes

* **editor:** allow inserting block without a selection ([42d001c](https://github.com/portabletext/editor/commit/42d001c1d8a9283b6475fe8599b581218e8b764f))
* **editor:** insertBlock now properly replaces empty text blocks ([f0b917b](https://github.com/portabletext/editor/commit/f0b917b9800ab5e786b30faaaa3c35001e2bb358))
* **editor:** prevent PortableTextEditor.isAnnotationActive(...) false positive ([c38e343](https://github.com/portabletext/editor/commit/c38e34347b5107d4864952b47d3c40a9eb7ed42d))

## [1.0.10](https://github.com/portabletext/editor/compare/editor-v1.0.9...editor-v1.0.10) (2024-08-01)


### Bug Fixes

* **editor:** add missing release tags ([f1054b0](https://github.com/portabletext/editor/commit/f1054b0a726cd7dfcd90fc7163b6f7f905444bb5))
* **editor:** prevent deleting non-empty text block on DELETE ([0955917](https://github.com/portabletext/editor/commit/0955917b3a5479eba4d8ef20d7a1dd4b521f956d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.2 to 1.1.0

## [1.0.9](https://github.com/portabletext/editor/compare/editor-v1.0.8...editor-v1.0.9) (2024-07-25)


### Bug Fixes

* **editor:** mitigate infinite loop which causes editor to freeze ([36d5eef](https://github.com/portabletext/editor/commit/36d5eef5fcb8bc8d9ee71ec58ab8d791005d9448))
* **editor:** remove internal circular dependency ([8b77afe](https://github.com/portabletext/editor/commit/8b77afea292d0a9e222708e49cf0455440565094))

## [1.0.8](https://github.com/portabletext/editor/compare/editor-v1.0.7...editor-v1.0.8) (2024-07-04)


### Bug Fixes

* **editor:** allow returning Promise(undefined) in paste handler ([56ebe4a](https://github.com/portabletext/editor/commit/56ebe4a4ffb746d6cff493bbb9cb8727e866c754))

## [1.0.7](https://github.com/portabletext/editor/compare/editor-v1.0.6...editor-v1.0.7) (2024-06-28)


### Bug Fixes

* remove unrelated keywords ([42d396d](https://github.com/portabletext/editor/commit/42d396ddb54ea278b47506fd82c019046e7b3ae9))

## [1.0.6](https://github.com/portabletext/editor/compare/editor-v1.0.5...editor-v1.0.6) (2024-06-27)


### Bug Fixes

* upgrade `[@sanity](https://github.com/sanity)` dependencies ([b167312](https://github.com/portabletext/editor/commit/b1673125c3539f0e93ff40bc8c8ac5e4908ef1f1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.1 to 1.0.2

## [1.0.1](https://github.com/portabletext/editor/compare/editor-v1.0.5...editor-v1.0.1) (2024-06-27)


### Miscellaneous Chores

* **patches:** release 1.0.1 ([097182d](https://github.com/portabletext/editor/commit/097182dbb5be4723d5004ff92e2318b27d07ac3b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.0 to 1.0.1

## [1.0.5](https://github.com/portabletext/editor/compare/editor-v1.0.4...editor-v1.0.5) (2024-06-27)


### Bug Fixes

* **editor:** move @portabletext/patches to dependencies ([68d5b34](https://github.com/portabletext/editor/commit/68d5b34c1757684006a52f1817532a0255270ecd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped to 1.0.0

## [1.0.4](https://github.com/portabletext/editor/compare/v1.0.3...v1.0.4) (2024-06-27)


### Bug Fixes

* move `@portabletext/patches` to dev dependencies ([15cc131](https://github.com/portabletext/editor/commit/15cc1318c58c12162b801b2af5537e50e34e3057))

## [1.0.3](https://github.com/portabletext/editor/compare/v1.0.2...v1.0.3) (2024-06-27)


### Bug Fixes

* adjust _regenerateKeys so that the MarkDefs left are only those allowed ([#19](https://github.com/portabletext/editor/issues/19)) ([145385d](https://github.com/portabletext/editor/commit/145385d420def7cca893f643b18090659b663b01))
* export RenderPlaceholderFunction type ([febd6e1](https://github.com/portabletext/editor/commit/febd6e1bd495e4df68695c3c1ac57e180d77b2b6))
* move `@sanity` dependencies to peer dependencies ([e58106c](https://github.com/portabletext/editor/commit/e58106c8e75bc88aae5f9b457fc44381d82f2802))
* fix native paste operations in Firefox ([bf0c6ac](https://github.com/portabletext/editor/commit/bf0c6acae6415ef68c832d0c568d3ba950f6cdcd))
* remove unused compactPatches function ([#26](https://github.com/portabletext/editor/issues/26)) ([72e4ea5](https://github.com/portabletext/editor/commit/72e4ea56516f102857e51344ee05750b44ade362))

## [1.0.2](https://github.com/portabletext/editor/compare/v1.0.1...v1.0.2) (2024-06-20)


### Bug Fixes

* update README ([ec79bb8](https://github.com/portabletext/editor/commit/ec79bb835b86ef76ff1d99ddf0f44dace99999ed))

## [1.0.1](https://github.com/portabletext/editor/compare/editor-v1.0.0...editor-v1.0.1) (2024-06-20)


### Bug Fixes

* clean up CHANGELOG ([4d86d5e](https://github.com/portabletext/editor/commit/4d86d5e341f30f63538c62dad602c8a04d482f29))

## 1.0.0 (2024-06-20)

Initial release.
