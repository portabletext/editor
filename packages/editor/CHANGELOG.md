# Changelog

## [1.2.0](https://github.com/portabletext/editor/compare/editor-v1.1.5...editor-v1.2.0) (2024-10-21)


### Features

* **editor:** support annotations across blocks, annotations and decorators ([50266f5](https://github.com/portabletext/editor/commit/50266f54d3e60bc5187816fbff56043399a69cf5))


### Bug Fixes

* **deps:** update dependency @sanity/ui to ^2.8.9 ([59a66f8](https://github.com/portabletext/editor/commit/59a66f84a1c5a0581faa6629a531affbbb5053fc))
* **deps:** update dependency rxjs to ^7.8.1 ([479d764](https://github.com/portabletext/editor/commit/479d7648e8b8aa356d47daa4e3948832b9e39456))
* **deps:** update dependency slate-react to v0.110.1 ([0abe247](https://github.com/portabletext/editor/commit/0abe2475ea9f15f232dceea5c9e336358d16da68))
* **deps:** update dependency styled-components to ^6.1.13 ([8f5322e](https://github.com/portabletext/editor/commit/8f5322e38dccc9bc4d1bc86becdb5278ca1617f5))
* **deps:** Update sanity monorepo to ^3.60.0 ([81f3e3f](https://github.com/portabletext/editor/commit/81f3e3f7a495286c750603f02c2cfb4d40463483))
* **deps:** Update sanity monorepo to ^3.61.0 ([556f18c](https://github.com/portabletext/editor/commit/556f18c95c1b260c98111a2b020949d455e47704))
* **deps:** update slate and slate-react ([c9a4375](https://github.com/portabletext/editor/commit/c9a43751660c654e85abafe78291e7184f86c470))
* **deps:** Update slate to v0.110.2 ([ccb3ee1](https://github.com/portabletext/editor/commit/ccb3ee130fad51d74a8ee253a43200e70eab6924))
* **editor:** a collapsed selection can now toggle off an entire annotation ([dbc1cee](https://github.com/portabletext/editor/commit/dbc1ceec4ff82d8e0719649cb70d74b0f9b5dae8))
* **editor:** add missing return after normalization ([262f5fb](https://github.com/portabletext/editor/commit/262f5fb849c9051db3997f6f925d67bb6760de04))
* **editor:** allow empty block to be decorated ([d944641](https://github.com/portabletext/editor/commit/d944641f955e519657e959569142ad0bdf82830f))
* **editor:** allow inserting block without a selection ([42d001c](https://github.com/portabletext/editor/commit/42d001c1d8a9283b6475fe8599b581218e8b764f))
* **editor:** allow removing decorators across empty blocks ([0b375eb](https://github.com/portabletext/editor/commit/0b375eba94e0aa6f35f98f34f08dde710f7bb8f5))
* **editor:** allow trailing empty line in a cross-selected to be decorated ([5f8866d](https://github.com/portabletext/editor/commit/5f8866d0e602dd59af4f5d32ffa5fa4721f6e374))
* **editor:** allow undoing part-deletion of annotated text ([42c2cdf](https://github.com/portabletext/editor/commit/42c2cdf1050e74840a7d94c9f5b1c271143c859b))
* **editor:** assign new keys to annotations split across blocks ([5976628](https://github.com/portabletext/editor/commit/5976628fc88282a0676590fedafcf0326004b789))
* **editor:** avoid adding annotation if focus span is empty ([64df227](https://github.com/portabletext/editor/commit/64df227d4e375e8aea127e6fb3925f3390d259c3))
* **editor:** avoid emitting loading state for sync task ([1ad52a3](https://github.com/portabletext/editor/commit/1ad52a3e5803c5f27dbd132544b0ed556ea3e787))
* **editor:** avoid extra newline when splitting block at the edge of decorator ([0fd05f0](https://github.com/portabletext/editor/commit/0fd05f0331fc1cfaba69aee5a3c37b8c17a99a8e))
* **editor:** avoid extra text insertion and adverse cascading effects ([a35715f](https://github.com/portabletext/editor/commit/a35715f9abee099d92e4585cd4cb27523e2295bc))
* **editor:** bail out of ambiguous merge (set/unset) patch creation ([db9b470](https://github.com/portabletext/editor/commit/db9b47004bbc5834c603bd115be11dc90d0743a0))
* **editor:** bail out of ambiguous unset patch creation ([d0cdb39](https://github.com/portabletext/editor/commit/d0cdb3932a6b787caa57d50122e174591793e56b))
* **editor:** dedupe markDefs based on their _key ([c81525b](https://github.com/portabletext/editor/commit/c81525bbe3d1b17c4f770d21a2aa75b1447fed6f))
* **editor:** defer patch/mutation changes until the editor is dirty ([c40f5df](https://github.com/portabletext/editor/commit/c40f5dff98a3013e95735363bdd32374afb89ff3))
* **editor:** fix inconsistency with text insertion after inline object, before annotation ([ad47833](https://github.com/portabletext/editor/commit/ad4783365655d911b8050d9a6763e87b68c8a960))
* **editor:** fix inconsistency with text insertion before annotation ([333e559](https://github.com/portabletext/editor/commit/333e5596acaf6acdcd4ab4dbbdb128279ccad945))
* **editor:** fix merge spans normalisation logic ([763de2a](https://github.com/portabletext/editor/commit/763de2a55843ddfcd57089ce306685c49c2ded58))
* **editor:** fix PortableTextEditable type ([bb74c5c](https://github.com/portabletext/editor/commit/bb74c5c372c1811f94d2d62cb39e80cd911660bf))
* **editor:** guard against apply side effects when processing remote changes ([aa4fbed](https://github.com/portabletext/editor/commit/aa4fbedd729c39eac5cee6bc52f2aa391011fbb1))
* **editor:** guard against apply side effects when undoing/redoing ([4970289](https://github.com/portabletext/editor/commit/497028901e99fb558bb033e7d587f932530e52a9))
* **editor:** guard against erroneous undo/redo ([53c3c61](https://github.com/portabletext/editor/commit/53c3c61f6233ef67e0b7dd417b2e81292898263c))
* **editor:** insertBlock now properly replaces empty text blocks ([f0b917b](https://github.com/portabletext/editor/commit/f0b917b9800ab5e786b30faaaa3c35001e2bb358))
* **editor:** make sure annotations are removed when writing on top of them ([88c42fb](https://github.com/portabletext/editor/commit/88c42fb783d1d4ab03cbcb6fa88079781b3b9404))
* **editor:** make sure text blocks always have markDefs ([0ec7e70](https://github.com/portabletext/editor/commit/0ec7e707265f8614328e9574f838061df138f7f3))
* **editor:** only reset range decoration state if necessary ([9212008](https://github.com/portabletext/editor/commit/9212008f769c1d7453aae839a1e6a18f22e58613))
* **editor:** preserve decorator when splitting block at the beginning ([fa76d4b](https://github.com/portabletext/editor/commit/fa76d4ba98ca480f9a4d346271f0363c7dbfa41b))
* **editor:** pressing backspace before a block object now deletes it ([4c6474c](https://github.com/portabletext/editor/commit/4c6474c0ae2aef798da2e1c90b1eef5fc179526d))
* **editor:** prevent PortableTextEditor.isAnnotationActive(...) false positive ([c38e343](https://github.com/portabletext/editor/commit/c38e34347b5107d4864952b47d3c40a9eb7ed42d))
* **editor:** programmatically select ArrowDown-inserted text block ([a136ae0](https://github.com/portabletext/editor/commit/a136ae097f8bef4927b5827183b25f5c68e1dcb5))
* **editor:** remove extra immediately-deleted span after adding annotation ([4fe02c5](https://github.com/portabletext/editor/commit/4fe02c54761fd608458103594432520e561a7915))
* **editor:** remove initial loading state ([e1fc90d](https://github.com/portabletext/editor/commit/e1fc90dd4bd6b05b8fcd33b32b10e5d81cf46f18))
* **editor:** remove redundant validation ([d2cac6c](https://github.com/portabletext/editor/commit/d2cac6cf509bbf06ff9fa9043a2293e6c77213ae))
* **editor:** treat annotations as proper boundaries ([2553d72](https://github.com/portabletext/editor/commit/2553d72bbdee1e5017a1baedccc568bf392456af))

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
