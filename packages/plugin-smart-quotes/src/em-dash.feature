Feature: Em Dash Transformation Rule

  Scenario Outline: Inserting em dash in unformatted text
    Given the text <text>
    And the editor is focused
    # When {string} is inserted inserts all characters at once which mimics
    # how insert.text behaves on Android
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
