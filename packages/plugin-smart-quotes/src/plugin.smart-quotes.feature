Feature: Smart Quotes Plugin

  Scenario Outline: Simple text
    Given the text <text>
    When the <selection>
    And <inserted text> is typed
    Then the text is <new text>

    Examples:
      | text   | selection                | inserted text                    | new text                       |
      | ""     | caret is put after ""    | "'foo'"                          | "‘foo’"                        |
      | ""     | caret is put after ""    | "\"foo\""                        | "“foo”"                        |
      | "'fo"  | caret is put after "fo"  | "o'"                             | "‘foo’"                        |
      | "'foo" | caret is put after "foo" | "' "                             | "‘foo’ "                       |
      | ""     | caret is put after ""    | "\"'sorry' you say?\" she asked" | "“‘sorry’ you say?” she asked" |
