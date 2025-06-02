# In-text objects like stock tickers
Feature: Inline Objects

  Background:
    Given one editor
    And a global keymap

  Scenario: Writing after inserting an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "{ArrowRight}" is pressed
    When "bar" is typed
    Then the text is "foo,[stock-ticker],bar"

  Scenario: Pressing Delete before an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "{Delete}" is pressed
    Then the text is "foo"

  Scenario: Pressing Backspace after an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "{Backspace}" is pressed
    Then the text is "foo"

  Scenario Outline: Deleting an inline object
    Given the text "foo"
    And a "stock-ticker"
    When <key> is pressed
    And "bar" is typed
    Then the text is "foobar"

    Examples:
      | key           |
      | "{Backspace}" |
      | "{Delete}"    |

  Scenario: Adding a decorator across an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "{ArrowRight}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled
    Then the text is "foo,[stock-ticker],bar"
    And "foo" has marks "strong"
    And "bar" has marks "strong"

  Scenario: Adding an annotation across an inline object
    Given the text "foo"
    And a "stock-ticker"
    When "{ArrowRight}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1" is toggled
    Then the text is "foo,[stock-ticker],bar"
    And "foo" has marks "l1"
    And "bar" has marks "l1"

  Scenario: Removing an annotation across an inline block
    Given the text "foo"
    And a "stock-ticker"
    When "{ArrowRight}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" is toggled
    And "link" is toggled
    Then the text is "foo,[stock-ticker],bar"
    And "foo" has no marks
    And "bar" has no marks
