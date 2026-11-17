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
      await context.playwright.context.clearCookies()
      await context.playwright.page.setContent(`
        <h1>Homepage</h1>
        <a href="#installation" onclick="document.querySelector('#installation').hidden = false">Get started</a>
        <h2 id="installation" hidden>Installation</h2>
      `)
      // @ts-expect-error N1: `request` is not a default fixture
      context.playwright.request
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
