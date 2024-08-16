# Changelog

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
