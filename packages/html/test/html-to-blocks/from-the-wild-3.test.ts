import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToPortableText} from '../../src'
import {isElement} from '../../src/HtmlDeserializer/helpers'
import {createTestKeyGenerator} from '../test-key-generator'
import {testSchema} from './test-utils'

const html = `
<ul class="c-global-footer-v2-list row">
<li class="c-global-footer-v2-list__item col-sm-offset-3 col-sm-6 col-md-offset-3 col-md-6">
<div class="c-social-container">
<div class="c-social-container__list">
<a href="http://www.facebook.com/magnumuk" target="_blank" class="c-social-icons-list" title="facebook-icon" data-ct-action="clickstosocialplatforms">
<div class="c-social-container__img">
<picture class="lazy-load is-lazyload loaded"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png" media="screen and (min-width: 992px) and (max-width: 1199px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png" media="screen and (min-width: 768px) and (max-width: 991px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png" media="screen and (min-width: 480px) and (max-width: 767px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png" media="screen and (min-width: 1200px) " srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png"><img itemprop="image" class=" lazyloaded" alt="Facebook" data-src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png" src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/facebook_icon-1129258.png.ulenscale.32x32.png"></picture>
</div>
<span class="sr-only">Opens in new window</span>
</a>
</div>
<div class="c-social-container__list">
<a href="http://www.twitter.com/magnumuk" target="_blank" class="c-social-icons-list" title="twitter-icon" data-ct-action="clickstosocialplatforms">
<div class="c-social-container__img">
<picture class="lazy-load is-lazyload loaded"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png" media="screen and (min-width: 992px) and (max-width: 1199px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png" media="screen and (min-width: 768px) and (max-width: 991px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png" media="screen and (min-width: 480px) and (max-width: 767px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png" media="screen and (min-width: 1200px) " srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png"><img itemprop="image" class=" lazyloaded" alt="Twitter" data-src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png" src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/twitter_icon-1129264-1658172-png.png.ulenscale.32x32.png"></picture>
</div>
<span class="sr-only">Opens in new window</span>
</a>
</div>
<div class="c-social-container__list">
<a href="http://www.instagram.com/magnum" target="_blank" class="c-social-icons-list" title="instagram" data-ct-action="clickstosocialplatforms">
<div class="c-social-container__img">
<picture class="lazy-load is-lazyload loaded"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png" media="screen and (min-width: 992px) and (max-width: 1199px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png" media="screen and (min-width: 768px) and (max-width: 991px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png" media="screen and (min-width: 480px) and (max-width: 767px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png" media="screen and (min-width: 1200px) " srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png"><img itemprop="image" class=" lazyloaded" alt="Instagram" data-src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png" src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/icon/ice_cream/all/instagram_icon-1129260.png.ulenscale.32x32.png"></picture>
</div>
<span class="sr-only">Opens in new window</span>
</a>
</div>
<div class="c-social-container__list">
<a href="http://www.youtube.com/mymagnum" target="_blank" class="c-social-icons-list" title="youtube" data-ct-action="clickstosocialplatforms">
<div class="c-social-container__img">
<picture class="lazy-load is-lazyload loaded"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png" media="screen and (min-width: 992px) and (max-width: 1199px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png" media="screen and (min-width: 768px) and (max-width: 991px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png" media="screen and (min-width: 480px) and (max-width: 767px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png" media="screen and (min-width: 1200px) " srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png"><img itemprop="image" class=" lazyloaded" alt="YouTube" data-src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png" src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/poland/general_image/youtube_icon-1129265-1658171-png.png.ulenscale.32x32.png"></picture>
</div>
<span class="sr-only">Opens in new window</span>
</a>
</div>
</div>
</li>
<li class="c-global-footer-v2-list__item col-sm-3 col-md-3">
<div class="c-global-footer-v2-copyright">
<a href="" target="_blank" class="c-global-footer-v2-copyright__link" title="© 2019 Copyright Unilever" data-ct-action="linkClick">
<picture class="lazy-load is-lazyload loaded"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png" media="screen and (min-width: 992px) and (max-width: 1199px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png" media="screen and (min-width: 768px) and (max-width: 991px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png" media="screen and (min-width: 480px) and (max-width: 767px)" srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png"><source data-srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png" media="screen and (min-width: 1200px) " srcset="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png"><img itemprop="image" class=" lazyloaded" alt="Unilever Logo" data-src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png" src="//asset-eu.unileversolutions.com/content/dam/unilever/magnum/global/logo/unilever-logo-756451-1712925-png.png.ulenscale.66x73.png"></picture>
<span class="c-global-footer-v2-copyright__text">© 2019 Copyright Unilever</span>
<span class="sr-only">Opens in new window</span>
</a>
</div>
</li>
</ul>
`

const keyGenerator = createTestKeyGenerator()

test('htmlToPortableText', () => {
  expect(
    htmlToPortableText(html, {
      schema: testSchema,
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
      rules: [
        {
          // Special case for pictures
          deserialize(el, _next, block) {
            if (!isElement(el) || el.tagName.toLowerCase() !== 'picture') {
              return undefined
            }
            return block({
              _type: 'image',
              _sanityAsset: 'image@<url>',
            })
          },
        },
      ],
    }),
  ).toEqual([
    {
      _type: 'image',
      _sanityAsset: 'image@<url>',
      _key: 'randomKey4',
    },
    {
      _key: 'randomKey5',
      children: [
        {
          _type: 'span',
          marks: ['randomKey0'],
          text: 'Opens in new window',
          _key: 'randomKey6',
        },
      ],
      markDefs: [
        {
          _key: 'randomKey0',
          _type: 'link',
          href: 'http://www.facebook.com/magnumuk',
        },
      ],
      _type: 'block',
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
    {
      _type: 'image',
      _sanityAsset: 'image@<url>',
      _key: 'randomKey7',
    },
    {
      _key: 'randomKey8',
      children: [
        {
          _type: 'span',
          marks: ['randomKey1'],
          text: 'Opens in new window',
          _key: 'randomKey9',
        },
      ],
      markDefs: [
        {
          _key: 'randomKey1',
          _type: 'link',
          href: 'http://www.twitter.com/magnumuk',
        },
      ],
      _type: 'block',
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
    {
      _type: 'image',
      _sanityAsset: 'image@<url>',
      _key: 'randomKey10',
    },
    {
      _key: 'randomKey11',
      children: [
        {
          _type: 'span',
          marks: ['randomKey2'],
          text: 'Opens in new window',
          _key: 'randomKey12',
        },
      ],
      markDefs: [
        {
          _key: 'randomKey2',
          _type: 'link',
          href: 'http://www.instagram.com/magnum',
        },
      ],
      _type: 'block',
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
    {
      _type: 'image',
      _sanityAsset: 'image@<url>',
      _key: 'randomKey13',
    },
    {
      _key: 'randomKey14',
      children: [
        {
          _type: 'span',
          marks: ['randomKey3'],
          text: 'Opens in new window',
          _key: 'randomKey15',
        },
      ],
      markDefs: [
        {
          _key: 'randomKey3',
          _type: 'link',
          href: 'http://www.youtube.com/mymagnum',
        },
      ],
      _type: 'block',
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
    {
      _type: 'image',
      _sanityAsset: 'image@<url>',
      _key: 'randomKey16',
    },
    {
      _key: 'randomKey17',
      children: [
        {
          _type: 'span',
          marks: [],
          text: '© 2019 Copyright Unilever Opens in new window',
          _key: 'randomKey18',
        },
      ],
      markDefs: [],
      _type: 'block',
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
  ])
})
