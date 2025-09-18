Feature: Selection

  Background:
    Given one editor

  Scenario: Expanding collapsed selection backwards from empty line
    Given the text "foo|"
    And the editor is focused
    When the caret is put before ""
    And "{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}" is pressed
    Then "o|" is selected

  Scenario: Expanding selection backwards, then forwards
    Given the text "foo|bar"
    And the editor is focused
    When the caret is put before "bar"
    And "{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}" is pressed
    Then "o|" is selected
    When "{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}" is pressed
    Then "b" is selected

  Scenario: Reducing hanging selection
    Given the text "foo|bar"
    And the editor is focused
    When the caret is put before "foo"
    And "{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}" is pressed
    Then "foo|" is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "foo" is selected

  Scenario: Reducing selection hanging onto empty line
    Given the text "foo|"
    And the editor is focused
    When the caret is put before "foo"
    And "{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}" is pressed
    Then "foo|" is selected
    When "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "foo" is selected
