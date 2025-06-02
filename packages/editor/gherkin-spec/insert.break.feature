Feature: Insert Break

  Background:
    Given one editor

  Scenario Outline: Breaking text block
    Given the text "foo"
    When the caret is put <position>
    And "{Enter}" is pressed
    And "bar" is typed
    Then the text is <text>
    And the caret is <new position>

    Examples:
      | position     | text       | new position |
      | before "foo" | "\|barfoo" | before "foo" |
      | after "foo"  | "foo\|bar" | after "bar"  |
      | after "f"    | "f\|baroo" | after "bar"  |

  Scenario: Pressing Enter when selecting the entire content
    Given a block "auto"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```
    And a block "after"
      ```
      {
        "_type": "image"
      }
      ```
    And a block at "after" selected at the "end"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "bar"}]
      }
      ```
    When everything is selected
    And "{Enter}" is pressed
    Then the text is ""
