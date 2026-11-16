Feature: Moving Blocks

  Background:
    Given one editor

  Scenario: Undoing a block move restores the original order
    Given the editor state is
      """
      B: foo
      B: bar
      B: baz
      """
    When the selection is cleared
    And block 1 is moved down
    Then the editor state is
      """
      B: bar
      B: foo
      B: baz
      """
    And nothing is selected
    When undo is performed
    Then the editor state is
      """
      B: foo
      B: bar
      B: baz
      """
    And nothing is selected
