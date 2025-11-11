Feature: Disallow in code

  Scenario Outline: Decorated text
    Given the text <text>
    And "code" around <decorated>
    When the caret is put <position>
    And "->" is typed
    Then the text is <new text>

    Examples:
      | text          | decorated | position        | new text          |
      | "foo"         | "foo"     | after "foo"     | "foo->"           |
      | "foo bar baz" | "bar"     | after "bar"     | "foo ,bar->, baz" |
      | "foo bar baz" | "bar"     | before "bar"    | "foo →,bar, baz"  |
      | "foo bar baz" | "bar"     | before "ar baz" | "foo ,b->ar, baz" |

  Scenario Outline: Partially decorated text
    Given the text "foo bar2x baz"
    And "code" around "bar2x"
    When the caret is put after "bar2x"
    And "2" is typed
    Then the text is "foo ,bar2x2, baz"

  Scenario Outline: Partially decorated text with decorator toggled off
    Given the text <text>
    And "code" around <decorated>
    When the caret is put <position>
    And "code" is toggled
    And <inserted text> is typed
    Then the text is <new text>

    Examples:
      | text            | decorated | position      | inserted text | new text           |
      | "foo bar baz"   | "bar"     | after "bar"   | "2x2"         | "foo ,bar,2×2 baz" |
      | "foo bar2 baz"  | "bar2"    | after "bar2"  | "x2"          | "foo ,bar2,x2 baz" |
      | "foo bar2x baz" | "bar2x"   | after "bar2x" | "2"           | "foo ,bar2x,2 baz" |

  Scenario Outline: Decorated and annotated text
    Given the text "foo bar baz"
    And <decorator> around "bar"
    And a "link" "l1" around "bar"
    When the caret is put <position>
    And "->" is typed
    Then the text is <new text>

    Examples:
      | decorator | position        | new text          |
      | "code"    | after "bar"     | "foo ,bar,→ baz"  |
      | "strong"  | after "bar"     | "foo ,bar,→ baz"  |
      | "code"    | before "bar"    | "foo →,bar, baz"  |
      | "strong"  | before "bar"    | "foo →,bar, baz"  |
      | "code"    | before "ar baz" | "foo ,b->ar, baz" |
      | "strong"  | before "ar baz" | "foo ,b→ar, baz"  |
