Feature: Disallow in code

  Scenario Outline: Decorated text
    Given the editor state is <state>
    And "code" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "->" is typed
    Then the editor state is <new state>

    Examples:
      | state            | decorated | position        | new state                   |
      | "B: foo"         | "foo"     | after "foo"     | "B: [code:foo->\|]"         |
      | "B: foo bar baz" | "bar"     | after "bar"     | "B: foo [code:bar->\|] baz" |
      | "B: foo bar baz" | "bar"     | before "bar"    | "B: foo →\|[code:bar] baz"  |
      | "B: foo bar baz" | "bar"     | before "ar baz" | "B: foo [code:b->\|ar] baz" |

  Scenario Outline: Partially decorated text
    Given the editor state is "B: foo bar2x baz"
    And "code" around "bar2x"
    When the editor is focused
    And the caret is put after "bar2x"
    And "2" is typed
    Then the editor state is "B: foo [code:bar2x2|] baz"

  Scenario Outline: Partially decorated text with decorator toggled off
    Given the editor state is <state>
    And "code" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "code" is toggled
    And <inserted text> is typed
    Then the editor state is <new state>

    Examples:
      | state              | decorated | position      | inserted text | new state                    |
      | "B: foo bar baz"   | "bar"     | after "bar"   | "2x2"         | "B: foo [code:bar]2×2\| baz" |
      | "B: foo bar2 baz"  | "bar2"    | after "bar2"  | "x2"          | "B: foo [code:bar2]x2\| baz" |
      | "B: foo bar2x baz" | "bar2x"   | after "bar2x" | "2"           | "B: foo [code:bar2x]2\| baz" |

  Scenario Outline: Decorated and annotated text
    Given the editor state is "B: foo bar baz"
    And <decorator> around "bar"
    And a "link" "l1" around "bar"
    When the editor is focused
    And the caret is put <position>
    And "->" is typed
    Then the editor state is <new state>

    Examples:
      | decorator | position        | new state                                      |
      | "code"    | after "bar"     | "B: foo [code:[@link _key=\"l1\":bar]]→ baz"   |
      | "strong"  | after "bar"     | "B: foo [strong:[@link _key=\"l1\":bar]]→ baz" |
      | "code"    | before "bar"    | "B: foo →[code:[@link _key=\"l1\":bar]] baz"   |
      | "strong"  | before "bar"    | "B: foo →[strong:[@link _key=\"l1\":bar]] baz" |
      | "code"    | before "ar baz" | "B: foo [code:[@link _key=\"l1\":b->ar]] baz"  |
      | "strong"  | before "ar baz" | "B: foo [strong:[@link _key=\"l1\":b→ar]] baz" |
