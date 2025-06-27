Feature: Lists

  Background:
    Given one editor

  Scenario: Clearing list item on Enter
    Given the text ">#:foo|>#:"
    When the caret is put after ""
    And "{Enter}" is pressed
    And "bar" is typed
    Then the text is ">#:foo|bar"

  Scenario: Indenting list item on Tab
    Given the text ">#:foo|>#:"
    When the caret is put after ""
    And "{Tab}" is pressed
    And "bar" is typed
    Then the text is ">#:foo|>>#:bar"

  Scenario: Unindenting list item on Shift+Tab
    Given the text ">#:foo|>>#:bar"
    When the caret is put before "bar"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the text is ">#:foo|>#:bar"
