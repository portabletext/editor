Feature: Selection

  Background:
    Given one editor

  Scenario: Expanding collapsed selection backwards from empty line
    Given the text "P: foo;;P: "
    When the editor is focused
    And the caret is put before ""
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "P: o;;P: " is selected

  Scenario: Expanding selection backwards, then forwards
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "P: o;;P: " is selected
    When "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "P: b" is selected

  Scenario: Reducing hanging selection
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put before "foo"
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "P: foo;;P: " is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "P: foo" is selected

  Scenario: Reducing selection hanging onto empty line
    Given the text "P: foo;;P: "
    When the editor is focused
    And the caret is put before "foo"
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    And "{Shift>}{ArrowRight}{/Shift}" is pressed
    Then "P: foo;;P: " is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "P: foo" is selected
