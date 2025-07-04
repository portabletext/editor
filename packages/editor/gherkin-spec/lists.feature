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

  # The inserted list items have lower level than the list item they are
  # inserted on, and are adjusted to match the new level.
  Scenario: Inserting list on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">#:foo|>#:bar|>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|>>#:bar|>>#:baz"

  Scenario: Inserting indented list on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|>>>#:bar|>>>>#:baz"

  Scenario: Inserting different list type on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">-:foo|>-:bar|>-:baz" is inserted at "auto"
    Then the text is ">>-:foo|>>-:bar|>>-:baz"

  Scenario: Inserting mixed blocks starting with a list item
    Given the text ">>-:"
    When the caret is put after ""
    And ">#:foo|{image}|>>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|{image}|>>>#:baz"

  Scenario: Inserting mixed blocks not starting with a list item
    Given the text ">>-:"
    When the caret is put after ""
    And "foo|>#:bar|>>#:baz" is inserted at "auto"
    Then the text is ">>-:foo|>>#:bar|>>>#:baz"
