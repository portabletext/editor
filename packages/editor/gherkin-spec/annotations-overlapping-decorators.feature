Feature: Annotations Overlapping Decorators

  Background:
    Given one editor
    And a global keymap

  Scenario Outline: Inserting text at the edge of a decorated annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text            | annotated       | decorated       | position       | new text                  |
      | "P: foo bar baz"   | "bar"           | "bar"           | after "foo "   | "P: foo new[strong:[@link:bar]] baz"        |
      | "P: foo bar baz"   | "bar"           | "bar"           | before "bar"   | "P: foo new[strong:[@link:bar]] baz"        |
      | "P: foo bar baz"   | "bar"           | "bar"           | after "bar"    | "P: foo [strong:[@link:bar]]new baz"        |
      | "P: foo bar baz"   | "bar"           | "bar"           | before " baz"  | "P: foo [strong:[@link:bar]]new baz"        |
      | "P: foo"           | "foo"           | "foo"           | before "foo"   | "P: new[strong:[@link:foo]]"                 |
      | "P: foo"           | "foo"           | "foo"           | after "foo"    | "P: [strong:[@link:foo]]new"                 |
      | "P: foo bar baz"   | "foo bar baz"   | "bar"           | after "foo "   | "P: [@link:foo new][strong:[@link:bar]][@link: baz]"        |
      | "P: foo bar baz"   | "foo bar baz"   | "bar"           | before "bar"   | "P: [@link:foo new][strong:[@link:bar]][@link: baz]"        |
      | "P: foo bar baz"   | "foo bar baz"   | "bar"           | after "bar"    | "P: [@link:foo ][strong:[@link:barnew]][@link: baz]"        |
      | "P: foo bar baz"   | "foo bar baz"   | "bar"           | before " baz"  | "P: [@link:foo ][strong:[@link:barnew]][@link: baz]"        |
      | "P: foo bar baz"   | "bar"           | "foo bar baz"   | after "foo "   | "P: [strong:foo new][strong:[@link:bar]][strong: baz]"        |
      | "P: foo bar baz"   | "bar"           | "foo bar baz"   | before "bar"   | "P: [strong:foo new][strong:[@link:bar]][strong: baz]"        |
      | "P: foo bar baz"   | "bar"           | "foo bar baz"   | after "bar"    | "P: [strong:foo ][strong:[@link:bar]][strong:new baz]"        |
      | "P: foo bar baz"   | "bar"           | "foo bar baz"   | before " baz"  | "P: [strong:foo ][strong:[@link:bar]][strong:new baz]"        |

  Scenario Outline: Toggling decorator at the edge of a decorated annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When the editor is focused
    And the caret is put <position>
    # This one is tricky since it requires the editor to know up-front that
    # typing at the current position shouldn't produce bold text (since the
    # strong decorator is contained within the adjoining annotation).
    #
    # Therefore, toggling strong should turn on the decorator (not off) to go
    # against the default behavior and produce bold text.
    And "strong" is toggled
    And "new" is typed
    Then the text is <new text>
    And "new" has marks <marks>

    Examples:
      | text            | annotated       | decorated       | position       | new text                   | marks    |
      | "P: foo bar baz"   | "bar"           | "bar"           | after "foo "   | "P: foo [strong:new][strong:[@link:bar]] baz"        | "strong" |
      | "P: foo bar baz"   | "bar"           | "bar"           | before "bar"   | "P: foo [strong:new][strong:[@link:bar]] baz"        | "strong" |
      | "P: foo bar baz"   | "bar"           | "bar"           | after "bar"    | "P: foo [strong:[@link:bar]][strong:new] baz"        | "strong" |
      | "P: foo bar baz"   | "bar"           | "bar"           | before " baz"  | "P: foo [strong:[@link:bar]][strong:new] baz"        | "strong" |

  Scenario Outline: Writing on top of a decorated annotation
    When the editor is focused
    Given the text "P: foo bar baz"
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When <selection>
    And "removed" is typed
    Then the text is <new text>
    And "removed" has marks <marks>

    Examples:
      | annotated       | decorated       | selection                      | new text            | marks       |
      | "bar"           | "bar"           | "bar" is selected              | "P: foo [strong:removed] baz" | "strong"    |
      | "bar"           | "bar"           | "bar" is selected backwards    | "P: foo [strong:removed] baz" | "strong"    |
      | "foo bar baz"   | "bar"           | "bar" is selected              | "P: [@link:foo ][strong:[@link:removed]][@link: baz]" | "l1,strong" |
      | "foo bar baz"   | "bar"           | "bar" is selected backwards    | "P: [@link:foo ][strong:[@link:removed]][@link: baz]" | "l1,strong" |

  Scenario: Splitting block before a decorated annotation
    Given the text "P: bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Enter}" is pressed
    And "{ArrowUp}" is pressed
    And "foo" is typed
    Then the text is "P: foo;;P: [strong:[@link:bar]]"
    And the caret is after "foo"
    And "foo" has no marks

  Scenario: Splitting block after a decorated annotation
    Given the text "P: bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "bar"
    And "{Enter}" is pressed
    And "baz" is typed
    Then the text is "P: [strong:[@link:bar]];;P: baz"
    And the caret is after "baz"
    And "baz" has no marks

  Scenario: Splitting block after a decorated annotation #2
    Given the text "P: foobar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "bar"
    And "{Enter}" is pressed
    And "baz" is typed
    Then the text is "P: foo[strong:[@link:bar]];;P: baz"
    And the caret is after "baz"
    And "baz" has no marks

  Scenario: Annotation and decorator on the same text
    Given the text "P: foo bar baz"
    When "bar" is selected
    And "strong" is toggled
    And "link" "l1" is toggled
    Then the text is "P: foo [strong:[@link:bar]] baz"
    And "bar" has marks "strong,l1"

  Scenario: Adding decorator inside annotation
    Given the text "P: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "strong" is toggled
    Then the text is "P: [@link:foo ][strong:[@link:bar]][@link: baz]"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " baz" has marks "l1"

  Scenario: Adding an annotation across a decorator
    Given the text "P: foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And "link" "l1" is toggled
    Then the text is "P: [@link:foo ][strong:[@link:bar]][@link: baz]"
    And "foo " has marks "l1"
    And "bar" has marks "strong,l1"
    And " baz" has marks "l1"

  Scenario: Annotation overlapping decorator
    Given the text "P: foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "link" "l1" is toggled
    Then the text is "P: [@link:foo][strong:[@link:b]][strong:ar]"
    And "foo" has marks "l1"
    And "b" has marks "strong,l1"
    And "ar" has marks "strong"

  Scenario: Annotation overlapping decorator (backwards selection)
    Given the text "P: foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "link" "l1" is toggled
    Then the text is "P: [@link:foo][strong:[@link:b]][strong:ar]"
    And "foo" has marks "l1"
    And "b" has marks "strong,l1"
    And "ar" has marks "strong"

  Scenario: Annotation overlapping decorator from behind
    Given the text "P: foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the text is "P: [strong:fo][strong:[@link:o]][@link:bar]"
    Then "fo" has marks "strong"
    And "o" has marks "strong,l1"
    And "bar" has marks "l1"

  Scenario: Annotation overlapping decorator from behind (backwards selection)
    Given the text "P: foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the text is "P: [strong:fo][strong:[@link:o]][@link:bar]"
    Then "fo" has marks "strong"
    And "o" has marks "strong,l1"
    And "bar" has marks "l1"
