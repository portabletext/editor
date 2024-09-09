Feature: Selection Adjustment

  Background:
    Given two editors
    And a global keymap

  Scenario: Keeps Editor A on same line if B inserts line above
    Given the text "f" in block "b1"
    When "ArrowLeft" is pressed
    And "Enter" is pressed
    And "Delete" is pressed
    And the caret is put before "" by editor B
    And "Enter" is pressed by editor B
    And "foo" is typed
    Then the text is ",\n,,\n,foo"
    And "foo" is in block "b1"
