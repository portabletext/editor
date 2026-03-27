# Simple marks like bold and italic
Feature: Decorators

  Background:
    Given one editor

  Scenario Outline: Inserting text at the edge of a decorator
    Given the editor state <text>
    When the editor is focused
    And <decorated> is selected
    And "strong" is toggled
    And the caret is put <position>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text               | decorated | position      | new text                       |
      | "B: foo bar baz\|" | "bar"     | after "foo "  | "B: foo new\|[strong:bar] baz" |
      | "B: foo bar baz\|" | "bar"     | before "bar"  | "B: foo new[strong:\|bar] baz" |
      | "B: foo bar baz\|" | "bar"     | after "bar"   | "B: foo [strong:barnew\|] baz" |
      | "B: foo bar baz\|" | "bar"     | before " baz" | "B: foo [strong:barnew]\| baz" |
      | "B: foo\|"         | "foo"     | before "foo"  | "B: [strong:new\|foo]"         |
      | "B: foo\|"         | "foo"     | after "foo"   | "B: [strong:foonew]\|"         |

  Scenario Outline: Toggling decorator at the edge of a decorator
    Given the editor state <text>
    And "em" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text               | decorated | position      | new text                                 |
      | "B: foo bar baz\|" | "bar"     | after "foo "  | "B: foo [strong:new\|][em:bar] baz"      |
      | "B: foo bar baz\|" | "bar"     | before "bar"  | "B: foo [strong:new\|][em:bar] baz"      |
      | "B: foo bar baz\|" | "bar"     | after "bar"   | "B: foo [em:bar][strong:[em:new\|]] baz" |
      | "B: foo bar baz\|" | "bar"     | before " baz" | "B: foo [em:bar][strong:[em:new\|]] baz" |
      | "B: foo\|"         | "foo"     | before "foo"  | "B: [strong:[em:new\|]][em:foo]"         |
      | "B: foo\|"         | "foo"     | after "foo"   | "B: [em:foo][strong:[em:new]]\|"         |

  Scenario: Writing on top of a decorator
    Given the editor state "B: foo bar baz|"
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "removed" is typed
    Then the editor state is "B: foo [strong:removed|] baz"

  Scenario: Toggling bold inside italic
    Given the editor state "B: foo bar baz|"
    When "foo bar baz" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [em:foo ][strong:[em:^bar|]][em: baz]"
    When "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [em:foo ^bar| baz]"

  Scenario: Toggling bold as you write
    Given the editor state "B: |"
    When the editor is focused
    And the caret is put after ""
    And "foo" is typed
    And "strong" is toggled
    And "bar" is typed
    Then the editor state is "B: foo[strong:bar]|"

  Scenario: Toggling bold inside italic as you write
    Given the editor state "B: |"
    When the editor is focused
    And the caret is put after ""
    And "em" is toggled
    And "foo " is typed
    And "strong" is toggled
    And "bar" is typed
    And "strong" is toggled
    And " baz" is typed
    Then the editor state is "B: [em:foo ][strong:[em:bar]][em: baz]|"

  Scenario: Toggling decorator mid-text and navigating left to clear it
    Given the editor state "B: foo|"
    When the editor is focused
    And "strong" is toggled
    And "{ArrowLeft}" is pressed
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the editor state is "B: foobar|"

  Scenario: Deleting marked text and writing again, marked
    Given the editor state "B: |"
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "bar" is typed
    Then the editor state is "B: [strong:bar]|"

  Scenario Outline: Deleting expanded selection ending in a decorator
    Given the editor state <text>
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the editor state is "B: |"

    Examples:
      | text                        | direction   | button        |
      | "B: foo;;B: bar\|"          | "forwards"  | "{Backspace}" |
      | "B: foo;;B: bar\|"          | "forwards"  | "{Delete}"    |
      | "B: foo;;B: bar\|"          | "backwards" | "{Backspace}" |
      | "B: foo;;B: bar\|"          | "backwards" | "{Delete}"    |
      | "B: foo;;{IMAGE};;B: bar\|" | "forwards"  | "{Backspace}" |
      | "B: foo;;{IMAGE};;B: bar\|" | "forwards"  | "{Delete}"    |
      | "B: foo;;{IMAGE};;B: bar\|" | "backwards" | "{Backspace}" |
      | "B: foo;;{IMAGE};;B: bar\|" | "backwards" | "{Delete}"    |

  Scenario Outline: Deleting expanded selection starting in a decorator
    Given the editor state <text>
    When the editor is focused
    And "foo" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the editor state is "B: [strong:]|"

    Examples:
      | text                        | direction   | button        |
      | "B: foo;;B: bar\|"          | "forwards"  | "{Backspace}" |
      | "B: foo;;B: bar\|"          | "forwards"  | "{Delete}"    |
      | "B: foo;;B: bar\|"          | "backwards" | "{Backspace}" |
      | "B: foo;;B: bar\|"          | "backwards" | "{Delete}"    |
      | "B: foo;;{IMAGE};;B: bar\|" | "forwards"  | "{Backspace}" |
      | "B: foo;;{IMAGE};;B: bar\|" | "forwards"  | "{Delete}"    |
      | "B: foo;;{IMAGE};;B: bar\|" | "backwards" | "{Backspace}" |
      | "B: foo;;{IMAGE};;B: bar\|" | "backwards" | "{Delete}"    |

  Scenario: Deleting expanded selection with decorator toggled on
    Given the editor state "B: foo;;B: bar|"
    When the editor is focused
    And the caret is put after "bar"
    And "strong" is toggled
    And "foobar" is selected
    And "{Backspace}" is pressed
    And "baz" is typed
    Then the editor state is "B: baz|"

  Scenario: Adding bold across an empty block and typing in the same
    Given the editor state "B: foo|"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the editor state is "B: [strong:foo];;B: [strong:bar]|;;B: [strong:bar]"

  Scenario: Toggling bold across an empty block
    Given the editor state "B: foo|"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    Then the editor state is "B: foo;;B: ;;B: bar|"
    When "ooba" is selected
    And "strong" is toggled
    Then the editor state is "B: f[strong:^oo];;B: [strong:];;B: [strong:ba|]r"
    When "strong" is toggled
    Then the editor state is "B: f^oo;;B: ;;B: ba|r"

  Scenario Outline: Toggling bold on a cross-selection with the first line empty
    Given the editor state "B: ;;B: foo|"
    When everything is <selection>
    And "strong" is toggled
    Then the editor state is <toggled on>
    When "strong" is toggled
    Then the editor state is <toggled off>

    Examples:
      | selection          | toggled on                         | toggled off      |
      | selected           | "B: [strong:]^;;B: [strong:foo]\|" | "B: ^;;B: foo\|" |
      | selected backwards | "B: [strong:]\|;;B: [strong:foo]^" | "B: \|;;B: foo^" |

  Scenario Outline: Toggling bold on a cross-selection with the last line empty
    Given the editor state "B: foo;;B: |"
    When everything is <selection>
    And "strong" is toggled
    Then the editor state is <toggled on>
    When "strong" is toggled
    Then the editor state is <toggled off>

    Examples:
      | selection          | toggled on                         | toggled off      |
      | selected           | "B: [strong:^foo];;B: [strong:]\|" | "B: ^foo;;B: \|" |
      | selected backwards | "B: [strong:\|foo];;B: [strong:]^" | "B: \|foo;;B: ^" |

  Scenario: Splitting block before decorator
    Given the editor state "B: [strong:foo]|"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the editor state is "B: [strong:];;B: [strong:|foo]"

  Scenario Outline: Splitting block at the edge of decorator
    Given the editor state "B: foo [strong:bar] baz|"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    Then the editor state is <new text>

    Examples:
      | position      | new text                         |
      | after "foo "  | "B: foo ;;B: [strong:\|bar] baz" |
      | before "bar"  | "B: foo ;;B: [strong:\|bar] baz" |
      | after "bar"   | "B: foo [strong:bar];;B: \| baz" |
      | before " baz" | "B: foo [strong:bar];;B: \| baz" |

  Scenario: Toggling decorators in empty block
    Given the editor state "B: |"
    When the editor is focused
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "strong" is toggled
    Then the editor state is "B: [strong:]|"

  Scenario: Splitting empty decorated block
    Given the editor state "B: |"
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "{Enter}" is pressed
    And "foo" is typed
    Then the editor state is "B: [strong:];;B: foo|"

  Scenario: Merging spans with same but different-ordered decorators
    Given the editor state "B: [strong:foo][em:bar]|"
    When "foo" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the editor state is "B: [em:[strong:foo^bar]]|"

  Scenario: Toggling decorator with leading block object and trailing empty text
    Given the editor state "{IMAGE};;B: foo;;B: |"
    When everything is selected
    And "strong" is toggled
    Then the editor state is "^{IMAGE};;B: [strong:foo];;B: [strong:]|"
    When "strong" is toggled
    Then the editor state is "^{IMAGE};;B: foo;;B: |"
