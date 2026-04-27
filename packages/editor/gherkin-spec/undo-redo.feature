Feature: Undo/Redo

  Background:
    Given a global keymap

  Scenario: Undoing writing two words
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And " bar" is typed
    And undo is performed
    Then the editor state is "B: foo|"

  Scenario: Selection change does not affect the undo stack
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And "{ArrowLeft}" is pressed
    And "bar" is typed
    Then the editor state is "B: fobar|o"
    When undo is performed
    Then the editor state is "B: fo|o"

  Scenario: Undoing annotation
    Given the editor state is "B: foo"
    When "foo" is selected
    And "link" is toggled
    And undo is performed
    Then the editor state is "B: ^foo|"

  Scenario: Undoing the deletion of the last char of annotated text
    Given the editor state is "B: foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And "{ArrowRight}" is pressed
    And "{Backspace}" is pressed
    And undo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":foo|]
      """

  Scenario: Redoing the deletion of the last char of annotated text
    Given the editor state is "B: foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And "{ArrowRight}" is pressed
    And "{Backspace}" is pressed
    And undo is performed
    When redo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":fo|]
      """

  Scenario: Undoing inserting text after annotated text
    Given the editor state is "B: foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And "{ArrowRight}" is pressed
    And "{Space}" is pressed
    Then the editor state is
      """
      B: [@comment _key="c1":foo] |
      """
    When undo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":foo|]
      """

  Scenario: Undoing and redoing inserting text after annotated text
    Given the editor state is "B: foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And "{ArrowRight}" is pressed
    And "{Space}" is pressed
    And undo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":foo|]
      """
    When redo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":foo] |
      """

  Scenario: Undoing the deletion of block with annotation at the end
    Given the editor state is "B: foo bar"
    And a "comment" "c1" around "bar"
    When the editor is focused
    And "foo bar" is selected
    And "{Backspace}" is pressed
    And undo is performed
    Then the editor state is
      """
      B: ^foo [@comment _key="c1":bar|]
      """

  Scenario: Undoing deletion of annotated block
    Given the editor state is "B: foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And "{Backspace}" is pressed
    And undo is performed
    Then the editor state is
      """
      B: [@comment _key="c1":foo|]
      """

  Scenario: Undoing annotation across text blocks
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" is toggled
    And undo is performed
    Then the editor state is
      """
      B: ^foo
      B: bar|
      """

  Scenario: Undoing action step
    Given the editor state is "B: -"
    When the editor is focused
    And ">" is typed
    And "new" is typed
    Then the editor state is "B: →new|"
    When undo is performed
    And undo is performed
    Then the editor state is "B: ->"

  Scenario: Consecutive undo after selection change
    Given the editor state is "B: -"
    When the editor is focused
    And ">" is typed
    And undo is performed
    And "{ArrowLeft}" is pressed
    And undo is performed
    Then the editor state is "B: -|"

  Scenario: Undo after transform on expanded selection
    Given the editor state is "B: (cf"
    When "f" is selected
    And ")" is inserted
    Then the editor state is "B: |©"
    When undo is performed
    Then the editor state is "B: (c)|"
    When undo is performed
    Then the editor state is "B: (c^f|"

  Scenario: Undoing break in the middle of text
    Given the editor state is "B: foobar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    And "x" is typed
    Then the editor state is
      """
      B: foo
      B: x|bar
      """
    When undo is performed
    And undo is performed
    And "y" is typed
    Then the editor state is "B: fooy|bar"

  Scenario: Undoing delete backward across blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put before "bar"
    And "{Backspace}" is pressed
    And "x" is typed
    Then the editor state is "B: foox|bar"
    When undo is performed
    And undo is performed
    And "y" is typed
    Then the editor state is
      """
      B: foo
      B: y|bar
      """

  Scenario: Undoing and redoing break
    Given the editor state is "B: foobar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: foo
      B: |bar
      """
    When undo is performed
    Then the editor state is "B: foo|bar"
    When redo is performed
    Then the editor state is
      """
      B: foo
      B: |bar
      """
