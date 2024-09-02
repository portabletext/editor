# In-text objects like stock tickers
Feature: Inline Objects

  Background:
    Given two editors
    And a global keymap

  Scenario: Navigating around a inline object
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put after "stock-ticker"
    And "bar" is typed
    Then the text is "foo,stock-ticker,bar"

  Scenario: Pressing Delete before an inline object
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put before "stock-ticker"
    And "Delete" is pressed
    Then the text is "foo"

  Scenario: Pressing Backspace after an inline object
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put after "stock-ticker"
    And "Backspace" is pressed
    Then the text is "foo"

  Scenario Outline: Deleting an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "stock-ticker" is selected
    And <key> is pressed
    And "bar" is typed
    Then the text is "foobar"

    Examples:
      | key |
      | "Backspace" |
      | "Delete" |

  Scenario: Adding a decorator across an inline object
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put after "stock-ticker"
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foo,stock-ticker,bar"
    And "foo" has marks "strong"
    And "bar" has marks "strong"

  Scenario: Adding an annotation across an inline object
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put after "stock-ticker"
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1" is toggled
    Then the text is "foo,stock-ticker,bar"
    And "foo" has marks "l1"
    And "bar" has marks "l1"

  Scenario: Removing an annotation across an inline block
    Given the text "foo"
    And a "stock-ticker"
    When the caret is put after "stock-ticker"
    And "bar" is typed
    And "foobar" is selected
    And "link" is toggled
    And "link" is toggled
    Then the text is "foo,stock-ticker,bar"
    And "foo" has no marks
    And "bar" has no marks
