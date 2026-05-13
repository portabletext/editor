Feature: Paste

  Background:
    Given one editor

  Scenario Outline: Pasting text block into a text block
    Given the editor state is "B: foo bar buz"
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
    Then the editor state is <text>

    Examples:
      | selection                     | text                                                     |
      | the caret is put after "buz"  | "B: foo [strong:bar] buzfoo [strong:bar] buz\|"          |
      | the caret is put before "foo" | "B: foo [strong:bar] buz\|foo [strong:bar] buz"          |
      | the caret is put after "ba"   | "B: foo [strong:ba]foo [strong:bar] buz[strong:\|r] buz" |
      | "foo bar buz" is selected     | "B: foo [strong:bar] buz\|"                              |

  Scenario: Pasting text/plain into a text block
    Given the editor state is "B: foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/plain | new |
    Then the editor state is "B: foo [strong:banew|r] buz"

  Scenario: Pasting text/html into a text block
    Given the editor state is "B: foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/html | <p>new</p> |
    Then the editor state is "B: foo [strong:ba]new[strong:|r] buz"
