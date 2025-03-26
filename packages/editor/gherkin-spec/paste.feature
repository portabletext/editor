Feature: Paste

  Background:
    Given one editor

  Scenario: Copying text block and pasting it after itself
    Given the text "foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And copy is performed
    And the caret is put after "baz"
    And paste is performed
    Then the text is "foo ,bar, bazfoo ,bar, baz"
