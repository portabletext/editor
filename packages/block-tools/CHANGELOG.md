# Changelog

## 5.0.4

### Patch Changes

- Updated dependencies [[`e83d990`](https://github.com/portabletext/editor/commit/e83d990c3f8db67fc7d33c653455c5ea52a19490)]:
  - @portabletext/sanity-bridge@3.0.0

## 5.0.3

### Patch Changes

- [#2204](https://github.com/portabletext/editor/pull/2204) [`6133f84`](https://github.com/portabletext/editor/commit/6133f8489e7d1d01a0b469c3bc1e9c0e2f9084f4) Thanks [@christianhg](https://github.com/christianhg)! - fix: preserve whitespace in inline spans and handle orphan list items

  Fixes two `htmlToBlocks` bugs:
  - A space inside an inline `<span>` element (e.g. `a<span> </span>b`) is now preserved instead of being dropped. The whitespace text node rule now checks the parent element's siblings when the text node is the sole child of a `<span>`.
  - Orphan `<li>` elements without a `<ul>` or `<ol>` parent are now treated as bullet list items instead of being silently dropped.

- Updated dependencies [[`d095284`](https://github.com/portabletext/editor/commit/d095284d59ce0a3f1d4faf8836d9c9ddde817a46)]:
  - @portabletext/sanity-bridge@2.0.2

## 5.0.2

### Patch Changes

- Updated dependencies [[`5f1b1fb`](https://github.com/portabletext/editor/commit/5f1b1fb44152f6fc9f674a917916d57fdf0496a7)]:
  - @portabletext/sanity-bridge@2.0.1

## 5.0.1

### Patch Changes

- [#2144](https://github.com/portabletext/editor/pull/2144) [`e695d2b`](https://github.com/portabletext/editor/commit/e695d2b66706074961bfcdcae900ca1438bb30a0) Thanks [@christianhg](https://github.com/christianhg)! - docs: update description

## 5.0.0

### Major Changes

- [#2043](https://github.com/portabletext/editor/pull/2043) [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764) Thanks [@stipsan](https://github.com/stipsan)! - Require v5 of sanity studio dependencies

### Patch Changes

- Updated dependencies [[`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764), [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764)]:
  - @portabletext/schema@2.1.1
  - @portabletext/sanity-bridge@2.0.0

## 4.1.11

### Patch Changes

- Updated dependencies [[`c2c566d`](https://github.com/portabletext/editor/commit/c2c566ddf3a47dcf3a089cce8375679942b920f8)]:
  - @portabletext/schema@2.1.0
  - @portabletext/sanity-bridge@1.2.14

## 4.1.10

### Patch Changes

- [#1969](https://github.com/portabletext/editor/pull/1969) [`4931b87`](https://github.com/portabletext/editor/commit/4931b87a595b0876db72e5e58650af5047d58754) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove `lodash` dependency
  1. Simple `lodash` usages like `uniq` and `flatten` have been replaced with
     vanilla alternatives.
  2. Many cases of `isEqual` have been replaced by new domain-specific equality
     functions.
  3. Remaining, generic deep equality checks have been replaced by a copy/pasted
     version of `remeda`s `isDeepEqual`.

  This reduces bundle size and dependency surface while improving type-safety and
  maintainability.

- Updated dependencies [[`4931b87`](https://github.com/portabletext/editor/commit/4931b87a595b0876db72e5e58650af5047d58754)]:
  - @portabletext/sanity-bridge@1.2.13

## 4.1.9

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

- Updated dependencies [[`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da)]:
  - @portabletext/sanity-bridge@1.2.12
  - @portabletext/schema@2.0.1

## 4.1.8

### Patch Changes

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Move `@sanity/types` to a regular dependency instead of a peer

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Use relative `^` semver for react compiler deps

- Updated dependencies [[`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6), [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6), [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6)]:
  - @portabletext/sanity-bridge@1.2.11

## 4.1.7

### Patch Changes

- [#1961](https://github.com/portabletext/editor/pull/1961) [`b99833c`](https://github.com/portabletext/editor/commit/b99833c77502e8f1bfa59c80522b2ee22585a8b6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @sanity/schema to ^4.20.3

- Updated dependencies [[`b99833c`](https://github.com/portabletext/editor/commit/b99833c77502e8f1bfa59c80522b2ee22585a8b6)]:
  - @portabletext/sanity-bridge@1.2.10

## 4.1.6

### Patch Changes

- [#1955](https://github.com/portabletext/editor/pull/1955) [`5aff467`](https://github.com/portabletext/editor/commit/5aff467d3a0a607514224edcc2ed6ea3a8b17b4b) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.2

- [#1957](https://github.com/portabletext/editor/pull/1957) [`4be12e4`](https://github.com/portabletext/editor/commit/4be12e44447d8dc749c8efe4e76de26f4c0300f6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @sanity/types to ^4.20.3

- Updated dependencies [[`5aff467`](https://github.com/portabletext/editor/commit/5aff467d3a0a607514224edcc2ed6ea3a8b17b4b), [`4be12e4`](https://github.com/portabletext/editor/commit/4be12e44447d8dc749c8efe4e76de26f4c0300f6)]:
  - @portabletext/sanity-bridge@1.2.9

## 4.1.5

### Patch Changes

- [#1933](https://github.com/portabletext/editor/pull/1933) [`ba5c3f6`](https://github.com/portabletext/editor/commit/ba5c3f6943f4d23ba102b97fedf4fa7e787ca6e6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.1

- Updated dependencies [[`ba5c3f6`](https://github.com/portabletext/editor/commit/ba5c3f6943f4d23ba102b97fedf4fa7e787ca6e6)]:
  - @portabletext/sanity-bridge@1.2.8

## 4.1.4

### Patch Changes

- [#1930](https://github.com/portabletext/editor/pull/1930) [`d7a7c89`](https://github.com/portabletext/editor/commit/d7a7c892b929194dcc335a7e291e0a9c20c5160e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.0

- Updated dependencies [[`d7a7c89`](https://github.com/portabletext/editor/commit/d7a7c892b929194dcc335a7e291e0a9c20c5160e)]:
  - @portabletext/sanity-bridge@1.2.7

## 4.1.3

### Patch Changes

- [#1913](https://github.com/portabletext/editor/pull/1913) [`cb190ec`](https://github.com/portabletext/editor/commit/cb190ec4d90e7ba2b4805e993b138436f7c1c83b) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.19.0

- Updated dependencies [[`cb190ec`](https://github.com/portabletext/editor/commit/cb190ec4d90e7ba2b4805e993b138436f7c1c83b)]:
  - @portabletext/sanity-bridge@1.2.6

## 4.1.2

### Patch Changes

- [#1908](https://github.com/portabletext/editor/pull/1908) [`5fec0bd`](https://github.com/portabletext/editor/commit/5fec0bdefe69bef404037c57e7668e049434fc06) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.18.0

- Updated dependencies [[`5fec0bd`](https://github.com/portabletext/editor/commit/5fec0bdefe69bef404037c57e7668e049434fc06)]:
  - @portabletext/sanity-bridge@1.2.5

## 4.1.1

### Patch Changes

- [#1904](https://github.com/portabletext/editor/pull/1904) [`72f4cfb`](https://github.com/portabletext/editor/commit/72f4cfb74101aa176a094f440b81a51b748333c8) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.17.0

- Updated dependencies [[`72f4cfb`](https://github.com/portabletext/editor/commit/72f4cfb74101aa176a094f440b81a51b748333c8)]:
  - @portabletext/sanity-bridge@1.2.4

## 4.1.0

### Minor Changes

- [#1902](https://github.com/portabletext/editor/pull/1902) [`507c5bc`](https://github.com/portabletext/editor/commit/507c5bc6f72a7f6f84cf30614497f22af253173d) Thanks [@christianhg](https://github.com/christianhg)! - feat: vastly improve deserialization of Word Online documents

  Specialized rules have been added to handle documents coming from Word Online. This fixes issues with formatting and block styles getting lost, as well as whitespace disappearing and images not being parsed correctly.

- [#1902](https://github.com/portabletext/editor/pull/1902) [`891099c`](https://github.com/portabletext/editor/commit/891099ce17dee2574921ac7d99dfce8686e995d5) Thanks [@christianhg](https://github.com/christianhg)! - feat: improve deserialization of Word documents

### Patch Changes

- [#1875](https://github.com/portabletext/editor/pull/1875) [`9ac5955`](https://github.com/portabletext/editor/commit/9ac5955011432373fb1eddf1e9501ea9d49cb667) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.16.0

- [#1902](https://github.com/portabletext/editor/pull/1902) [`e955746`](https://github.com/portabletext/editor/commit/e955746bef160d160b7079c16d30dbbaa7792d12) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove unneeded outer trim of html string

- [#1899](https://github.com/portabletext/editor/pull/1899) [`a17ca1e`](https://github.com/portabletext/editor/commit/a17ca1e37cae14fcbded8a8b1340ab8f25d2cf08) Thanks [@christianhg](https://github.com/christianhg)! - fix: improve whitespace handling

  Trimming whitespace is now more reliable because it happens in a post processing step after the ordinary deserialization and block flattening has been conducted. This fixes issues with lonely images in Google Docs paragraphs being removed and improves trimming whitespace after tables.

- [#1902](https://github.com/portabletext/editor/pull/1902) [`a82c3b6`](https://github.com/portabletext/editor/commit/a82c3b61535c2074982517750c19cd1b3f5f05fb) Thanks [@christianhg](https://github.com/christianhg)! - fix: trim whitespace between block elements

- Updated dependencies [[`9ac5955`](https://github.com/portabletext/editor/commit/9ac5955011432373fb1eddf1e9501ea9d49cb667)]:
  - @portabletext/sanity-bridge@1.2.3

## 4.0.2

### Patch Changes

- [#1858](https://github.com/portabletext/editor/pull/1858) [`746acd3`](https://github.com/portabletext/editor/commit/746acd3a64cd8d05ee171e069f2a20c35a4e1ccf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.14.2

- Updated dependencies [[`746acd3`](https://github.com/portabletext/editor/commit/746acd3a64cd8d05ee171e069f2a20c35a4e1ccf)]:
  - @portabletext/sanity-bridge@1.2.2

## 4.0.1

### Patch Changes

- [#1843](https://github.com/portabletext/editor/pull/1843) [`c0075a3`](https://github.com/portabletext/editor/commit/c0075a34e2d17a2616461ac6789daf52740926c1) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.14.1

- Updated dependencies [[`c0075a3`](https://github.com/portabletext/editor/commit/c0075a34e2d17a2616461ac6789daf52740926c1)]:
  - @portabletext/sanity-bridge@1.2.1

## 4.0.0

### Major Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Require node v20.19 or later, or v22.12 or later

### Minor Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Remove CJS exports, this package is now ESM-only

### Patch Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade @sanity/pkg-utils to v9

- [#1808](https://github.com/portabletext/editor/pull/1808) [`e7f0d69`](https://github.com/portabletext/editor/commit/e7f0d6993abbdf2a6aeecad22bab970c0810eca1) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.13.0

- [#1809](https://github.com/portabletext/editor/pull/1809) [`f3b1bca`](https://github.com/portabletext/editor/commit/f3b1bcabed5e90684095078d144392d7b9e09688) Thanks [@christianhg](https://github.com/christianhg)! - fix: resolve circular dependency

- Updated dependencies [[`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e7f0d69`](https://github.com/portabletext/editor/commit/e7f0d6993abbdf2a6aeecad22bab970c0810eca1), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89)]:
  - @portabletext/sanity-bridge@1.2.0
  - @portabletext/schema@2.0.0

## 3.5.14

### Patch Changes

- [#1799](https://github.com/portabletext/editor/pull/1799) [`ab4ac2d`](https://github.com/portabletext/editor/commit/ab4ac2d5dd29c65cdab7c328bdae70665d36bb9e) Thanks [@chuttam](https://github.com/chuttam)! - fix: remove `get-random-values-esm`

- Updated dependencies [[`ab4ac2d`](https://github.com/portabletext/editor/commit/ab4ac2d5dd29c65cdab7c328bdae70665d36bb9e)]:
  - @portabletext/sanity-bridge@1.1.17

## 3.5.13

### Patch Changes

- [#1788](https://github.com/portabletext/editor/pull/1788) [`5f4cac4`](https://github.com/portabletext/editor/commit/5f4cac440d766cf8415e7392dc9f72e6327fdb8c) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.12.0

- Updated dependencies [[`5f4cac4`](https://github.com/portabletext/editor/commit/5f4cac440d766cf8415e7392dc9f72e6327fdb8c)]:
  - @portabletext/sanity-bridge@1.1.16

## 3.5.12

### Patch Changes

- [#1757](https://github.com/portabletext/editor/pull/1757) [`657f0e1`](https://github.com/portabletext/editor/commit/657f0e13138f51f1c8aa5a249b9c2ffa0fe0fb65) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.11.0

- Updated dependencies [[`657f0e1`](https://github.com/portabletext/editor/commit/657f0e13138f51f1c8aa5a249b9c2ffa0fe0fb65)]:
  - @portabletext/sanity-bridge@1.1.15

## 3.5.11

### Patch Changes

- [#1729](https://github.com/portabletext/editor/pull/1729) [`7eab00e`](https://github.com/portabletext/editor/commit/7eab00ee9b1f1186fdac76210daa1953edc2847c) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.3

- Updated dependencies [[`7eab00e`](https://github.com/portabletext/editor/commit/7eab00ee9b1f1186fdac76210daa1953edc2847c)]:
  - @portabletext/sanity-bridge@1.1.14

## 3.5.10

### Patch Changes

- [#1712](https://github.com/portabletext/editor/pull/1712) [`45fb678`](https://github.com/portabletext/editor/commit/45fb67805609171a69d81be643f08f0ac59c71da) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo to ^19.2.0

- [#1715](https://github.com/portabletext/editor/pull/1715) [`df5c167`](https://github.com/portabletext/editor/commit/df5c1673b8ee41a307fb3b4cc9f1318b8a440002) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove unused `@types/react` peer dep

## 3.5.9

### Patch Changes

- [#1698](https://github.com/portabletext/editor/pull/1698) [`c4fd0cd`](https://github.com/portabletext/editor/commit/c4fd0cd273cb95e1d5769514c730cf9397dc279f) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.2

- Updated dependencies [[`c4fd0cd`](https://github.com/portabletext/editor/commit/c4fd0cd273cb95e1d5769514c730cf9397dc279f)]:
  - @portabletext/sanity-bridge@1.1.13

## 3.5.8

### Patch Changes

- [#1686](https://github.com/portabletext/editor/pull/1686) [`dfe17a1`](https://github.com/portabletext/editor/commit/dfe17a1a307b1a512818b37645a8efd05407a0a5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.1

- Updated dependencies [[`dfe17a1`](https://github.com/portabletext/editor/commit/dfe17a1a307b1a512818b37645a8efd05407a0a5)]:
  - @portabletext/sanity-bridge@1.1.12

## 3.5.7

### Patch Changes

- Updated dependencies [[`b7997e1`](https://github.com/portabletext/editor/commit/b7997e1f37cc65a4cebc90967a81852690980262)]:
  - @portabletext/sanity-bridge@1.1.11

## 3.5.6

### Patch Changes

- [#1654](https://github.com/portabletext/editor/pull/1654) [`6071455`](https://github.com/portabletext/editor/commit/6071455249417866398439cc707d94d6baf97cbf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.9.0

- Updated dependencies [[`6071455`](https://github.com/portabletext/editor/commit/6071455249417866398439cc707d94d6baf97cbf)]:
  - @portabletext/sanity-bridge@1.1.10

## 3.5.5

### Patch Changes

- [#1638](https://github.com/portabletext/editor/pull/1638) [`d7f34d4`](https://github.com/portabletext/editor/commit/d7f34d4191d3248c69ef14125670db89517772d5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.8.1

- Updated dependencies [[`d7f34d4`](https://github.com/portabletext/editor/commit/d7f34d4191d3248c69ef14125670db89517772d5)]:
  - @portabletext/sanity-bridge@1.1.9

## 3.5.4

### Patch Changes

- [#1635](https://github.com/portabletext/editor/pull/1635) [`ff6aef7`](https://github.com/portabletext/editor/commit/ff6aef7fbd4a4f82947d9513e68ef581784de298) Thanks [@christianhg](https://github.com/christianhg)! - fix(flatten tables): account for too many heading rows

## 3.5.3

### Patch Changes

- [#1622](https://github.com/portabletext/editor/pull/1622) [`6539bfc`](https://github.com/portabletext/editor/commit/6539bfc45ef0f31d38d475a2461725529b24f2f3) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.6.1

- Updated dependencies [[`6539bfc`](https://github.com/portabletext/editor/commit/6539bfc45ef0f31d38d475a2461725529b24f2f3)]:
  - @portabletext/sanity-bridge@1.1.8

## 3.5.2

### Patch Changes

- [#1617](https://github.com/portabletext/editor/pull/1617) [`24bd38d`](https://github.com/portabletext/editor/commit/24bd38ddf84d4317ed2f3205ca8333f276dfc8c7) Thanks [@christianhg](https://github.com/christianhg)! - simplify flatten table rule algorithm

## 3.5.1

### Patch Changes

- [#1602](https://github.com/portabletext/editor/pull/1602) [`240da56`](https://github.com/portabletext/editor/commit/240da56da08164dd4c10c832e6e9044fb08244b7) Thanks [@christianhg](https://github.com/christianhg)! - add better inference of header and body rows in `createFlattenTableRule`

## 3.5.0

### Minor Changes

- [#1599](https://github.com/portabletext/editor/pull/1599) [`80a8e51`](https://github.com/portabletext/editor/commit/80a8e51bf5489edd20d56ea4e0c2ae1f55e3672d) Thanks [@christianhg](https://github.com/christianhg)! - export experimental \`createFlattenTableRule\`

## 3.4.1

### Patch Changes

- [#1594](https://github.com/portabletext/editor/pull/1594) [`8ebc392`](https://github.com/portabletext/editor/commit/8ebc39284ac3c286c73046e99fef4e77193d4608) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.6.0

- Updated dependencies [[`8ebc392`](https://github.com/portabletext/editor/commit/8ebc39284ac3c286c73046e99fef4e77193d4608)]:
  - @portabletext/sanity-bridge@1.1.7

## 3.4.0

### Minor Changes

- [#1591](https://github.com/portabletext/editor/pull/1591) [`d6c6235`](https://github.com/portabletext/editor/commit/d6c6235354e61975b7cea8284db3be3fc9fd85a7) Thanks [@christianhg](https://github.com/christianhg)! - Support simple table parsing

### Patch Changes

- [#1591](https://github.com/portabletext/editor/pull/1591) [`6938b25`](https://github.com/portabletext/editor/commit/6938b259164cd294b4f27a5e80e7aa12fd094822) Thanks [@christianhg](https://github.com/christianhg)! - Flatten nested text blocks

- Updated dependencies [[`7da6d79`](https://github.com/portabletext/editor/commit/7da6d790eab1566de522f65bf98410cc778fd303)]:
  - @portabletext/schema@1.2.0
  - @portabletext/sanity-bridge@1.1.6

## 3.3.3

### Patch Changes

- Updated dependencies [[`b1acd3f`](https://github.com/portabletext/editor/commit/b1acd3f6e118195b3cbbc46c8dde619116ef4774)]:
  - @portabletext/sanity-bridge@1.1.5

## 3.3.2

### Patch Changes

- Updated dependencies [[`1121f93`](https://github.com/portabletext/editor/commit/1121f9306b10481d10954f95211eed2ca20446f3)]:
  - @portabletext/schema@1.1.0
  - @portabletext/sanity-bridge@1.1.4

## 3.3.1

### Patch Changes

- [#1542](https://github.com/portabletext/editor/pull/1542) [`7f1d5a2`](https://github.com/portabletext/editor/commit/7f1d5a2e7576e51cba249721e9279d1b42f8bd99) Thanks [@stipsan](https://github.com/stipsan)! - Update LICENSE year from 2024 to 2025

- Updated dependencies [[`7f1d5a2`](https://github.com/portabletext/editor/commit/7f1d5a2e7576e51cba249721e9279d1b42f8bd99)]:
  - @portabletext/sanity-bridge@1.1.3
  - @portabletext/schema@1.0.1

## [3.3.0](https://github.com/portabletext/editor/compare/block-tools-v3.2.1...block-tools-v3.3.0) (2025-08-19)

### Features

- support image parsing with `SchemaMatchers` (in beta) ([d6005f2](https://github.com/portabletext/editor/commit/d6005f266d58a785d34e9dcb1b1039016c001023))
- support splitting text blocks ([ebbe70a](https://github.com/portabletext/editor/commit/ebbe70acd18f36c2f10f4cccf57737373ca18e8b))

### Bug Fixes

- export `SchemaMatchers` and `ImageSchemaMatcher` types ([cf170bb](https://github.com/portabletext/editor/commit/cf170bb0dca3a95069e76044abd8d67442b209fe))
- improve `htmlToBlocks` return type ([11b7dba](https://github.com/portabletext/editor/commit/11b7dbabd2be8e4bdcfabf33806242ef7cca6880))
- pass `keyGenerator` to `SchemaMatchers` ([e00ab2c](https://github.com/portabletext/editor/commit/e00ab2cc523bb445b07ecba9d6b2f9ace39ed616))

## [3.2.1](https://github.com/portabletext/editor/compare/block-tools-v3.2.0...block-tools-v3.2.1) (2025-08-15)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/sanity-bridge bumped to 1.1.2

## [3.2.0](https://github.com/portabletext/editor/compare/block-tools-v3.1.0...block-tools-v3.2.0) (2025-08-15)

### Features

- accept Portable Text Schema in `htmlToBlocks` ([b2dfcfc](https://github.com/portabletext/editor/commit/b2dfcfc99e92a7153bb1a9559d24c301df078951))

### Bug Fixes

- **deps:** update sanity monorepo to ^4.4.0 ([6ba20dd](https://github.com/portabletext/editor/commit/6ba20dd704a244f4da157e1b543f89a6b4cb89db))
- **deps:** update sanity monorepo to ^4.4.1 ([697ec61](https://github.com/portabletext/editor/commit/697ec61fb74ad08ab0693377d483ab8765e2b8bd))

## [3.1.0](https://github.com/portabletext/editor/compare/block-tools-v3.0.0...block-tools-v3.1.0) (2025-08-14)

### Features

- accept Portable Text Schema in `htmlToBlocks` ([b2dfcfc](https://github.com/portabletext/editor/commit/b2dfcfc99e92a7153bb1a9559d24c301df078951))

### Bug Fixes

- **deps:** update sanity monorepo to ^4.4.0 ([6ba20dd](https://github.com/portabletext/editor/commit/6ba20dd704a244f4da157e1b543f89a6b4cb89db))
- **deps:** update sanity monorepo to ^4.4.1 ([697ec61](https://github.com/portabletext/editor/commit/697ec61fb74ad08ab0693377d483ab8765e2b8bd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/sanity-bridge bumped to 1.1.1

## [3.0.0](https://github.com/portabletext/editor/compare/block-tools-v2.0.8...block-tools-v3.0.0) (2025-08-12)

### ⚠ BREAKING CHANGES

- remove export of unused `BlockEditorSchemaProps` and `ResolvedAnnotationType`
- remove export of `blockContentFeatures`

### Bug Fixes

- remove export of `blockContentFeatures` ([843b092](https://github.com/portabletext/editor/commit/843b09287e2899b39d0ebc07a2a366a62aa0479a))
- remove export of unused `BlockEditorSchemaProps` and `ResolvedAnnotationType` ([10b8ed7](https://github.com/portabletext/editor/commit/10b8ed7ac0857c60fd6885dd467109c4e8c4e18e))
- **types:** limit dependency on `@sanity/types` ([b0f8fe8](https://github.com/portabletext/editor/commit/b0f8fe80b71b3831520f71778eab39cab2063a54))

## [2.0.8](https://github.com/portabletext/editor/compare/block-tools-v2.0.7...block-tools-v2.0.8) (2025-08-06)

### Bug Fixes

- **deps:** update sanity monorepo to ^4.3.0 ([d3baa56](https://github.com/portabletext/editor/commit/d3baa561bbb6a1cafdaf08c98b21f0f68d04dfdf))

## [2.0.7](https://github.com/portabletext/editor/compare/block-tools-v2.0.6...block-tools-v2.0.7) (2025-08-05)

### Bug Fixes

- **deps:** update sanity monorepo to ^4.3.0 ([d3baa56](https://github.com/portabletext/editor/commit/d3baa561bbb6a1cafdaf08c98b21f0f68d04dfdf))

## [2.0.6](https://github.com/portabletext/editor/compare/block-tools-v2.0.5...block-tools-v2.0.6) (2025-08-05)

### Bug Fixes

- **deps:** update sanity monorepo to ^4.3.0 ([d3baa56](https://github.com/portabletext/editor/commit/d3baa561bbb6a1cafdaf08c98b21f0f68d04dfdf))

## [2.0.5](https://github.com/portabletext/editor/compare/block-tools-v2.0.4...block-tools-v2.0.5) (2025-08-04)

### Bug Fixes

- **deps:** update react monorepo ([8c09d21](https://github.com/portabletext/editor/commit/8c09d212832797a10abcd0c3bc3cea30a3cb610a))

## [2.0.4](https://github.com/portabletext/editor/compare/block-tools-v2.0.3...block-tools-v2.0.4) (2025-08-04)

### Bug Fixes

- **deps:** update react monorepo ([8c09d21](https://github.com/portabletext/editor/commit/8c09d212832797a10abcd0c3bc3cea30a3cb610a))

## [2.0.3](https://github.com/portabletext/editor/compare/block-tools-v2.0.2...block-tools-v2.0.3) (2025-08-04)

### Bug Fixes

- **deps:** update react monorepo ([8c09d21](https://github.com/portabletext/editor/commit/8c09d212832797a10abcd0c3bc3cea30a3cb610a))

## [2.0.2](https://github.com/portabletext/editor/compare/block-tools-v2.0.1...block-tools-v2.0.2) (2025-08-04)

### Bug Fixes

- **deps:** update react monorepo ([8c09d21](https://github.com/portabletext/editor/commit/8c09d212832797a10abcd0c3bc3cea30a3cb610a))

## [2.0.1](https://github.com/portabletext/editor/compare/block-tools-v2.0.0...block-tools-v2.0.1) (2025-08-04)

### Bug Fixes

- **deps:** update sanity monorepo to ^4.2.0 ([103216b](https://github.com/portabletext/editor/commit/103216b9040661d30d466c46f2186bbf0a9a60b4))

## [2.0.0](https://github.com/portabletext/editor/compare/block-tools-v1.1.38...block-tools-v2.0.0) (2025-07-17)

### ⚠ BREAKING CHANGES

- require sanity studio v4 ([#1415](https://github.com/portabletext/editor/issues/1415))

### Features

- require sanity studio v4 ([#1415](https://github.com/portabletext/editor/issues/1415)) ([bc7441a](https://github.com/portabletext/editor/commit/bc7441a1cf14b67261f794a23b8793108afb5213))

### Bug Fixes

- use `rolldown` instead of `api-extractor` for dts generation ([#1445](https://github.com/portabletext/editor/issues/1445)) ([6dd6b51](https://github.com/portabletext/editor/commit/6dd6b51729b53479e9dd16fedbc8fc9bda73e6c1))

## [1.1.38](https://github.com/portabletext/editor/compare/block-tools-v1.1.37...block-tools-v1.1.38) (2025-07-10)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.98.1 ([6fc3671](https://github.com/portabletext/editor/commit/6fc367160ac3ffcb88176fc4d06a99f5c78f5247))

## [1.1.37](https://github.com/portabletext/editor/compare/block-tools-v1.1.36...block-tools-v1.1.37) (2025-07-08)

### Bug Fixes

- **deps:** allow studio v4 in peer dep ranges ([#1414](https://github.com/portabletext/editor/issues/1414)) ([00b9512](https://github.com/portabletext/editor/commit/00b9512b554420f1f0c8577cda8f6f206326549f))

## [1.1.36](https://github.com/portabletext/editor/compare/block-tools-v1.1.35...block-tools-v1.1.36) (2025-07-08)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.98.0 ([6d57e9b](https://github.com/portabletext/editor/commit/6d57e9b83830e7e45b93ae77466afe53e8a06ef0))

## [1.1.35](https://github.com/portabletext/editor/compare/block-tools-v1.1.34...block-tools-v1.1.35) (2025-07-07)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.97.1 ([e8627eb](https://github.com/portabletext/editor/commit/e8627ebbaf8b097414aec0282a8c22f883f8e2ff))

## [1.1.34](https://github.com/portabletext/editor/compare/block-tools-v1.1.33...block-tools-v1.1.34) (2025-07-02)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.96.0 ([c0d7527](https://github.com/portabletext/editor/commit/c0d7527f1e4aef1c3e999d1e3286ac60ca4037a5))

## [1.1.33](https://github.com/portabletext/editor/compare/block-tools-v1.1.32...block-tools-v1.1.33) (2025-06-27)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.95.0 ([a1605c6](https://github.com/portabletext/editor/commit/a1605c6a4c7a5c51e210881b1a76892b0c0ff24b))

## [1.1.32](https://github.com/portabletext/editor/compare/block-tools-v1.1.31...block-tools-v1.1.32) (2025-06-25)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.94.2 ([cf34861](https://github.com/portabletext/editor/commit/cf3486130db235ba01cb77e8a42ecbaedf76e8ea))

## [1.1.31](https://github.com/portabletext/editor/compare/block-tools-v1.1.30...block-tools-v1.1.31) (2025-06-18)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.93.0 ([c2b2785](https://github.com/portabletext/editor/commit/c2b2785c964d54a011677f3e75de35353b577f04))

## [1.1.30](https://github.com/portabletext/editor/compare/block-tools-v1.1.29...block-tools-v1.1.30) (2025-06-11)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.92.0 ([8aebf95](https://github.com/portabletext/editor/commit/8aebf95a4dfe6afa16708a56586c39fc7a934029))

## [1.1.29](https://github.com/portabletext/editor/compare/block-tools-v1.1.28...block-tools-v1.1.29) (2025-06-10)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.91.0 ([87993d6](https://github.com/portabletext/editor/commit/87993d620967cc6dba5e75e284fd7393652a3733))

## [1.1.28](https://github.com/portabletext/editor/compare/block-tools-v1.1.27...block-tools-v1.1.28) (2025-05-29)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.90.0 ([2c4f256](https://github.com/portabletext/editor/commit/2c4f25688fa18f84f1d8f50fc05ee343c1432ff2))

## [1.1.27](https://github.com/portabletext/editor/compare/block-tools-v1.1.26...block-tools-v1.1.27) (2025-05-21)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.89.0 ([23d9cb8](https://github.com/portabletext/editor/commit/23d9cb80d99705c055e8746e1b4fd438ed414640))

## [1.1.26](https://github.com/portabletext/editor/compare/block-tools-v1.1.25...block-tools-v1.1.26) (2025-05-14)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.88.3 ([966a18e](https://github.com/portabletext/editor/commit/966a18edd164ac26fd3465dc1c4c16994e7bbc17))

## [1.1.25](https://github.com/portabletext/editor/compare/block-tools-v1.1.24...block-tools-v1.1.25) (2025-05-09)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.88.2 ([ef30039](https://github.com/portabletext/editor/commit/ef3003905679a12d34135ece7ec119bbb59946ca))

## [1.1.24](https://github.com/portabletext/editor/compare/block-tools-v1.1.23...block-tools-v1.1.24) (2025-05-07)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.88.0 ([e0dc666](https://github.com/portabletext/editor/commit/e0dc666cc5a7ae851dc7ea1ad242ba6aebbff97b))

## [1.1.23](https://github.com/portabletext/editor/compare/block-tools-v1.1.22...block-tools-v1.1.23) (2025-05-02)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.87.1 ([65bdc36](https://github.com/portabletext/editor/commit/65bdc36b80ce4e582ba0f838acd6baf5c78554d8))

## [1.1.22](https://github.com/portabletext/editor/compare/block-tools-v1.1.21...block-tools-v1.1.22) (2025-04-30)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.87.0 ([facf2cf](https://github.com/portabletext/editor/commit/facf2cf6a0451788f4d5be7cbcc40ce4e7fe5a00))

## [1.1.21](https://github.com/portabletext/editor/compare/block-tools-v1.1.20...block-tools-v1.1.21) (2025-04-24)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.86.1 ([7161552](https://github.com/portabletext/editor/commit/7161552c1d9b9d274dc884d93553fb069ba0f3f5))

## [1.1.20](https://github.com/portabletext/editor/compare/block-tools-v1.1.19...block-tools-v1.1.20) (2025-04-23)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.86.0 ([8c0c285](https://github.com/portabletext/editor/commit/8c0c28559f3ca634c8a4b94d88b42789dd831ac7))

## [1.1.19](https://github.com/portabletext/editor/compare/block-tools-v1.1.18...block-tools-v1.1.19) (2025-04-16)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.85.1 ([2aa02fc](https://github.com/portabletext/editor/commit/2aa02fc54643839815964d14bdb76b599d9a4315))

## [1.1.18](https://github.com/portabletext/editor/compare/block-tools-v1.1.17...block-tools-v1.1.18) (2025-04-11)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.84.0 ([e714ae6](https://github.com/portabletext/editor/commit/e714ae6c7bc4d89c30274b47fe631b19e76f71bb))

## [1.1.17](https://github.com/portabletext/editor/compare/block-tools-v1.1.16...block-tools-v1.1.17) (2025-04-08)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.83.0 ([0b67d87](https://github.com/portabletext/editor/commit/0b67d8780b680960c6bcf0f651ae9aa97e27c356))

## [1.1.16](https://github.com/portabletext/editor/compare/block-tools-v1.1.15...block-tools-v1.1.16) (2025-04-01)

### Bug Fixes

- **deps:** update react monorepo ([18b6c3e](https://github.com/portabletext/editor/commit/18b6c3eaca5380705c435efe1b0aa74f9a3aff1d))

## [1.1.15](https://github.com/portabletext/editor/compare/block-tools-v1.1.14...block-tools-v1.1.15) (2025-03-25)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.81.0 ([ec993c4](https://github.com/portabletext/editor/commit/ec993c466cfed2db3b478098e91cc6fa3399338b))

## [1.1.14](https://github.com/portabletext/editor/compare/block-tools-v1.1.13...block-tools-v1.1.14) (2025-03-19)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.80.1 ([d12edbe](https://github.com/portabletext/editor/commit/d12edbe0d11516621934b20cf6b904b1e93db275))

## [1.1.13](https://github.com/portabletext/editor/compare/block-tools-v1.1.12...block-tools-v1.1.13) (2025-03-12)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.78.1 ([2902cf0](https://github.com/portabletext/editor/commit/2902cf06674a136d4145fc2fff108b581e6d0efa))
- **deps:** update sanity monorepo to ^3.79.0 ([f2a1768](https://github.com/portabletext/editor/commit/f2a1768c82af579f60126a8c5c4c5fc28dda929f))

## [1.1.12](https://github.com/portabletext/editor/compare/block-tools-v1.1.11...block-tools-v1.1.12) (2025-03-06)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.78.0 ([7bcaac8](https://github.com/portabletext/editor/commit/7bcaac8977d97567905fcf3f577f2c271472f09d))

## [1.1.11](https://github.com/portabletext/editor/compare/block-tools-v1.1.10...block-tools-v1.1.11) (2025-02-28)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.77.2 ([1f9792e](https://github.com/portabletext/editor/commit/1f9792ea6468e2ca13c819b0abe94041b5238a27))

## [1.1.10](https://github.com/portabletext/editor/compare/block-tools-v1.1.9...block-tools-v1.1.10) (2025-02-25)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.77.1 ([3704f06](https://github.com/portabletext/editor/commit/3704f069fce69fd9c6956fa14d557223ee56e01a))

## [1.1.9](https://github.com/portabletext/editor/compare/block-tools-v1.1.8...block-tools-v1.1.9) (2025-02-21)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.76.1 ([03e26b9](https://github.com/portabletext/editor/commit/03e26b9939ef0bb8e1679927c5261a60859cf2fd))
- **deps:** update sanity monorepo to ^3.76.3 ([149a654](https://github.com/portabletext/editor/commit/149a6548afed5464f289fd2f2a6fce453873f7d3))

## [1.1.8](https://github.com/portabletext/editor/compare/block-tools-v1.1.7...block-tools-v1.1.8) (2025-02-17)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.75.1 ([144b978](https://github.com/portabletext/editor/commit/144b978191b78a48f944b0e885c11f6263ec7ba4))

## [1.1.7](https://github.com/portabletext/editor/compare/block-tools-v1.1.6...block-tools-v1.1.7) (2025-02-12)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.75.0 ([8f9bd9b](https://github.com/portabletext/editor/commit/8f9bd9bccdb0ba824885a592be3c497280af288b))

## [1.1.6](https://github.com/portabletext/editor/compare/block-tools-v1.1.5...block-tools-v1.1.6) (2025-02-06)

### Bug Fixes

- **block-tools:** ensure single line breaks in blockquotes ([faa7eda](https://github.com/portabletext/editor/commit/faa7eda6f71076e1c43357182287a430dae27b68))
- **deps:** update sanity monorepo to ^3.74.1 ([bc4b1bc](https://github.com/portabletext/editor/commit/bc4b1bcb15e66d9ff49771944c20e4c9eccae45d))

## [1.1.5](https://github.com/portabletext/editor/compare/block-tools-v1.1.4...block-tools-v1.1.5) (2025-02-05)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.73.0 ([8825ef6](https://github.com/portabletext/editor/commit/8825ef6ad652c1227f404eb222b8bcda2638c4c8))
- **deps:** update sanity monorepo to ^3.74.0 ([1a3296e](https://github.com/portabletext/editor/commit/1a3296e506f06a23a2a7a82c9ecec45bfac41f39))

## [1.1.4](https://github.com/portabletext/editor/compare/block-tools-v1.1.3...block-tools-v1.1.4) (2025-01-29)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.72.1 ([8a82ff8](https://github.com/portabletext/editor/commit/8a82ff8a838d2ee7759060a81fbd819b64061a9c))

## [1.1.3](https://github.com/portabletext/editor/compare/block-tools-v1.1.2...block-tools-v1.1.3) (2025-01-24)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.71.2 ([5c815ce](https://github.com/portabletext/editor/commit/5c815ce18ce0e7445cedf09749161d768fe51cc7))

## [1.1.2](https://github.com/portabletext/editor/compare/block-tools-v1.1.1...block-tools-v1.1.2) (2025-01-22)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.71.1 ([6234d33](https://github.com/portabletext/editor/commit/6234d33cd970e2a7f8b9397848181e5c9c8685fc))

## [1.1.1](https://github.com/portabletext/editor/compare/block-tools-v1.1.0...block-tools-v1.1.1) (2025-01-22)

### Bug Fixes

- **deps:** update sanity monorepo to ^3.71.0 ([8527763](https://github.com/portabletext/editor/commit/85277637914a4f9b00e79346874fbe9b3a35eac8))

## [1.1.0](https://github.com/portabletext/editor/compare/block-tools-v1.0.2...block-tools-v1.1.0) (2025-01-15)

### Features

- allow passing `keyGenerator` to `htmlToBlocks` and `normalizeBlock` ([e8a4502](https://github.com/portabletext/editor/commit/e8a4502b44f3bdfbc8bbac5b9ad56df57efc77b9))

### Bug Fixes

- **deps:** update sanity monorepo to ^3.70.0 ([b345181](https://github.com/portabletext/editor/commit/b345181e424e8702f88f5d2f10a0ca7cbce0061e))

## [1.0.2](https://github.com/portabletext/editor/compare/block-tools-v1.0.1...block-tools-v1.0.2) (2025-01-14)

### Bug Fixes

- **block-tools:** simplify package config ([e855e06](https://github.com/portabletext/editor/commit/e855e0614fbc4f407b62df4c3464eec4e993dc14))
- **block-tools:** switch module type back to `module` ([92d8652](https://github.com/portabletext/editor/commit/92d865258f4f6fe0669c4002c4b197f1c6108c19))

## [1.0.1](https://github.com/portabletext/editor/compare/block-tools-v1.0.0...block-tools-v1.0.1) (2025-01-14)

### Bug Fixes

- **block-tools:** switch module to `commonjs` ([9a2d26f](https://github.com/portabletext/editor/commit/9a2d26f24ca75d8cde84e21826599e4e6289b1ba))

## 1.0.0 (2025-01-13)

### ⚠ BREAKING CHANGES

- Code that accessed types in the Schema namespace must import the types directly instead.

### Features

- **block-tools:** add special notion handling for single block decorators ([#5411](https://github.com/portabletext/editor/issues/5411)) ([7087f80](https://github.com/portabletext/editor/commit/7087f809ae3efda1219bfdc2be7e96c1e2a8a3bd))
- **block-tools:** use strict typings ([a85f46b](https://github.com/portabletext/editor/commit/a85f46b20383f1c7cd2e4eed8df79aef7859cadf))
- conditionally set maximum search depth in studio search ([#5440](https://github.com/portabletext/editor/issues/5440)) ([c86eefe](https://github.com/portabletext/editor/commit/c86eefe03ff3f2a83fa285d18370b75bf65d2769))
- **form-builder:** add field groups ([#3006](https://github.com/portabletext/editor/issues/3006)) ([2d2c7f6](https://github.com/portabletext/editor/commit/2d2c7f6c8d7c8b568016367e9ae1299aac85feee))
- **i18n:** localize menu items ([#5308](https://github.com/portabletext/editor/issues/5308)) ([c3ec684](https://github.com/portabletext/editor/commit/c3ec684fd9890d3f613d24d5f86dfdf5336228d9))
- **i18n:** translate portable text editor ([#5225](https://github.com/portabletext/editor/issues/5225)) ([0f51607](https://github.com/portabletext/editor/commit/0f51607be91f609d7afef493e07b53a1f5ccc277))
- introduce `@portabletext/block-tools` ([3ee2d70](https://github.com/portabletext/editor/commit/3ee2d7007c57c10acb95cf2fe6afa0ec5cb93106))
- move to react `18` ([#3612](https://github.com/portabletext/editor/issues/3612)) ([a4d921d](https://github.com/portabletext/editor/commit/a4d921d94001c1c187591c577767dc657051c464))
- replaced Schema namespace with plain exports for schema-definitions ([#3699](https://github.com/portabletext/editor/issues/3699)) ([c2040bf](https://github.com/portabletext/editor/commit/c2040bf818d673232036b32d7b0f4b19e1352cca))

### Bug Fixes

- **@sanity:** issue where hidden unicode characters were bloating document in PTE ([#6440](https://github.com/portabletext/editor/issues/6440)) ([4a3bfae](https://github.com/portabletext/editor/commit/4a3bfae9592717899bb458a1b7a1a48d836ace0f))
- add `node.module` export condition ([#4798](https://github.com/portabletext/editor/issues/4798)) ([4f07446](https://github.com/portabletext/editor/commit/4f074466707401e717436dd18d89f0e8ae503025))
- **base:** add workaround for read-only children ([a03656d](https://github.com/portabletext/editor/commit/a03656da0c52c79d5d3a32a6fcc4bec1930e20b2))
- **block-tools:** \_markDefs must be class var ([364505f](https://github.com/portabletext/editor/commit/364505f33bb9da6c2c7ae941768810ab39a408ba))
- **block-tools:** enforce list support in schema ([#4985](https://github.com/portabletext/editor/issues/4985)) ([72c06d3](https://github.com/portabletext/editor/commit/72c06d302e6ca733f23a26cba66be1f0f7053009))
- **block-tools:** fix broken unit tests ([034b10d](https://github.com/portabletext/editor/commit/034b10df70166b8026869851f48fb33978089baa))
- **block-tools:** fix lint errors ([deb8b3c](https://github.com/portabletext/editor/commit/deb8b3c11712ede1ae05f2451e0781cad47550b9))
- **block-tools:** fix Windows issue with gdocs preprocessor rule ([2619afe](https://github.com/portabletext/editor/commit/2619afea94e9c5e43a51766a9b2989aae3e15b86))
- **block-tools:** ignore blocks inside list items ([#3492](https://github.com/portabletext/editor/issues/3492)) ([f20135e](https://github.com/portabletext/editor/commit/f20135e8760dc6738e69f931c3e32a9977676f53))
- **block-tools:** keep strike-through formatting when pasting from gdocs ([#5443](https://github.com/portabletext/editor/issues/5443)) ([6aba418](https://github.com/portabletext/editor/commit/6aba418c208824e9e131767a9ab5d8db88bd5761))
- **block-tools:** more robust formatting detection on copy paste in Safari ([#5485](https://github.com/portabletext/editor/issues/5485)) ([d4cb94c](https://github.com/portabletext/editor/commit/d4cb94cfe717c778cb65e42ef6fd15bc898f1268))
- **block-tools:** preserve whitespace in preprocess for certain html tags ([#4540](https://github.com/portabletext/editor/issues/4540)) ([e74b12e](https://github.com/portabletext/editor/commit/e74b12ec36aabf74e1ecbf8e59a5603aba3f9009))
- **block-tools:** removal of strikethrough in links when copying from gdocs to PTE ([#6382](https://github.com/portabletext/editor/issues/6382)) ([a237b58](https://github.com/portabletext/editor/commit/a237b587c5c448e3767ba2b3eeb2cb5670d1fe02))
- **block-tools:** remove references to implicit globals `document` and `Text` ([#7532](https://github.com/portabletext/editor/issues/7532)) ([9891e7d](https://github.com/portabletext/editor/commit/9891e7d180ff5ada7b6db2fcd1ef228ffc2c3329))
- **deps:** bump `@sanity/pkg-utils` to `v6.10.7` ([#7277](https://github.com/portabletext/editor/issues/7277)) ([1e05ea3](https://github.com/portabletext/editor/commit/1e05ea30b645292b0abf5a79fe14f812da5dbd43))
- **deps:** fix dependency configurations ([8abf82d](https://github.com/portabletext/editor/commit/8abf82d374ef17cd93516d5041732553c782b73c))
- **deps:** Update react monorepo ([#5089](https://github.com/portabletext/editor/issues/5089)) ([07be390](https://github.com/portabletext/editor/commit/07be39091b7b6f0094e3cf0976b0d236338e9dd1))
- **deps:** Update react monorepo ([#6176](https://github.com/portabletext/editor/issues/6176)) ([8be9e60](https://github.com/portabletext/editor/commit/8be9e60a1afbaf32e7616ab2472e5e2924a063c8))
- **deps:** upgrade to `@sanity/pkg-utils@2` ([#4012](https://github.com/portabletext/editor/issues/4012)) ([8962b23](https://github.com/portabletext/editor/commit/8962b2328a13684e0f9de2497ead679b8932ed0f))
- ensure lodash is optimized in every monorepo package ([a91d8c8](https://github.com/portabletext/editor/commit/a91d8c8dcf32d2e2fa33e86be92298f3d9e55bfc))
- pin get-random-values-esm to 1.0.0 ([7231a73](https://github.com/portabletext/editor/commit/7231a73265b62e43182c7f75f130a07618d91e97))
- **portable-text-editor:** copy paste improvements ([#5274](https://github.com/portabletext/editor/issues/5274)) ([da8db9b](https://github.com/portabletext/editor/commit/da8db9bc0b5bebaddf93490bf59addf6186012b5))
- React 19 typings (finally) ([#8171](https://github.com/portabletext/editor/issues/8171)) ([4185d9e](https://github.com/portabletext/editor/commit/4185d9e33244efccdf0470ef78812e74a9701140))
- remove `cleanStegaUnicode` helper ([#6564](https://github.com/portabletext/editor/issues/6564)) ([5dfb932](https://github.com/portabletext/editor/commit/5dfb93208aba191424d1d34d38afe1c802e97b3b))
- run prettier ([bfcc1b2](https://github.com/portabletext/editor/commit/bfcc1b2110acd01d36f042ffa35732e88f635f8d))
- **schema/types:** fix issues with block schema's internal structure ([#5152](https://github.com/portabletext/editor/issues/5152)) ([132788a](https://github.com/portabletext/editor/commit/132788ae94f62a2ac09870d70254cf6cfd838807))
- upgrade to `@sanity/pkg-utils` v5 and use updated ESM best practices ([#5983](https://github.com/portabletext/editor/issues/5983)) ([b619dd1](https://github.com/portabletext/editor/commit/b619dd142e0e9831c57fd28758c04ca5511a07dd))
- use `vercelStegaClean` util from `@vercel/stega` ([#6544](https://github.com/portabletext/editor/issues/6544)) ([b652dc2](https://github.com/portabletext/editor/commit/b652dc2124687af665c90d8f121dac22b4b28e18))
- use workspace protocol for all workspace dependencies ([#6088](https://github.com/portabletext/editor/issues/6088)) ([c5d1d35](https://github.com/portabletext/editor/commit/c5d1d35bce24d5c48b21e8818797b7e05e964542))
- whitelist all standard text decorators in block-tools ([#4526](https://github.com/portabletext/editor/issues/4526)) ([fcc8f13](https://github.com/portabletext/editor/commit/fcc8f13711bcef623db69fcf934b1b14a9cf310f))
