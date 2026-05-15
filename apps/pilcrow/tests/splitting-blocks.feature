Feature: Splitting Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Splitting block at the beginning
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: |foo"
    And "{Enter}" is pressed
    Then the editor state is "B: ;;B _key=\"b1\": |foo"

  Scenario: Splitting block in the middle
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: fo|o"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B _key="b1": fo
      B: |o
      """

  Scenario: Splitting block at the end
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: foo|"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B _key="b1": foo
      B: |
      """

  Scenario: Splitting empty block creates a new block below
    Given the editor state is "B _key=\"b1\": foo;;B _key=\"b2\": "
    When the editor is focused
    And the selection is
      """
      B: foo
      B: |
      """
    And "{Enter}" is pressed
    And "baz" is typed
    Then the editor state is "B _key=\"b1\": foo;;B _key=\"b2\": ;;B: baz|"

  Scenario: Soft-splitting block at the beginning
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: |foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B _key=\"b1\": \n|foo"

  Scenario: Soft-splitting block in the middle
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: fo|o"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B _key=\"b1\": fo\n|o"

  Scenario: Soft-splitting block at the end
    Given the editor state is
      """
      B _key="b1": foo
      """
    When the editor is focused
    And the selection is "B: foo|"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B _key=\"b1\": foo\n|"

  Scenario: Splitting styled block at the beginning
    Given the editor state is
      """
      B style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": |foo"
    And "{Enter}" is pressed
    Then the editor state is "B: ;;B style=\"h1\": |foo"

  Scenario: Splitting styled block in the middle
    Given the editor state is
      """
      B _key="b1" style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": fo|o"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B _key="b1" style="h1": fo
      B style="h1": |o
      """

  Scenario: Splitting styled block at the end
    Given the editor state is
      """
      B _key="b1" style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": foo|"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B _key="b1" style="h1": foo
      B: |
      """

  Scenario: Soft-splitting styled block at the beginning
    Given the editor state is
      """
      B style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": |foo"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B style=\"h1\": \n|foo"

  Scenario: Soft-splitting styled block in the middle
    Given the editor state is
      """
      B style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": fo|o"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B style=\"h1\": fo\n|o"

  Scenario: Soft-splitting styled block at the end
    Given the editor state is
      """
      B style="h1": foo
      """
    When the editor is focused
    And the selection is "B style=\"h1\": foo|"
    And "{Shift>}{Enter}{/Shift}" is pressed
    Then the editor state is "B style=\"h1\": foo\n|"

  Scenario: Splitting decorated styled block at the beginning
    Given the editor state is
      """
      B style="h1": [strong:foo] bar baz
      """
    When the editor is focused
    And the selection is "B style=\"h1\": |[strong:foo] bar baz"
    And "{Enter}" is pressed
    And "new" is typed
    Then the editor state is
      """
      B: [strong:]
      B style="h1": [strong:new|foo] bar baz
      """

  Scenario Outline: Splitting decorated styled block in the middle
    Given the editor state is <initial>
    When the editor is focused
    And the selection is <selection>
    And "{Enter}" is pressed
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | initial                                | selection                                | new text                                                      |
      | "B style=\"h1\": [strong:foo] bar baz" | "B style=\"h1\": [strong:foo\|] bar baz" | "B style=\"h1\": [strong:foo];;B style=\"h1\": new\| bar baz" |
      | "B style=\"h1\": foo [strong:bar] baz" | "B style=\"h1\": foo \|[strong:bar] baz" | "B style=\"h1\": foo ;;B style=\"h1\": [strong:new\|bar] baz" |
      | "B style=\"h1\": foo [strong:bar] baz" | "B style=\"h1\": foo [strong:\|bar] baz" | "B style=\"h1\": foo ;;B style=\"h1\": [strong:new\|bar] baz" |
      | "B style=\"h1\": foo [strong:bar] baz" | "B style=\"h1\": foo [strong:bar\|] baz" | "B style=\"h1\": foo [strong:bar];;B style=\"h1\": new\| baz" |
      | "B style=\"h1\": foo [strong:bar] baz" | "B style=\"h1\": foo [strong:bar]\| baz" | "B style=\"h1\": foo [strong:bar];;B style=\"h1\": new\| baz" |
      | "B style=\"h1\": foo bar [strong:baz]" | "B style=\"h1\": foo bar [strong:\|baz]" | "B style=\"h1\": foo bar ;;B style=\"h1\": [strong:new\|baz]" |
      | "B style=\"h1\": foo bar [strong:baz]" | "B style=\"h1\": foo bar \|[strong:baz]" | "B style=\"h1\": foo bar ;;B style=\"h1\": [strong:new\|baz]" |

  Scenario: Splitting decorated styled block at the end
    Given the editor state is
      """
      B style="h1": foo bar [strong:baz]
      """
    When the editor is focused
    And the selection is "B style=\"h1\": foo bar [strong:baz|]"
    And "{Enter}" is pressed
    And "new" is typed
    Then the editor state is
      """
      B style="h1": foo bar [strong:baz]
      B: new|
      """

  Scenario Outline: Splitting block with an expanded selection
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And <selection> is selected
    And "{Enter}" is pressed
    Then the editor state is <new text>

    Examples:
      | selection | new text       |
      | "foobar"  | "B: \|"        |
      | "ooba"    | "B: f;;B: \|r" |

  Scenario: Pressing Enter when selecting multiple block objects
    Given blocks "auto"
      ```
      [
        {
          "_key": "i0",
          "_type": "image"
        },
        {
          "_key": "i1",
          "_type": "image"
        }
      ]
      ```
    When the editor is focused
    And everything is selected
    And "{Enter}" is pressed
    Then the editor state is "B: |"
