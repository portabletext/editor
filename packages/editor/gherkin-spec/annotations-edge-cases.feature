Feature: Annotations Edge Cases

  Background:
    Given one editor
    And a global keymap

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the editor state is "B: foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "c1" around "bar"
    When the editor is focused
    And "foo bar baz" is selected
    And "{Backspace}" is pressed
    Then the editor state is "B: [em:]"

  Scenario: Deleting half of annotated text
    Given the editor state is "B: foo bar baz"
    And a "comment" "c1" around "foo bar baz"
    When the editor is focused
    And " baz" is selected
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: [@comment _key="c1":foo bar]
      """

  Scenario: Deleting annotation in the middle of text
    Given the editor state is "B: foo bar baz"
    And a "comment" "c1" around "bar"
    When the editor is focused
    And "bar " is selected
    And "{Backspace}" is pressed
    Then the editor state is "B: foo baz"

  Scenario: Deleting across annotated blocks
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And "{Enter}" is pressed
    And "bar" is typed
    And "foo" is selected
    And "link" "l1" is toggled
    And "bar" is selected
    And "link" "l2" is toggled
    And "ooba" is selected
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":f][@link _key="l2":r]
      """
