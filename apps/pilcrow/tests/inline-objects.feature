# In-text objects like stock tickers
Feature: Inline Objects

  Background:
    Given one editor
    And a global keymap

  Scenario: Writing after inserting an inline object
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And a "stock-ticker" is inserted
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the editor state is "B: foo{stock-ticker}bar|"

  Scenario: Pressing Delete before an inline object
    Given the editor state is "B: foo{stock-ticker}"
    When the editor is focused
    And the caret is put after "foo"
    And "{Delete}" is pressed
    Then the editor state is "B: foo|"

  Scenario: Pressing Backspace after an inline object
    Given the editor state is "B: foo{stock-ticker}"
    When the editor is focused
    And "{Backspace}" is pressed
    Then the caret is after "foo"

  Scenario: Adding a decorator across an inline object
    Given the editor state is "B: foo{stock-ticker}bar"
    When "foobar" is selected
    And "strong" is toggled
    Then the editor state is "B: [strong:^foo]{stock-ticker}[strong:bar|]"

  Scenario: Adding an annotation across an inline object
    Given the editor state is "B: foo{stock-ticker}bar"
    When "foobar" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":^foo]{stock-ticker}[@link _key="l1":bar|]
      """

  Scenario: Removing an annotation across an inline block
    Given the editor state is "B: foo{stock-ticker}bar"
    When "foobar" is selected
    And "link" is toggled
    And "link" is toggled
    Then the editor state is "B: ^foo{stock-ticker}bar|"
