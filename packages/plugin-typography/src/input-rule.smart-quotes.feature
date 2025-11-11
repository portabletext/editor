Feature: Smart Quotes Input Rule

  Background:
    Given a global keymap

  Scenario Outline: Typing turns double quotes into smart quotes
    Given the text <text>
    When <inserted text> is typed
    Then the text is <new text>

    Examples:
      | text    | inserted text     | new text      |
      | ""      | "\"foo\""         | "“foo”"       |
      | "“foo”" | " \"bar\""        | "“foo” “bar”" |
      | ""      | "\"foo\" \"bar\"" | "“foo” “bar”" |

  Scenario Outline: Inserting double smart quotes in unformatted text
    Given the text <text>
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When <inserted text> is inserted
    Then the text is <before undo>
    When undo is performed
    Then the text is <after undo>

    Examples:
      | text    | inserted text | before undo  | after undo   |
      | ""      | "\""          | "“"          | """          |
      | ""      | "\"\""        | "““"         | """"         |
      | ""      | "\"\"\""      | "“““"        | """""        |
      | "”"     | "\""          | "””"         | "”""         |
      # | "”"  | "\"\""        | "”””"       | "””""      |
      | ""      | "\"foo\""     | "“foo”"      | ""foo""      |
      | "“foo"  | "\""          | "“foo”"      | "“foo""      |
      | ""foo"  | "\""          | ""foo”"      | ""foo""      |
      | ""foo"" | "\"bar\""     | ""foo"“bar”" | ""foo""bar"" |
      | "“foo”" | "\""          | "“foo””"     | "“foo”""     |

  # | "“foo”" | "\"\""        | "“foo”””"    | "“foo”"""    |
  Scenario Outline: Inserting single smart quotes in unformatted text
    Given the text <text>
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When <inserted text> is inserted
    Then the text is <before undo>
    When undo is performed
    Then the text is <after undo>

    Examples:
      | text    | inserted text | before undo  | after undo   |
      | ""      | "'"           | "‘"          | "'"          |
      | ""      | "'foo'"       | "‘foo’"      | "'foo'"      |
      | "‘foo"  | "'"           | "‘foo’"      | "‘foo'"      |
      | "'foo"  | "'"           | "'foo’"      | "'foo'"      |
      | "'foo'" | "'bar'"       | "'foo'‘bar’" | "'foo''bar'" |

  Scenario: Mixed quotes
    Given the text ""
    When "\"'sorry' you say?\" she asked" is typed
    Then the text is "“‘sorry’ you say?” she asked"

  Scenario Outline: Contractions
    When <text> is typed
    Then the text is <new text>

    Examples:
      | text     | new text |
      | "it's"   | "it’s"   |
      | "don't"  | "don’t"  |
      | "won't"  | "won’t"  |
      | "I'm"    | "I’m"    |
      | "you're" | "you’re" |
