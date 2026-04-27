Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the editor state is "B: foo"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "bar" is inserted
    Then the editor state is <text>
    And the caret is <new position>

    Examples:
      | position     | text               | new position |
      | before "foo" | "B: ;;B: bar\|foo" | before "foo" |
      | after "foo"  | "B: foo;;B: bar\|" | after "bar"  |
      | after "f"    | "B: f;;B: bar\|oo" | after "bar"  |

  Scenario Outline: Breaking second text block
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the editor state is <text>
    And the caret is <new position>
    When undo is performed
    And undo is performed
    Then the editor state is <undone>

    Examples:
      | position     | text                       | new position | undone             |
      | before "bar" | "B: foo;;B: ;;B: baz\|bar" | before "bar" | "B: foo;;B: \|bar" |
      | after "bar"  | "B: foo;;B: bar;;B: baz\|" | after "baz"  | "B: foo;;B: bar\|" |
      | after "b"    | "B: foo;;B: b;;B: baz\|ar" | after "baz"  | "B: foo;;B: b\|ar" |

  Scenario: Breaking before inline object
    Given the editor state is "B: foo{stock-ticker}bar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    And "baz" is inserted
    Then the editor state is
      """
      B: foo
      B: baz|{stock-ticker}bar
      """

  Scenario: Pressing Enter when selecting the entire content
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the editor is focused
    And everything is selected
    And "{Enter}" is pressed
    Then the editor state is "B: |"
    When undo is performed
    Then the editor state is
      """
      B: ^foo
      {IMAGE}
      B: bar|
      """

  Scenario: Pressing Enter on a block object
    Given the editor state is
      """
      B: foo
      {IMAGE}
      """
    When the editor is focused
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: foo
      {IMAGE}
      B: |
      """
