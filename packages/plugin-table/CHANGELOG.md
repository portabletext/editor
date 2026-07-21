# @portabletext/plugin-table

## 1.3.7

### Patch Changes

- Updated dependencies [[`1aea458`](https://github.com/portabletext/editor/commit/1aea458849ecbb2ee5c88e97bfba1fc0ab6adbc7)]:
  - @portabletext/editor@7.10.10

## 1.3.6

### Patch Changes

- Updated dependencies [[`fae7074`](https://github.com/portabletext/editor/commit/fae7074fb1617a7da35bb22a1a18e473ce1cc0b9), [`1676271`](https://github.com/portabletext/editor/commit/16762713632e5fe66e6a58f9214cc9ccd89e6f31), [`6592c0d`](https://github.com/portabletext/editor/commit/6592c0d82742c28bd2f4f27f78997456653bd8c8)]:
  - @portabletext/editor@7.10.9

## 1.3.5

### Patch Changes

- Updated dependencies [[`32c622e`](https://github.com/portabletext/editor/commit/32c622eb6c377a28646195ada69e8a47d30bb690)]:
  - @portabletext/editor@7.10.8

## 1.3.4

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.10.7

## 1.3.3

### Patch Changes

- Updated dependencies [[`44fd221`](https://github.com/portabletext/editor/commit/44fd221b6e2e13d6debda5d443f9f4ec596dca50)]:
  - @portabletext/editor@7.10.6

## 1.3.2

### Patch Changes

- Updated dependencies [[`c94a206`](https://github.com/portabletext/editor/commit/c94a206be68bf35ec3db9b9b260ff82ee50ef3d9)]:
  - @portabletext/editor@7.10.5

## 1.3.1

### Patch Changes

- Updated dependencies [[`e3997a4`](https://github.com/portabletext/editor/commit/e3997a4f8d86304767d0ba0eafb2845be126dd9a), [`3e199ef`](https://github.com/portabletext/editor/commit/3e199ef38b969b5c993e16466872a561de0e6e0f)]:
  - @portabletext/editor@7.10.4

## 1.3.0

### Minor Changes

- [#2951](https://github.com/portabletext/editor/pull/2951) [`ede35c4`](https://github.com/portabletext/editor/commit/ede35c464b2bb25b58fe56b34d50fbf28ce1e722) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `tokens` to the reference `Table` for per-instance theming

  Themes that only exist as runtime objects could not reach the plugin's
  custom properties without writing them to a shared DOM scope themselves,
  which breaks down when multiple tables need different values and when the
  chrome portals outside the host's wrapper. `Table` now takes an optional
  `tokens` record keyed by the documented `--pt-plugin-table-*` names and
  applies the values inline to its own roots, including the portal layers.
  The `TableTokens` type is exported from `@portabletext/plugin-table/ui`.

## 1.2.0

### Minor Changes

- [#2949](https://github.com/portabletext/editor/pull/2949) [`ef8699c`](https://github.com/portabletext/editor/commit/ef8699cc6753ceb1b4189a5ea9ef6af5c96ca625) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `labels` to the reference `Table` for chrome string overrides

  The chrome's rendered strings (aria-labels and tooltips) were hardcoded
  English. `Table` now takes an optional `labels` record, merged over the
  defaults, with keys `add-column`, `add-row`, `column-handle`,
  `delete-column`, `delete-row`, `insert-here`, `menu-delete-table`,
  `menu-header-row`, `menu-select-table`, `row-handle`, and
  `table-options`. The `TableLabels` type is exported from
  `@portabletext/plugin-table/ui`. The `menu-*` keys only render when the
  built-in menu does; a `renderMenu` widget carries its own strings.

## 1.1.4

### Patch Changes

- [#2947](https://github.com/portabletext/editor/pull/2947) [`e1e8254`](https://github.com/portabletext/editor/commit/e1e82548951df714808275682f02324f56712a50) Thanks [@christianhg](https://github.com/christianhg)! - fix: ship the `styles.css` Node stub in the published package

  1.1.3 pointed the `node`/`default` conditions of the `./ui/styles.css`
  export at a file excluded from the tarball, so resolving the stylesheet
  outside a browser bundler failed with a module-not-found error instead of
  the intended no-op.

## 1.1.3

### Patch Changes

- [#2945](https://github.com/portabletext/editor/pull/2945) [`5f41177`](https://github.com/portabletext/editor/commit/5f411773504cfe3bbf56d9fa7a4447d182497559) Thanks [@christianhg](https://github.com/christianhg)! - fix: resolve the `./ui/styles.css` export to a no-op module in Node

  Importing the stylesheet from code that also runs outside a browser
  bundler (server-side rendering, Node scripts importing a consuming
  package) crashed Node's ESM loader, which cannot import CSS. The export
  now carries resolution conditions: bundlers resolve `browser`/`style` to
  the real stylesheet, Node and unknown resolvers get an empty JS module.

## 1.1.2

### Patch Changes

- [#2943](https://github.com/portabletext/editor/pull/2943) [`fe5f93a`](https://github.com/portabletext/editor/commit/fe5f93a0c47d3d432771f828540ae92b030af465) Thanks [@christianhg](https://github.com/christianhg)! - fix: re-measure chrome geometry when rows or columns are reordered

  Moving a row (or column) of a different size than its neighbors left the
  gutter dots, handles, and lanes at their old positions: the reorder swaps
  offsets without resizing any element, so nothing triggered a re-measure.
  The chrome now re-measures whenever the table's row or cell order changes.

## 1.1.1

### Patch Changes

- [#2942](https://github.com/portabletext/editor/pull/2942) [`2ffe479`](https://github.com/portabletext/editor/commit/2ffe479e5e601a76d585e33f00ee79be8080d843) Thanks [@christianhg](https://github.com/christianhg)! - fix: chrome buttons activate with `Space` and `Enter`

  The extend lanes, boundary insert dots, row and column handles, the trash
  chip, and the built-in menu trigger could be focused with the keyboard but
  not activated: they acted on pointer presses only. They now activate on
  `click`, which serves pointer and keyboard alike; a handle activation
  selects its row or column, same as a press without a drag. For pointers
  this moves the action from press to release, matching platform buttons and
  allowing drag-off to cancel.

- [#2941](https://github.com/portabletext/editor/pull/2941) [`d227474`](https://github.com/portabletext/editor/commit/d2274749562077697804250d56471b1f266a50af) Thanks [@christianhg](https://github.com/christianhg)! - fix: mark header cells with `data-pt-plugin-table-header` for host CSS

  Header cells set their weight through an inline style, which only reaches
  text that inherits. Hosts whose text components declare their own weight
  can now restore it with a rule against the new attribute (see the README's
  Theming section). The weight itself becomes a theming token,
  `--pt-plugin-table-header-weight` (default `600`), consumed by the cell and
  the drag ghost alike.

  All plugin-rendered state attributes now carry the full
  `data-pt-plugin-table-` prefix: the previously undocumented `data-selected`
  (selected rows) and `data-cell-range` (the table while a rectangle is
  active) become `data-pt-plugin-table-selected` and
  `data-pt-plugin-table-cell-range`.

- Updated dependencies [[`b1bb99e`](https://github.com/portabletext/editor/commit/b1bb99e06b6af10914578e86ae325addce8a0016)]:
  - @portabletext/editor@7.10.3

## 1.1.0

### Minor Changes

- [#2910](https://github.com/portabletext/editor/pull/2910) [`53335e2`](https://github.com/portabletext/editor/commit/53335e2a60fe1b44cf88204bcb48684b9459f823) Thanks [@christianhg](https://github.com/christianhg)! - feat(plugin-table): arrow navigation escapes the table when nothing lies beyond

  `ArrowDown` from any bottom-row cell and `ArrowUp` from any top-row cell now exit the table: into the neighboring block when one exists, entering at the caret's horizontal position, or by inserting an empty text block beyond the table and moving the caret into it when nothing lies there. Previously the caret could walk sideways through the edge row's cells or get stuck inside the table.

### Patch Changes

- [#2934](https://github.com/portabletext/editor/pull/2934) [`2ff6709`](https://github.com/portabletext/editor/commit/2ff670971c8460b566ed11a5e7921ed311391a2f) Thanks [@christianhg](https://github.com/christianhg)! - fix: hide the portaled chrome when its anchor scrolls out of view

  The trash chip and the table menu tracked the table on scroll but never clipped against it, so scrolling the table out of the editor's scrollport left them floating over unrelated UI. The chrome now anchors through `@floating-ui/dom`: the trash chip hides when its handle is clipped, the built-in menu closes when its trigger scrolls out, and a menu rendered through `renderMenu` closes the same way (its anchor unmounts it).

- [#2910](https://github.com/portabletext/editor/pull/2910) [`53335e2`](https://github.com/portabletext/editor/commit/53335e2a60fe1b44cf88204bcb48684b9459f823) Thanks [@christianhg](https://github.com/christianhg)! - fix: `Tab` inside a list item in a cell indents instead of navigating

  Cell navigation yields `Tab`/`Shift+Tab` to the editor's list handling when the caret sits in a list item, so indenting and unindenting inside cells works; navigation keeps `Tab` everywhere else in a cell.

- Updated dependencies [[`b339b25`](https://github.com/portabletext/editor/commit/b339b254444512d8de9a92eeb4773fb2777c4f96), [`2be9720`](https://github.com/portabletext/editor/commit/2be972078e0936bc7b52d4384edf723291faa47c)]:
  - @portabletext/editor@7.10.2

## 1.0.1

### Patch Changes

- Updated dependencies [[`4ecfa0c`](https://github.com/portabletext/editor/commit/4ecfa0cfa97539657b61cf40b3f6d41593f0e7b7)]:
  - @portabletext/editor@7.10.1

## 0.0.23

### Patch Changes

- Updated dependencies [[`067d3e8`](https://github.com/portabletext/editor/commit/067d3e805b7f0b0c01c1e5dbf0c08e800363cf83), [`cbdf301`](https://github.com/portabletext/editor/commit/cbdf3017be649430a7deb0159c1af3a8c83b8704), [`0b82b78`](https://github.com/portabletext/editor/commit/0b82b78ec06c2e000892e1283cdca57fb37d424e), [`f42372f`](https://github.com/portabletext/editor/commit/f42372f1fb8fdacb0b4f250d16a9adaeb9b42574), [`ebff16b`](https://github.com/portabletext/editor/commit/ebff16b56ca7659f806da8b49f75f890e651ff93), [`ebb41dc`](https://github.com/portabletext/editor/commit/ebb41dc0536390f3d1aa2a53bee7ba606306900f), [`2f2d6e9`](https://github.com/portabletext/editor/commit/2f2d6e9ff47c2bc8dad14679939599e26610afaf), [`98f8340`](https://github.com/portabletext/editor/commit/98f83404ec6813b294c09f3ea879a8e7a8792952), [`2831cd9`](https://github.com/portabletext/editor/commit/2831cd9aaa84124bcdb1bd3012bd70a56108f899), [`5dc3030`](https://github.com/portabletext/editor/commit/5dc3030a570710650e838cfcc375e3f0da392b0e), [`f242007`](https://github.com/portabletext/editor/commit/f2420072a74004239502da2413b45d200c1a8022), [`70c90d1`](https://github.com/portabletext/editor/commit/70c90d1db79f3272692012ea99a8e104b736a7f0)]:
  - @portabletext/editor@7.10.0

## 0.0.22

### Patch Changes

- Updated dependencies [[`e8b43db`](https://github.com/portabletext/editor/commit/e8b43db6f14358904a2a328dc17a01f011010ac5), [`50424f9`](https://github.com/portabletext/editor/commit/50424f921d2b6d484cec190b974c28b551ebc1e8), [`24996df`](https://github.com/portabletext/editor/commit/24996df6b0471233a7adeeefbddda4a0965a1ae7)]:
  - @portabletext/editor@7.9.0

## 0.0.21

### Patch Changes

- Updated dependencies [[`1fbedd4`](https://github.com/portabletext/editor/commit/1fbedd4bf013fcb76dbcfb36b3e8d9fa3e163f39), [`e71e642`](https://github.com/portabletext/editor/commit/e71e642956c6b6988416a02ddf71db2dc53a9483), [`ed1845e`](https://github.com/portabletext/editor/commit/ed1845ef9c7075b58596405c62435de14389893e), [`39f9c40`](https://github.com/portabletext/editor/commit/39f9c406b371ce546df0629f9abc684941245c3c), [`cd56b64`](https://github.com/portabletext/editor/commit/cd56b641480a00125d098ff09472394aba631f13), [`46593d5`](https://github.com/portabletext/editor/commit/46593d537ff9d4aa1ef7f3e0ab3333266c749bbb)]:
  - @portabletext/editor@7.8.2

## 0.0.20

### Patch Changes

- Updated dependencies [[`8a84ef6`](https://github.com/portabletext/editor/commit/8a84ef66b97560d00884b63e41cc4d4dd5e90ce4)]:
  - @portabletext/editor@7.8.1

## 0.0.19

### Patch Changes

- [#2845](https://github.com/portabletext/editor/pull/2845) [`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- Updated dependencies [[`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e), [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645), [`4c41139`](https://github.com/portabletext/editor/commit/4c41139245fe2e496465a6ef46bbcd70f1ef56c9), [`80c6a80`](https://github.com/portabletext/editor/commit/80c6a8032c0295109c2729b4b9426fc31da59aa5)]:
  - @portabletext/editor@7.8.0

## 0.0.18

### Patch Changes

- Updated dependencies [[`38867cb`](https://github.com/portabletext/editor/commit/38867cb45f3c024cdb402a7caf98511121f88383), [`cdf16f9`](https://github.com/portabletext/editor/commit/cdf16f909eea6fdff36a49265884324e9881eaab), [`b268769`](https://github.com/portabletext/editor/commit/b26876928247ef3357b3c238dc069e569289e555), [`3aa6a39`](https://github.com/portabletext/editor/commit/3aa6a398534e71a01a9c711cbeb474eb815d4fdd)]:
  - @portabletext/editor@7.7.0

## 0.0.17

### Patch Changes

- Updated dependencies [[`29091fe`](https://github.com/portabletext/editor/commit/29091fe7c4d11c5bfc2907d24d921c3a0206bf8a)]:
  - @portabletext/editor@7.6.2

## 0.0.16

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.6.1

## 0.0.15

### Patch Changes

- Updated dependencies [[`2668d66`](https://github.com/portabletext/editor/commit/2668d66c7eb23bed7e4f5f6ad04ed6753f8a0d68), [`0768dc5`](https://github.com/portabletext/editor/commit/0768dc5ecff4a5ee90b58242f35a54ac3f6cfbb0), [`737d618`](https://github.com/portabletext/editor/commit/737d618ac78a3ae133701862861f03b9c39a3656)]:
  - @portabletext/editor@7.6.0

## 0.0.14

### Patch Changes

- Updated dependencies [[`c98ddb6`](https://github.com/portabletext/editor/commit/c98ddb6a99829cd6fb14b4b84b65b0857699f0a1)]:
  - @portabletext/editor@7.5.2

## 0.0.13

### Patch Changes

- Updated dependencies [[`68e1f0b`](https://github.com/portabletext/editor/commit/68e1f0b64e59c5923a8cd715cf4fbd59d16f011c)]:
  - @portabletext/editor@7.5.1

## 0.0.12

### Patch Changes

- Updated dependencies [[`5ee8bff`](https://github.com/portabletext/editor/commit/5ee8bffd81826885930b78c35144726fe36b7eb1)]:
  - @portabletext/editor@7.5.0

## 0.0.11

### Patch Changes

- Updated dependencies [[`8ed6233`](https://github.com/portabletext/editor/commit/8ed623380c516add8851fedec26eba62edd13198)]:
  - @portabletext/editor@7.4.0

## 0.0.10

### Patch Changes

- Updated dependencies [[`9173892`](https://github.com/portabletext/editor/commit/91738928cf069ba7b6bf33bb60afea14de678af7)]:
  - @portabletext/editor@7.3.4

## 0.0.9

### Patch Changes

- Updated dependencies [[`1e0d25d`](https://github.com/portabletext/editor/commit/1e0d25d2e909272298c80193f71b604dfde9d7ea)]:
  - @portabletext/editor@7.3.3

## 0.0.8

### Patch Changes

- Updated dependencies [[`c92beef`](https://github.com/portabletext/editor/commit/c92beefeb17631046ea1b5e04c3aa9c4274f520e)]:
  - @portabletext/editor@7.3.2

## 0.0.7

### Patch Changes

- Updated dependencies [[`cfcb9ec`](https://github.com/portabletext/editor/commit/cfcb9ecf2b683bf7c71fb32daa63bbd1935a4d05)]:
  - @portabletext/editor@7.3.1

## 0.0.6

### Patch Changes

- Updated dependencies [[`2b4d9a2`](https://github.com/portabletext/editor/commit/2b4d9a215dfaf2417afec3d9b097776e4637f331)]:
  - @portabletext/editor@7.3.0

## 0.0.5

### Patch Changes

- Updated dependencies [[`e0ee0f6`](https://github.com/portabletext/editor/commit/e0ee0f68ae8936bca7a158c2828c9b17ba468ec2), [`5c183b3`](https://github.com/portabletext/editor/commit/5c183b39b1482d0a83b0b9f98ebe99186560d511), [`f4f2a73`](https://github.com/portabletext/editor/commit/f4f2a73666923dba62f0f8e88f87df956fe655b5), [`3229002`](https://github.com/portabletext/editor/commit/32290029c7e5eed4b8c96833b21181937efcf2a4), [`0fb1f28`](https://github.com/portabletext/editor/commit/0fb1f285fdd54ad9e67a9411829dfa2da283390c), [`ceb179f`](https://github.com/portabletext/editor/commit/ceb179f16e3a218e4e86b05331ab4593d9133602), [`ae60599`](https://github.com/portabletext/editor/commit/ae60599a6eb8514af2c80240f029688dc08bcfc0), [`6540641`](https://github.com/portabletext/editor/commit/65406416e151044913784a11f7a0567e82be48fe), [`492fb7d`](https://github.com/portabletext/editor/commit/492fb7dd390409d4267833ce5f86356a59e38c90)]:
  - @portabletext/editor@7.2.0

## 0.0.4

### Patch Changes

- Updated dependencies [[`4121c36`](https://github.com/portabletext/editor/commit/4121c365871569f7ca0afe54e8400534be54b8e7)]:
  - @portabletext/editor@7.1.1

## 0.0.3

### Patch Changes

- Updated dependencies [[`8ef89bd`](https://github.com/portabletext/editor/commit/8ef89bd074ebcc0484183d69458e5c16bee1398f)]:
  - @portabletext/editor@7.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [[`f0a46d1`](https://github.com/portabletext/editor/commit/f0a46d1362395ff2d10b07c12577212ce5946086)]:
  - @portabletext/editor@7.0.6

## 0.0.1

### Patch Changes

- Updated dependencies [[`e0e974e`](https://github.com/portabletext/editor/commit/e0e974e2ece2590dfd7c7fa908d25290300899fc)]:
  - @portabletext/editor@7.0.5
