Feature: Paste

  Background:
    Given one editor

  Scenario Outline: Pasting text block into a text block
    Given the text "P: foo bar buz"
    And "strong" around "bar"
    When <selection>
    And x-portable-text is pasted
      ```
      [
        {
          "_type": "block",
          "children": [
            {"_type": "span", "text": "foo "},
            {"_type": "span", "text": "bar", "marks": ["strong"]},
            {"_type": "span", "text": " buz"}
          ]
        }
      ]
      ```
    Then the text is <text>

    Examples:
      | selection                      | text                                                        |
      | the caret is put after "buz"   | "P: foo [strong:bar] buzfoo [strong:bar] buz"               |
      | the caret is put before "foo"  | "P: foo [strong:bar] buzfoo [strong:bar] buz"               |
      | the caret is put after "ba"    | "P: foo [strong:ba]foo [strong:bar] buz[strong:r] buz"      |
      | "foo bar buz" is selected      | "P: foo [strong:bar] buz"                                   |

  Scenario: Pasting text/plain into a text block
    Given the text "P: foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/plain | new |
    Then the text is "P: foo [strong:banewr] buz"

  Scenario: Pasting text/html into a text block
    Given the text "P: foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/html | <p>new</p> |
    Then the text is "P: foo [strong:ba]new[strong:r] buz"
