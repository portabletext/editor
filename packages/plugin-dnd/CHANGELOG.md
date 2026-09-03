# @portabletext/plugin-dnd

## 2.0.8

### Patch Changes

- [#3218](https://github.com/portabletext/editor/pull/3218) [`8a71561`](https://github.com/portabletext/editor/commit/8a715616bdb49ca1e57b950979859f3eb35232e0) Thanks [@christianhg](https://github.com/christianhg)! - fix: derive the dragged-block facts once per drag instead of per `dragover`

  The `dragover` guard no longer re-derives which blocks are being dragged (the drag selection, the dragged block keys, and the entire-blocks check, all of which scan the document) on every pointer move. These facts are now computed once per drag and reused, so dragging over large documents does less work per `dragover`. They are recomputed when the document changes mid-drag, for example when a remote edit lands, so the indicator keeps reflecting the current document.

- [#3218](https://github.com/portabletext/editor/pull/3218) [`a448def`](https://github.com/portabletext/editor/commit/a448def18dfd1471c7cbf615d1616cf3b5bc6146) Thanks [@christianhg](https://github.com/christianhg)! - fix: stop clearing the drop position on `dragenter`

  Crossing a block boundary during a drag no longer clears and re-sets the drop position. `dragenter` precedes every `dragover` on a crossing, so clearing on it toggled the indicator and wrote the editor's caret color twice per crossing; on large pages each style write costs a layout reflow. The caret color and the indicator now only change when the drop position genuinely transitions, and the drop position still clears on `dragstart`, `dragend`, `dragleave`, and `drop`.

## 2.0.7

## 2.0.6

### Patch Changes

- [#3214](https://github.com/portabletext/editor/pull/3214) [`e7e3a13`](https://github.com/portabletext/editor/commit/e7e3a1304318215128432bb09a6a3e1b1492c620) Thanks [@christianhg](https://github.com/christianhg)! - fix: stop clearing the drop position on continuous `drag` events

  Dragging a block no longer forces a layout reflow on every pointer move. The browser fires `drag` on the dragged element continuously during a drag, and the plugin treated each one as an end-of-drag signal: it cleared the drop position and restored the editor's caret color, only for the next `dragover` to set both back. The two style writes per pointer move invalidated layout right before the editor's own drag handling read element rects, so every move paid a full-page reflow that grew with document size, and the drop indicator visibly trailed the pointer in large documents (~12ms per event at 300 blocks with sibling fields mounted, now ~1.5ms, flat across document sizes). The drop position now clears on `dragend`, `dragleave`, `drop`, and `dragstart`, not on `drag`.

## 2.0.5

## 2.0.4

## 2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [[`b5739d5`](https://github.com/portabletext/editor/commit/b5739d55389ed2b47546cb5309a237c353d8335c)]:
  - @portabletext/editor@8.0.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`34717cf`](https://github.com/portabletext/editor/commit/34717cf511de9485b265ce53eec57be5eaf07d95)]:
  - @portabletext/editor@8.0.1

## 2.0.0

### Major Changes

- [#3110](https://github.com/portabletext/editor/pull/3110) [`09aa881`](https://github.com/portabletext/editor/commit/09aa8813211bc26d1a75f94a2ff619fae6e132cb) Thanks [@christianhg](https://github.com/christianhg)! - feat!: drop the legacy `main` and `module` fields

  Every package now declares its entry points through the `exports` map only. Node, all maintained bundlers, and TypeScript (`moduleResolution: 'bundler'`, 'node16', or 'nodenext') resolve through `exports`; only tooling that predates `exports` support read `main` or `module` and can no longer resolve these packages.

- [#3106](https://github.com/portabletext/editor/pull/3106) [`3ce5a1d`](https://github.com/portabletext/editor/commit/3ce5a1d00caec9593a4f8d240d05df90505ca655) Thanks [@christianhg](https://github.com/christianhg)! - feat!: require node 22.12 or later

  Node.js 22.12 or later is now required. The previous range also allowed Node.js 20.19 and later; Node.js 20 reached end of life in April 2026 and is no longer supported. `@portabletext/editor` and `@portabletext/markdown` also move to `@portabletext/to-html` v6 and `@portabletext/toolkit` v6, which carry the same Node.js requirement.

### Patch Changes

- [#3156](https://github.com/portabletext/editor/pull/3156) [`46330e3`](https://github.com/portabletext/editor/commit/46330e303c9173742c3837c0541fe93b49c1a51f) Thanks [@christianhg](https://github.com/christianhg)! - fix: clear a stale drop indicator when a block is dragged over itself

  Hovering a dragged block over itself cancels the drop, but an indicator activated on a previous hover kept pointing at the block. The self-hover now clears the drop position, at the root and inside containers alike.

- [#3150](https://github.com/portabletext/editor/pull/3150) [`04a0567`](https://github.com/portabletext/editor/commit/04a05674565575e5b5307868f4d458f382ea217f) Thanks [@christianhg](https://github.com/christianhg)! - fix: suppress the drop indicator when dragging a nested block over itself

  Dragging a block nested inside a container (a callout's paragraph, a table cell's content) and hovering it over its own position no longer shows a drop indicator there. Indicators already rendered on the correct nested block for drops elsewhere in a container; only the self-drop suppression was still comparing at the container's root level and missed the nested case.

- [#3153](https://github.com/portabletext/editor/pull/3153) [`c418485`](https://github.com/portabletext/editor/commit/c418485155b30eb85e1ae120e0082227b5b795b8) Thanks [@christianhg](https://github.com/christianhg)! - fix: suppress the native drop caret while an edge indicator is shown

  The browser's own drop caret used to keep rendering at the hovered text position even while an edge indicator was shown, suggesting a mid-text split that would never happen: the drop snaps to the block edge instead. The native caret now hides exactly while an edge position is active and returns as soon as the drag hovers mid-text, where it's the honest affordance again.

- [#3140](https://github.com/portabletext/editor/pull/3140) [`73cf0e1`](https://github.com/portabletext/editor/commit/73cf0e1b48d35dbfc348d8556154a61a7890dde3) Thanks [@christianhg](https://github.com/christianhg)! - fix: hide the edge indicator while hovering inside a text block

  The native drop caret is the affordance there; edge lines only show for boundary, void, and unresolved positions.

- Updated dependencies [[`09aa881`](https://github.com/portabletext/editor/commit/09aa8813211bc26d1a75f94a2ff619fae6e132cb), [`7718cf0`](https://github.com/portabletext/editor/commit/7718cf049b96fd8d3461211bc1dabc7bbcbb81f8), [`bf3373a`](https://github.com/portabletext/editor/commit/bf3373ae78698ab0dd69f2705bde864732d03e18), [`59d71ca`](https://github.com/portabletext/editor/commit/59d71ca58eeb1289f0cef65b8fde3841bbcb99e0), [`7892af2`](https://github.com/portabletext/editor/commit/7892af22d1144f2ebe32fb6f857c671330c6ab6a), [`2db496d`](https://github.com/portabletext/editor/commit/2db496dc53c22b7961d1121009032145429b9653), [`e2d081e`](https://github.com/portabletext/editor/commit/e2d081e5b9a257ec09299d8e2f9f0b9389fdc7a6), [`09c5741`](https://github.com/portabletext/editor/commit/09c5741b4a8186f64fa5523e5324b751c051d1ad), [`83a0438`](https://github.com/portabletext/editor/commit/83a04382ed4f79bec3b4cf8e741e4478c68b7f6f), [`3ce5a1d`](https://github.com/portabletext/editor/commit/3ce5a1d00caec9593a4f8d240d05df90505ca655), [`73cf0e1`](https://github.com/portabletext/editor/commit/73cf0e1b48d35dbfc348d8556154a61a7890dde3), [`6fde634`](https://github.com/portabletext/editor/commit/6fde634789e87f97d42d428d823e1cbc4f060367), [`fe7de91`](https://github.com/portabletext/editor/commit/fe7de913129d807c0e05464c0df33dc6a189e0e2)]:
  - @portabletext/editor@8.0.0

## 1.0.33

### Patch Changes

- Updated dependencies [[`e6a55a9`](https://github.com/portabletext/editor/commit/e6a55a9918e7ca78c5d3e9a2ef95854ec2df2e66), [`51e4bfe`](https://github.com/portabletext/editor/commit/51e4bfe39f7e25fd1d36305a95b5816ae02e7126)]:
  - @portabletext/editor@7.12.0

## 1.0.32

### Patch Changes

- Updated dependencies [[`5c61867`](https://github.com/portabletext/editor/commit/5c618674c28627ad742f326076d9e27d4a09ddf1), [`9e3b7be`](https://github.com/portabletext/editor/commit/9e3b7be9cf95772a32724acea69cee233f0d9f9f), [`fbb9a98`](https://github.com/portabletext/editor/commit/fbb9a9824dcea07aad66a4c69bb33db6c3fe0be8), [`2c97777`](https://github.com/portabletext/editor/commit/2c97777c56746a418b582258268b452b6168a32b), [`2f5c148`](https://github.com/portabletext/editor/commit/2f5c148b42a0f1dc5c1efb535ca4afd680e831b0), [`e7df9b8`](https://github.com/portabletext/editor/commit/e7df9b8ffcf51f984bb14439dbeaaa9a348b9b45), [`eb8cb6c`](https://github.com/portabletext/editor/commit/eb8cb6cff6c793e107cc1d5f4c85b78ba565b74b), [`75d2dc4`](https://github.com/portabletext/editor/commit/75d2dc4ddfd5ae7f6be0630339d5fb34f6e0a750), [`45fd070`](https://github.com/portabletext/editor/commit/45fd0706b72b92e5a663bdc019e1e464972eafb5), [`bfd7058`](https://github.com/portabletext/editor/commit/bfd7058700754ba7ac5af35aae99b2bc8ce70dfb), [`8c72f76`](https://github.com/portabletext/editor/commit/8c72f7622108f406d7930a9905f9c517a2e9c181), [`db10bb7`](https://github.com/portabletext/editor/commit/db10bb7a3659f02d11b8aca5cc2424e62314faec)]:
  - @portabletext/editor@7.11.0

## 1.0.31

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.10.19

## 1.0.30

### Patch Changes

- [#3012](https://github.com/portabletext/editor/pull/3012) [`94b4106`](https://github.com/portabletext/editor/commit/94b4106a22fd44096fd8b8bcc594ebf8918ff60d) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react to ^19.2.8

- Updated dependencies [[`94b4106`](https://github.com/portabletext/editor/commit/94b4106a22fd44096fd8b8bcc594ebf8918ff60d), [`5f073b5`](https://github.com/portabletext/editor/commit/5f073b53ae184606e52cb52567f688c7805a7515)]:
  - @portabletext/editor@7.10.18

## 1.0.29

### Patch Changes

- [#3042](https://github.com/portabletext/editor/pull/3042) [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c) Thanks [@stipsan](https://github.com/stipsan)! - fix: add a `module` entry point

  Every package now declares `module` alongside `main`, pointing at the ESM build.
  Bundlers that predate `exports` use it to pick the ESM output instead of falling
  back to `main`.

- Updated dependencies [[`7e1bc11`](https://github.com/portabletext/editor/commit/7e1bc11554247318356aef8f36151763674c6dcb), [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c), [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c), [`46c019c`](https://github.com/portabletext/editor/commit/46c019cc3ae1112c1027059b06d80432fd2ca1d7)]:
  - @portabletext/editor@7.10.17

## 1.0.28

### Patch Changes

- Updated dependencies [[`b18469f`](https://github.com/portabletext/editor/commit/b18469f7c73ef036c633142f3864ed16a70fa93c)]:
  - @portabletext/editor@7.10.16

## 1.0.27

### Patch Changes

- Updated dependencies [[`520e1be`](https://github.com/portabletext/editor/commit/520e1bebae3aa6853262b66775f9e941217c7eaf), [`ff7e095`](https://github.com/portabletext/editor/commit/ff7e095f681967031bd84d586a7a0f0f7a27e671), [`03a0aaa`](https://github.com/portabletext/editor/commit/03a0aaa8861debda4d1ba81f8af3b3e73409588d)]:
  - @portabletext/editor@7.10.15

## 1.0.26

### Patch Changes

- Updated dependencies [[`04bc38e`](https://github.com/portabletext/editor/commit/04bc38ebc01a7dad7824bf1654306186475364af)]:
  - @portabletext/editor@7.10.14

## 1.0.25

### Patch Changes

- Updated dependencies [[`68b5d17`](https://github.com/portabletext/editor/commit/68b5d174f5be776c4e9304ba53af0ef95e60ee3b)]:
  - @portabletext/editor@7.10.13

## 1.0.24

### Patch Changes

- Updated dependencies [[`5ddcc5b`](https://github.com/portabletext/editor/commit/5ddcc5b42ec2560cde1650489d9219212c5d67b1), [`c600e92`](https://github.com/portabletext/editor/commit/c600e92bb94ec52762f63983bbd48f7b64654bfb)]:
  - @portabletext/editor@7.10.12

## 1.0.23

### Patch Changes

- Updated dependencies [[`86bf426`](https://github.com/portabletext/editor/commit/86bf426af85f54c3acab61bffa3e3bfa8d976d5b)]:
  - @portabletext/editor@7.10.11

## 1.0.22

### Patch Changes

- Updated dependencies [[`1aea458`](https://github.com/portabletext/editor/commit/1aea458849ecbb2ee5c88e97bfba1fc0ab6adbc7)]:
  - @portabletext/editor@7.10.10

## 1.0.21

### Patch Changes

- Updated dependencies [[`fae7074`](https://github.com/portabletext/editor/commit/fae7074fb1617a7da35bb22a1a18e473ce1cc0b9), [`1676271`](https://github.com/portabletext/editor/commit/16762713632e5fe66e6a58f9214cc9ccd89e6f31), [`6592c0d`](https://github.com/portabletext/editor/commit/6592c0d82742c28bd2f4f27f78997456653bd8c8)]:
  - @portabletext/editor@7.10.9

## 1.0.20

### Patch Changes

- Updated dependencies [[`32c622e`](https://github.com/portabletext/editor/commit/32c622eb6c377a28646195ada69e8a47d30bb690)]:
  - @portabletext/editor@7.10.8

## 1.0.19

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.10.7

## 1.0.18

### Patch Changes

- Updated dependencies [[`44fd221`](https://github.com/portabletext/editor/commit/44fd221b6e2e13d6debda5d443f9f4ec596dca50)]:
  - @portabletext/editor@7.10.6

## 1.0.17

### Patch Changes

- Updated dependencies [[`c94a206`](https://github.com/portabletext/editor/commit/c94a206be68bf35ec3db9b9b260ff82ee50ef3d9)]:
  - @portabletext/editor@7.10.5

## 1.0.16

### Patch Changes

- Updated dependencies [[`e3997a4`](https://github.com/portabletext/editor/commit/e3997a4f8d86304767d0ba0eafb2845be126dd9a), [`3e199ef`](https://github.com/portabletext/editor/commit/3e199ef38b969b5c993e16466872a561de0e6e0f)]:
  - @portabletext/editor@7.10.4

## 1.0.15

### Patch Changes

- Updated dependencies [[`b1bb99e`](https://github.com/portabletext/editor/commit/b1bb99e06b6af10914578e86ae325addce8a0016)]:
  - @portabletext/editor@7.10.3

## 1.0.14

### Patch Changes

- Updated dependencies [[`b339b25`](https://github.com/portabletext/editor/commit/b339b254444512d8de9a92eeb4773fb2777c4f96), [`2be9720`](https://github.com/portabletext/editor/commit/2be972078e0936bc7b52d4384edf723291faa47c)]:
  - @portabletext/editor@7.10.2

## 1.0.13

### Patch Changes

- Updated dependencies [[`4ecfa0c`](https://github.com/portabletext/editor/commit/4ecfa0cfa97539657b61cf40b3f6d41593f0e7b7)]:
  - @portabletext/editor@7.10.1

## 1.0.12

### Patch Changes

- Updated dependencies [[`067d3e8`](https://github.com/portabletext/editor/commit/067d3e805b7f0b0c01c1e5dbf0c08e800363cf83), [`cbdf301`](https://github.com/portabletext/editor/commit/cbdf3017be649430a7deb0159c1af3a8c83b8704), [`0b82b78`](https://github.com/portabletext/editor/commit/0b82b78ec06c2e000892e1283cdca57fb37d424e), [`f42372f`](https://github.com/portabletext/editor/commit/f42372f1fb8fdacb0b4f250d16a9adaeb9b42574), [`ebff16b`](https://github.com/portabletext/editor/commit/ebff16b56ca7659f806da8b49f75f890e651ff93), [`ebb41dc`](https://github.com/portabletext/editor/commit/ebb41dc0536390f3d1aa2a53bee7ba606306900f), [`2f2d6e9`](https://github.com/portabletext/editor/commit/2f2d6e9ff47c2bc8dad14679939599e26610afaf), [`98f8340`](https://github.com/portabletext/editor/commit/98f83404ec6813b294c09f3ea879a8e7a8792952), [`2831cd9`](https://github.com/portabletext/editor/commit/2831cd9aaa84124bcdb1bd3012bd70a56108f899), [`5dc3030`](https://github.com/portabletext/editor/commit/5dc3030a570710650e838cfcc375e3f0da392b0e), [`f242007`](https://github.com/portabletext/editor/commit/f2420072a74004239502da2413b45d200c1a8022), [`70c90d1`](https://github.com/portabletext/editor/commit/70c90d1db79f3272692012ea99a8e104b736a7f0)]:
  - @portabletext/editor@7.10.0

## 1.0.11

### Patch Changes

- Updated dependencies [[`e8b43db`](https://github.com/portabletext/editor/commit/e8b43db6f14358904a2a328dc17a01f011010ac5), [`50424f9`](https://github.com/portabletext/editor/commit/50424f921d2b6d484cec190b974c28b551ebc1e8), [`24996df`](https://github.com/portabletext/editor/commit/24996df6b0471233a7adeeefbddda4a0965a1ae7)]:
  - @portabletext/editor@7.9.0

## 1.0.10

### Patch Changes

- Updated dependencies [[`1fbedd4`](https://github.com/portabletext/editor/commit/1fbedd4bf013fcb76dbcfb36b3e8d9fa3e163f39), [`e71e642`](https://github.com/portabletext/editor/commit/e71e642956c6b6988416a02ddf71db2dc53a9483), [`ed1845e`](https://github.com/portabletext/editor/commit/ed1845ef9c7075b58596405c62435de14389893e), [`39f9c40`](https://github.com/portabletext/editor/commit/39f9c406b371ce546df0629f9abc684941245c3c), [`cd56b64`](https://github.com/portabletext/editor/commit/cd56b641480a00125d098ff09472394aba631f13), [`46593d5`](https://github.com/portabletext/editor/commit/46593d537ff9d4aa1ef7f3e0ab3333266c749bbb)]:
  - @portabletext/editor@7.8.2

## 1.0.9

### Patch Changes

- Updated dependencies [[`8a84ef6`](https://github.com/portabletext/editor/commit/8a84ef66b97560d00884b63e41cc4d4dd5e90ce4)]:
  - @portabletext/editor@7.8.1

## 1.0.8

### Patch Changes

- [#2845](https://github.com/portabletext/editor/pull/2845) [`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

- Updated dependencies [[`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e), [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645), [`4c41139`](https://github.com/portabletext/editor/commit/4c41139245fe2e496465a6ef46bbcd70f1ef56c9), [`80c6a80`](https://github.com/portabletext/editor/commit/80c6a8032c0295109c2729b4b9426fc31da59aa5)]:
  - @portabletext/editor@7.8.0

## 1.0.7

### Patch Changes

- Updated dependencies [[`38867cb`](https://github.com/portabletext/editor/commit/38867cb45f3c024cdb402a7caf98511121f88383), [`cdf16f9`](https://github.com/portabletext/editor/commit/cdf16f909eea6fdff36a49265884324e9881eaab), [`b268769`](https://github.com/portabletext/editor/commit/b26876928247ef3357b3c238dc069e569289e555), [`3aa6a39`](https://github.com/portabletext/editor/commit/3aa6a398534e71a01a9c711cbeb474eb815d4fdd)]:
  - @portabletext/editor@7.7.0

## 1.0.6

### Patch Changes

- Updated dependencies [[`29091fe`](https://github.com/portabletext/editor/commit/29091fe7c4d11c5bfc2907d24d921c3a0206bf8a)]:
  - @portabletext/editor@7.6.2

## 1.0.5

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.6.1

## 1.0.4

### Patch Changes

- Updated dependencies [[`2668d66`](https://github.com/portabletext/editor/commit/2668d66c7eb23bed7e4f5f6ad04ed6753f8a0d68), [`0768dc5`](https://github.com/portabletext/editor/commit/0768dc5ecff4a5ee90b58242f35a54ac3f6cfbb0), [`737d618`](https://github.com/portabletext/editor/commit/737d618ac78a3ae133701862861f03b9c39a3656)]:
  - @portabletext/editor@7.6.0

## 1.0.3

### Patch Changes

- Updated dependencies [[`c98ddb6`](https://github.com/portabletext/editor/commit/c98ddb6a99829cd6fb14b4b84b65b0857699f0a1)]:
  - @portabletext/editor@7.5.2

## 1.0.2

### Patch Changes

- Updated dependencies [[`68e1f0b`](https://github.com/portabletext/editor/commit/68e1f0b64e59c5923a8cd715cf4fbd59d16f011c)]:
  - @portabletext/editor@7.5.1

## 1.0.1

### Patch Changes

- Updated dependencies [[`5ee8bff`](https://github.com/portabletext/editor/commit/5ee8bffd81826885930b78c35144726fe36b7eb1)]:
  - @portabletext/editor@7.5.0
