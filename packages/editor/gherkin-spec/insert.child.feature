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
      | text     | position    | new text    |
      | "P: "    | after ""    | "P: new"    |
      | "P: foo" | after "foo" | "P: foonew" |

  Scenario: Inserting inline object in span
    Given the text "P: foo bar baz"
    When the caret is put after "foo"
    And a child is inserted
      ```
      {
        "_type": "stock-ticker",
        "symbol": "AAPL"
      }
      ```
    Then the text is "P: foo{stock-ticker} bar baz"

  Scenario: Inserting span on block object
    Given the text "{IMAGE}"
    When the editor is focused
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "{IMAGE};;P: new"

  Scenario: Inserting span on block object without selection
    When "{IMAGE}" is inserted at "auto" and selected at the "none"
    Then nothing is selected
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "{IMAGE};;P: new"

  Scenario: Inserting span on text block without selection
    When "P: foo" is inserted at "auto" and selected at the "none"
    Then nothing is selected
    When a child is inserted
      ```
      {
        "_type": "span",
        "text": "new"
      }
      ```
    Then the text is "P: foonew"
