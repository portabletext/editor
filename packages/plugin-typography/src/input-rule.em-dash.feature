Feature: Em Dash Input Rule

  Background:
    Given a global keymap

  Scenario Outline: Inserting em dash in unformatted text
    Given the text <text>
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When <inserted text> is inserted
    Then the text is <before undo>
    When undo is performed
    Then the text is <after undo>

    Examples:
      | text         | inserted text | before undo      | after undo        |
      | "-"          | "-"           | "—"              | "--"              |
      | ""           | "--"          | "—"              | "--"              |
      | "foo"        | "--"          | "foo—"           | "foo--"           |
      | ""           | "foo--"       | "foo—"           | "foo--"           |
      | "foo-"       | "-bar"        | "foo—bar"        | "foo--bar"        |
      | ""           | "foo--bar--"  | "foo—bar—"       | "foo--bar--"      |
      | "foo--bar--" | "baz--"       | "foo--bar--baz—" | "foo--bar--baz--" |

  Scenario: Inserting em dash inside a decorator
    Given the text "foo-"
    And "strong" around "foo-"
    When the caret is put after "foo-"
    And "-" is typed
    Then the text is "foo—"
    And "foo—" has marks "strong"

  Scenario: Inserting em dash at the edge of a decorator
    Given the text "foo-"
    And "strong" around "foo"
    When the caret is put after "foo-"
    And "-" is typed
    Then the text is "foo,—"
    And "foo" has marks "strong"
    And "—" has no marks

  Scenario: Inserting em dash inside an annotation
    Given the text "foo-"
    And a "link" "l1" around "foo-"
    When the caret is put after "foo-"
    And "-" is typed
    Then the text is "foo—"
    And "foo—" has marks "l1"

  Scenario: Inserting em dash halfway inside an annotation
    Given the text "foo-"
    And a "link" "l1" around "foo-"
    When the caret is put after "foo-"
    And "-" is typed
    Then the text is "foo—"
    And "foo—" has marks "l1"

  Scenario: Inserting em dash at the edge of an annotation
    Given the text "foo-"
    And a "link" "l1" around "foo"
    When the caret is put after "foo-"
    And "-" is typed
    Then the text is "foo,—"
    And "foo" has marks "l1"
    And "—" has no marks

  Scenario Outline: Smart undo with Backspace
    Given the text <text>
    When <inserted text> is inserted
    And "{Backspace}" is pressed
    Then the text is <new text>

    Examples:
      | text         | inserted text | new text          |
      | "-"          | "-"           | "--"              |
      | ""           | "--"          | "--"              |
      | "foo"        | "--"          | "foo--"           |
      | ""           | "foo--"       | "foo--"           |
      | "foo-"       | "-bar"        | "foo--bar"        |
      | ""           | "foo--bar--"  | "foo--bar--"      |
      | "foo--bar--" | "baz--"       | "foo--bar--baz--" |

  Scenario Outline: Smart undo aborted after text changes
    Given the text <text>
    When <inserted text> is inserted
    And <new text> is typed
    And "{Backspace}" is pressed
    Then the text is <final text>

    Examples:
      | text | inserted text | new text | final text |
      | ""   | "--"          | "n"      | "—"        |

  Scenario Outline: Smart undo aborted after selection changes
    Given the text <text>
    When <inserted text> is inserted
    And "{ArrowLeft}" is pressed
    And "{Backspace}" is pressed
    Then the text is <final text>

    Examples:
      | text  | inserted text | final text |
      | "foo" | "--"          | "fo—"      |
