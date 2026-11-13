import {expect, type Page} from '@playwright/test'
import {Feature} from '../src/playwright'
import {Given} from '../src/step-definitions'

Feature({
  fixtures: ['page'],
  featureText: `Feature: Expected failure with a page fixture
Scenario: marked page
Given foo on the page`,
  expectFail: () => true,
  stepDefinitions: [
    Given('foo on the page', async (context: {playwright: {page: Page}}) => {
      await context.playwright.page.setContent('<p>foo</p>')
      expect(await context.playwright.page.locator('p').textContent()).toEqual(
        'bar',
      )
    }),
  ],
})
