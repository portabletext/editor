Feature: Annotations Overlapping Decorators

  Background:
    Given one editor
    And a global keymap

  Scenario Outline: Inserting text at the edge of a decorated annotation
    Given the editor state is <text>
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | annotated     | decorated     | position      | new text                                                                                 |
      | "B: foo bar baz" | "bar"         | "bar"         | after "foo "  | "B: foo new[strong:[@link _key=\"l1\":bar]] baz"                                         |
      | "B: foo bar baz" | "bar"         | "bar"         | before "bar"  | "B: foo new[strong:[@link _key=\"l1\":bar]] baz"                                         |
      | "B: foo bar baz" | "bar"         | "bar"         | after "bar"   | "B: foo [strong:[@link _key=\"l1\":bar]]new baz"                                         |
      | "B: foo bar baz" | "bar"         | "bar"         | before " baz" | "B: foo [strong:[@link _key=\"l1\":bar]]new baz"                                         |
      | "B: foo"         | "foo"         | "foo"         | before "foo"  | "B: new[strong:[@link _key=\"l1\":foo]]"                                                 |
      | "B: foo"         | "foo"         | "foo"         | after "foo"   | "B: [strong:[@link _key=\"l1\":foo]]new"                                                 |
      | "B: foo bar baz" | "foo bar baz" | "bar"         | after "foo "  | "B: [@link _key=\"l1\":foo new][strong:[@link _key=\"l1\":bar]][@link _key=\"l1\": baz]" |
      | "B: foo bar baz" | "foo bar baz" | "bar"         | before "bar"  | "B: [@link _key=\"l1\":foo new][strong:[@link _key=\"l1\":bar]][@link _key=\"l1\": baz]" |
      | "B: foo bar baz" | "foo bar baz" | "bar"         | after "bar"   | "B: [@link _key=\"l1\":foo ][strong:[@link _key=\"l1\":barnew]][@link _key=\"l1\": baz]" |
      | "B: foo bar baz" | "foo bar baz" | "bar"         | before " baz" | "B: [@link _key=\"l1\":foo ][strong:[@link _key=\"l1\":barnew]][@link _key=\"l1\": baz]" |
      | "B: foo bar baz" | "bar"         | "foo bar baz" | after "foo "  | "B: [strong:foo new][strong:[@link _key=\"l1\":bar]][strong: baz]"                       |
      | "B: foo bar baz" | "bar"         | "foo bar baz" | before "bar"  | "B: [strong:foo new][strong:[@link _key=\"l1\":bar]][strong: baz]"                       |
      | "B: foo bar baz" | "bar"         | "foo bar baz" | after "bar"   | "B: [strong:foo ][strong:[@link _key=\"l1\":bar]][strong:new baz]"                       |
      | "B: foo bar baz" | "bar"         | "foo bar baz" | before " baz" | "B: [strong:foo ][strong:[@link _key=\"l1\":bar]][strong:new baz]"                       |

  Scenario Outline: Toggling decorator at the edge of a decorated annotation
    Given the editor state is <text>
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
    Then the editor state is <new text>

    Examples:
      | text             | annotated | decorated | position      | new text                                                    |
      | "B: foo bar baz" | "bar"     | "bar"     | after "foo "  | "B: foo [strong:new\|][strong:[@link _key=\"l1\":bar]] baz" |
      | "B: foo bar baz" | "bar"     | "bar"     | before "bar"  | "B: foo [strong:new\|][strong:[@link _key=\"l1\":bar]] baz" |
      | "B: foo bar baz" | "bar"     | "bar"     | after "bar"   | "B: foo [strong:[@link _key=\"l1\":bar]][strong:new\|] baz" |
      | "B: foo bar baz" | "bar"     | "bar"     | before " baz" | "B: foo [strong:[@link _key=\"l1\":bar]][strong:new\|] baz" |

  Scenario Outline: Writing on top of a decorated annotation
    When the editor is focused
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When <selection>
    And "removed" is typed
    Then the editor state is <new text>

    Examples:
      | annotated     | decorated | selection                   | new text                                                                                  |
      | "bar"         | "bar"     | "bar" is selected           | "B: foo [strong:removed] baz"                                                             |
      | "bar"         | "bar"     | "bar" is selected backwards | "B: foo [strong:removed] baz"                                                             |
      | "foo bar baz" | "bar"     | "bar" is selected           | "B: [@link _key=\"l1\":foo ][strong:[@link _key=\"l1\":removed]][@link _key=\"l1\": baz]" |
      | "foo bar baz" | "bar"     | "bar" is selected backwards | "B: [@link _key=\"l1\":foo ][strong:[@link _key=\"l1\":removed]][@link _key=\"l1\": baz]" |

  Scenario: Splitting block before a decorated annotation
    Given the editor state is "B: bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Enter}" is pressed
    Then the editor state is "B: ;;B: [strong:[@link _key=\"l1\":bar]]"

  Scenario: Splitting block after a decorated annotation
    Given the editor state is "B: bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "bar"
    And "{Enter}" is pressed
    And "baz" is typed
    Then the editor state is
      """
      B: [strong:[@link _key="l1":bar]]
      B: baz|
      """

  Scenario: Splitting block after a decorated annotation #2
    Given the editor state is "B: foobar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "bar"
    And "{Enter}" is pressed
    And "baz" is typed
    Then the editor state is
      """
      B: foo[strong:[@link _key="l1":bar]]
      B: baz|
      """

  Scenario: Annotation and decorator on the same text
    Given the editor state is "B: foo bar baz"
    When "bar" is selected
    And "strong" is toggled
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: foo [strong:[@link _key="l1":bar]] baz
      """

  Scenario: Adding decorator inside annotation
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "strong" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ][strong:[@link _key="l1":bar]][@link _key="l1": baz]
      """

  Scenario: Adding an annotation across a decorator
    Given the editor state is "B: foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ][strong:[@link _key="l1":bar]][@link _key="l1": baz]
      """

  Scenario: Annotation overlapping decorator
    Given the editor state is "B: foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo][strong:[@link _key="l1":b]][strong:ar]
      """

  Scenario: Annotation overlapping decorator (backwards selection)
    Given the editor state is "B: foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo][strong:[@link _key="l1":b]][strong:ar]
      """

  Scenario: Annotation overlapping decorator from behind
    Given the editor state is "B: foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [strong:fo][strong:[@link _key="l1":o]][@link _key="l1":bar]
      """

  Scenario: Annotation overlapping decorator from behind (backwards selection)
    Given the editor state is "B: foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [strong:fo][strong:[@link _key="l1":o]][@link _key="l1":bar]
      """
