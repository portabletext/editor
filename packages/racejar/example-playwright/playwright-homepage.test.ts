import {expect} from '@playwright/test'
import {Feature, type PlaywrightContext} from '../src/playwright'
import {Given, Then, When} from '../src/step-definitions'

type Context = PlaywrightContext

Feature({
  featureText: `
    Feature: Playwright Homepage
      Scenario: Navigating to Get Started
        Given the homepage
        When clicking the "Get started" link
        Then the heading is "Installation"`,
  stepDefinitions: [
    Given('the homepage', async (context: Context) => {
      await context.playwright.page.goto('https://playwright.dev/')
    }),
    When(
      'clicking the {string} link',
      async (context: Context, linkName: string) => {
        await context.playwright.page
          .getByRole('link', {name: linkName})
          .click()
      },
    ),
    Then(
      'the heading is {string}',
      async (context: Context, heading: string) => {
        await expect(
          context.playwright.page.getByRole('heading', {name: heading}),
        ).toBeVisible()
      },
    ),
  ],
})
