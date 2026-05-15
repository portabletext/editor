# Simple marks like bold and italic
Feature: Decorators

  Background:
    Given one editor

  Scenario Outline: Inserting text at the edge of a decorator
    Given the editor state is <text>
    When the editor is focused
    And <decorated> is selected
    And "strong" is toggled
    And the caret is put <position>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | decorated | position      | new text                     |
      | "B: foo bar baz" | "bar"     | after "foo "  | "B: foo new[strong:bar] baz" |
      | "B: foo bar baz" | "bar"     | before "bar"  | "B: foo new[strong:bar] baz" |
      | "B: foo bar baz" | "bar"     | after "bar"   | "B: foo [strong:barnew] baz" |
      | "B: foo bar baz" | "bar"     | before " baz" | "B: foo [strong:barnew] baz" |
      | "B: foo"         | "foo"     | before "foo"  | "B: [strong:newfoo]"         |
      | "B: foo"         | "foo"     | after "foo"   | "B: [strong:foonew]"         |

  Scenario Outline: Toggling decorator at the edge of a decorator
    Given the editor state is <text>
    And "em" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | decorated | position      | new text                                 |
      | "B: foo bar baz" | "bar"     | after "foo "  | "B: foo [strong:new\|][em:bar] baz"      |
      | "B: foo bar baz" | "bar"     | before "bar"  | "B: foo [strong:new\|][em:bar] baz"      |
      | "B: foo bar baz" | "bar"     | after "bar"   | "B: foo [em:bar][em:[strong:new\|]] baz" |
      | "B: foo bar baz" | "bar"     | before " baz" | "B: foo [em:bar][em:[strong:new\|]] baz" |
      | "B: foo"         | "foo"     | before "foo"  | "B: [em:[strong:new\|]][em:foo]"         |
      | "B: foo"         | "foo"     | after "foo"   | "B: [em:foo][em:[strong:new\|]]"         |

  Scenario: Writing on top of a decorator
    Given the editor state is "B: foo bar baz"
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "removed" is typed
    Then the editor state is "B: foo [strong:removed|] baz"

  Scenario: Toggling bold inside italic
    Given the editor state is "B: foo bar baz"
    When "foo bar baz" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [em:foo ][em:[strong:^bar|]][em: baz]"
    When "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [em:foo ^bar| baz]"

  Scenario: Toggling bold as you write
    Given the editor state is "B: "
    When the editor is focused
    And the caret is put after ""
    And "foo" is typed
    And "strong" is toggled
    And "bar" is typed
    Then the editor state is "B: foo[strong:bar|]"

  Scenario: Toggling bold inside italic as you write
    Given the editor state is "B: "
    When the editor is focused
    And the caret is put after ""
    And "em" is toggled
    And "foo " is typed
    And "strong" is toggled
    And "bar" is typed
    And "strong" is toggled
    And " baz" is typed
    Then the editor state is "B: [em:foo ][em:[strong:bar]][em: baz|]"

  Scenario: Toggling decorator mid-text and navigating left to clear it
    Given the editor state is "B: foo"
    When the editor is focused
    And "strong" is toggled
    And "{ArrowLeft}" is pressed
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the editor state is "B: foobar|"

  Scenario: Deleting marked text and writing again, marked
    Given the editor state is "B: "
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "bar" is typed
    Then the editor state is "B: [strong:bar]"

  Scenario Outline: Deleting expanded selection ending in a decorator
    Given the editor state is <text>
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the editor state is <new text>
    And the caret is before ""

    Examples:
      | text                      | direction   | button        | new text |
      | "B: foo;;B: bar"          | "forwards"  | "{Backspace}" | "B: \|"  |
      | "B: foo;;B: bar"          | "forwards"  | "{Delete}"    | "B: \|"  |
      | "B: foo;;B: bar"          | "backwards" | "{Backspace}" | "B: \|"  |
      | "B: foo;;B: bar"          | "backwards" | "{Delete}"    | "B: \|"  |
      | "B: foo;;{IMAGE};;B: bar" | "forwards"  | "{Backspace}" | "B: \|"  |
      | "B: foo;;{IMAGE};;B: bar" | "forwards"  | "{Delete}"    | "B: \|"  |
      | "B: foo;;{IMAGE};;B: bar" | "backwards" | "{Backspace}" | "B: \|"  |
      | "B: foo;;{IMAGE};;B: bar" | "backwards" | "{Delete}"    | "B: \|"  |

  Scenario Outline: Deleting expanded selection starting in a decorator
    Given the editor state is <text>
    When the editor is focused
    And "foo" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the editor state is <new text>
    And the caret is before ""

    Examples:
      | text                      | direction   | button        | new text         |
      | "B: foo;;B: bar"          | "forwards"  | "{Backspace}" | "B: [strong:\|]" |
      | "B: foo;;B: bar"          | "forwards"  | "{Delete}"    | "B: [strong:\|]" |
      | "B: foo;;B: bar"          | "backwards" | "{Backspace}" | "B: [strong:\|]" |
      | "B: foo;;B: bar"          | "backwards" | "{Delete}"    | "B: [strong:\|]" |
      | "B: foo;;{IMAGE};;B: bar" | "forwards"  | "{Backspace}" | "B: [strong:\|]" |
      | "B: foo;;{IMAGE};;B: bar" | "forwards"  | "{Delete}"    | "B: [strong:\|]" |
      | "B: foo;;{IMAGE};;B: bar" | "backwards" | "{Backspace}" | "B: [strong:\|]" |
      | "B: foo;;{IMAGE};;B: bar" | "backwards" | "{Delete}"    | "B: [strong:\|]" |

  Scenario: Deleting expanded selection with decorator toggled on
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put after "bar"
    And "strong" is toggled
    And "foobar" is selected
    And "{Backspace}" is pressed
    And "baz" is typed
    Then the editor state is "B: baz|"

  Scenario: Adding bold across an empty block and typing in the same
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the editor state is
      """
      B: [strong:foo]
      B: [strong:bar]
      B: [strong:bar]
      """

  Scenario: Toggling bold across an empty block
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    Then the editor state is "B: foo;;B: ;;B: bar|"
    When "ooba" is selected
    And "strong" is toggled
    Then the editor state is
      """
      B: f[strong:^oo]
      B: [strong:]
      B: [strong:ba|]r
      """
    When "strong" is toggled
    Then the editor state is "B: f^oo;;B: ;;B: ba|r"

  Scenario Outline: Toggling bold on a cross-selection with the first line empty
    Given the editor state is "B: ;;B: foo"
    When everything is <selection>
    And "strong" is toggled
    Then the editor state is <toggled>
    When "strong" is toggled
    Then the editor state is <untoggled>

    Examples:
      | selection          | toggled                            | untoggled        |
      | selected           | "B: [strong:^];;B: [strong:foo\|]" | "B: ^;;B: foo\|" |
      | selected backwards | "B: [strong:\|];;B: [strong:foo^]" | "B: \|;;B: foo^" |

  Scenario Outline: Toggling bold on a cross-selection with the last line empty
    Given the editor state is "B: foo;;B: "
    When everything is <selection>
    And "strong" is toggled
    Then the editor state is <toggled>
    When "strong" is toggled
    Then the editor state is <untoggled>

    Examples:
      | selection          | toggled                            | untoggled        |
      | selected           | "B: [strong:^foo];;B: [strong:\|]" | "B: ^foo;;B: \|" |
      | selected backwards | "B: [strong:\|foo];;B: [strong:^]" | "B: \|foo;;B: ^" |

  Scenario: Splitting block before decorator
    Given the editor state is "B: foo"
    And "strong" around "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: [strong:]
      B: [strong:|foo]
      """

  Scenario Outline: Splitting block at the edge of decorator
    Given the editor state is "B: foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    Then the editor state is <new text>
    And the caret is <new position>

    Examples:
      | position      | new text                         | new position  |
      | after "foo "  | "B: foo ;;B: [strong:\|bar] baz" | before "bar"  |
      | before "bar"  | "B: foo ;;B: [strong:\|bar] baz" | before "bar"  |
      | after "bar"   | "B: foo [strong:bar];;B: \| baz" | before " baz" |
      | before " baz" | "B: foo [strong:bar];;B: \| baz" | before " baz" |

  Scenario: Toggling decorators in empty block
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "strong" is toggled
    Then the editor state is "B: [strong:|]"

  Scenario: Splitting empty decorated block
    Given the editor state is "B: "
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "{Enter}" is pressed
    And "foo" is typed
    Then the editor state is
      """
      B: [strong:]
      B: foo|
      """

  Scenario: Merging spans with same but different-ordered decorators
    Given the editor state is "B: foobar"
    And "strong" around "foo"
    And "em" around "bar"
    Then the editor state is "B: [strong:foo][em:bar|]"
    When "foo" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [strong:[em:foo^bar|]]"

  Scenario: Toggling decorator with leading block object and trailing empty text
    Given the editor state is "{IMAGE};;B: foo;;B: "
    When everything is selected
    And "strong" is toggled
    Then the editor state is
      """
      {IMAGE}
      B: [strong:foo]
      B: [strong:]
      """
    When "strong" is toggled
    Then the editor state is "{IMAGE};;B: foo;;B: "
