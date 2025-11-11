Feature: Insert Child

  Background:
    Given one editor

  Scenario Outline: Inserting span on span
    Given the text <text>
    When the caret is put <position>
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is <new text>

    Examples:
      | text  | position    | new text |
      | ""    | after ""    | "new"    |
      | "foo" | after "foo" | "foonew" |

  Scenario: Inserting inline object in span
    Given the text "foo bar baz"
    When the caret is put after "foo"
    And a child is inserted
      ```
      {
        "_type": "stock-ticker",
        "symbol": "AAPL"
      }
      ```
    Then the text is "foo,{stock-ticker}, bar baz"

  Scenario: Inserting span on block object
    Given the text "{image}"
    When the editor is focused
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "{image}|new"

  Scenario: Inserting span on block object without selection
    When "{image}" is inserted at "auto" and selected at the "none"
    Then nothing is selected
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "{image}|new"

  Scenario: Inserting span on text block without selection
    When "foo" is inserted at "auto" and selected at the "none"
    Then nothing is selected
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "foonew"
