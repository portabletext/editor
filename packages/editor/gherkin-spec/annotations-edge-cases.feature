Feature: Annotations Edge Cases

  Background:
    Given one editor
    And a global keymap

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "c1" around "bar"
    When "foo bar baz" is selected
    And "Backspace" is pressed
    Then the editor is empty

  Scenario: Deleting half of annotated text
    Given the text "foo bar baz"
    And a "comment" "c1" around "foo bar baz"
    When " baz" is selected
    And "Backspace" is pressed
    Then the text is "foo bar"
    And "foo bar" has marks "c1"

  Scenario: Deleting annotation in the middle of text
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "bar " is selected
    And "Backspace" is pressed
    Then the text is "foo baz"
    And "foo baz" has no marks

  # Warning: Possible wrong behaviour
  # "f" and "r" should end up on the same line
  Scenario: Deleting across annotated blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    When "foo" is marked with a "link" "l1"
    And "bar" is marked with a "link" "l2"
    And "ooba" is selected
    And "Backspace" is pressed
    Then the text is "f|r"
    And "f" has marks "l1"
    And "r" has marks "l2"
