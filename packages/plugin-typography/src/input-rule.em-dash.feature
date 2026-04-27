Feature: Em Dash Input Rule

  Background:
    Given a global keymap

  Scenario Outline: Inserting em dash in unformatted text
    Given the editor state is <state>
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When <inserted text> is inserted
    Then the editor state is <before undo>
    When undo is performed
    Then the editor state is <after undo>

    Examples:
      | state             | inserted text | before undo           | after undo             |
      | "B: -"            | "-"           | "B: —\|"              | "B: --\|"              |
      | "B: "             | "--"          | "B: —\|"              | "B: --\|"              |
      | "B: foo"          | "--"          | "B: foo—\|"           | "B: foo--\|"           |
      | "B: "             | "foo--"       | "B: foo—\|"           | "B: foo--\|"           |
      | "B: foo-"         | "-bar"        | "B: foo—bar\|"        | "B: foo--bar\|"        |
      | "B: "             | "foo--bar--"  | "B: foo—bar—\|"       | "B: foo--bar--\|"      |
      | "B: foo--bar--\|" | "baz--"       | "B: foo--bar--baz—\|" | "B: foo--bar--baz--\|" |

  Scenario: Inserting em dash inside a decorator
    Given the editor state is "B: foo-"
    And "strong" around "foo-"
    When the editor is focused
    And the caret is put after "foo-"
    And "-" is typed
    Then the editor state is "B: [strong:foo—|]"

  Scenario: Inserting em dash at the edge of a decorator
    Given the editor state is "B: foo-"
    And "strong" around "foo"
    When the editor is focused
    And the caret is put after "foo-"
    And "-" is typed
    Then the editor state is "B: [strong:foo]—|"

  Scenario: Inserting em dash inside an annotation
    Given the editor state is "B: foo-"
    And a "link" "l1" around "foo-"
    When the editor is focused
    And the caret is put after "foo-"
    And "-" is typed
    Then the editor state is "B: [@link _key=\"l1\":foo—]"

  Scenario: Inserting em dash halfway inside an annotation
    Given the editor state is "B: foo-"
    And a "link" "l1" around "foo-"
    When the editor is focused
    And the caret is put after "foo-"
    And "-" is typed
    Then the editor state is "B: [@link _key=\"l1\":foo—]"

  Scenario: Inserting em dash at the edge of an annotation
    Given the editor state is "B: foo-"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "foo-"
    And "-" is typed
    Then the editor state is "B: [@link _key=\"l1\":foo]—"

  Scenario Outline: Smart undo with Backspace
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "{Backspace}" is pressed
    Then the editor state is <new state>

    Examples:
      | state             | inserted text | new state              |
      | "B: -"            | "-"           | "B: --\|"              |
      | "B: "             | "--"          | "B: --\|"              |
      | "B: foo"          | "--"          | "B: foo--\|"           |
      | "B: "             | "foo--"       | "B: foo--\|"           |
      | "B: foo-"         | "-bar"        | "B: foo--bar\|"        |
      | "B: "             | "foo--bar--"  | "B: foo--bar--\|"      |
      | "B: foo--bar--\|" | "baz--"       | "B: foo--bar--baz--\|" |

  Scenario Outline: Smart undo aborted after text changes
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And <new text> is typed
    And "{Backspace}" is pressed
    Then the editor state is <final state>

    Examples:
      | state | inserted text | new text | final state |
      | "B: " | "--"          | "n"      | "B: —\|"    |

  Scenario Outline: Smart undo aborted after selection changes
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "{ArrowLeft}" is pressed
    And "{Backspace}" is pressed
    Then the editor state is <final state>

    Examples:
      | state    | inserted text | final state |
      | "B: foo" | "--"          | "B: fo\|—"  |
