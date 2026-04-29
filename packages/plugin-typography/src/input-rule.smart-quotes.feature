Feature: Smart Quotes Input Rule

  Background:
    Given a global keymap

  Scenario Outline: Typing turns double quotes into smart quotes
    Given the editor state is <text>
    When the editor is focused
    And <inserted text> is typed
    Then the editor state is <new text>

    Examples:
      | text       | inserted text     | new text         |
      | "B: "      | "\"foo\""         | "B: “foo”"       |
      | "B: “foo”" | " \"bar\""        | "B: “foo” “bar”" |
      | "B: "      | "\"foo\" \"bar\"" | "B: “foo” “bar”" |

  Scenario: Inserting double smart quotes - 1
    Given the editor state is "B: "
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"" is inserted
    Then the editor state is "B: “"
    When undo is performed
    Then the editor state is
      """
      B: \"
      """

  Scenario: Inserting double smart quotes - 2
    Given the editor state is "B: "
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"\"" is inserted
    Then the editor state is "B: ““"
    When undo is performed
    Then the editor state is
      """
      B: \"\"
      """

  # Scenario: Inserting double smart quotes - 3 — skipped
  # Inserting """ produces curly “““ via input rule, undo restores literal """.
  # Cucumber-expressions {string} regex chokes on consecutive bare ", and
  # gherkin docstring delivery silently strips repeated \" sequences.
  # Cover this case once a custom textspec parameter type with a greedy matcher
  # exists.
  Scenario: Inserting double smart quotes - 4
    Given the editor state is "B: ”"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"" is inserted
    Then the editor state is "B: ””"
    When undo is performed
    Then the editor state is
      """
      B: ”\"
      """

  Scenario: Inserting double smart quotes - 5
    Given the editor state is "B: "
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"foo\"" is inserted
    Then the editor state is "B: “foo”"
    When undo is performed
    Then the editor state is
      """
      B: \"foo\"
      """

  Scenario: Inserting double smart quotes - 6
    Given the editor state is "B: “foo"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"" is inserted
    Then the editor state is "B: “foo”"
    When undo is performed
    Then the editor state is
      """
      B: “foo\"
      """

  Scenario: Inserting double smart quotes - 7
    Given the editor state is
      """
      B: \"foo
      """
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"" is inserted
    Then the editor state is
      """
      B: \"foo”
      """
    When undo is performed
    Then the editor state is
      """
      B: \"foo\"
      """

  Scenario: Inserting double smart quotes - 8
    Given the editor state is
      """
      B: \"foo\"
      """
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"bar\"" is inserted
    Then the editor state is
      """
      B: \"foo\"“bar”
      """
    When undo is performed
    Then the editor state is
      """
      B: \"foo\"\"bar\"
      """

  Scenario: Inserting double smart quotes - 9
    Given the editor state is "B: “foo”"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\"" is inserted
    Then the editor state is "B: “foo””"
    When undo is performed
    Then the editor state is
      """
      B: “foo”\"
      """

  Scenario: Inserting single smart quotes - 1
    Given the editor state is "B: "
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\'" is inserted
    Then the editor state is "B: ‘"
    When undo is performed
    Then the editor state is "B: '"

  Scenario: Inserting single smart quotes - 2
    Given the editor state is "B: "
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\'foo\'" is inserted
    Then the editor state is "B: ‘foo’"
    When undo is performed
    Then the editor state is "B: 'foo'"

  Scenario: Inserting single smart quotes - 3
    Given the editor state is "B: ‘foo"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\'" is inserted
    Then the editor state is "B: ‘foo’"
    When undo is performed
    Then the editor state is "B: ‘foo'"

  Scenario: Inserting single smart quotes - 4
    Given the editor state is "B: 'foo"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\'" is inserted
    Then the editor state is "B: 'foo’"
    When undo is performed
    Then the editor state is "B: 'foo'"

  Scenario: Inserting single smart quotes - 5
    Given the editor state is "B: 'foo'"
    # The "When {string} is inserted" step inserts all characters at once to
    # mimic how insert.text behaves on Android
    When "\'bar\'" is inserted
    Then the editor state is "B: 'foo'‘bar’"
    When undo is performed
    Then the editor state is "B: 'foo''bar'"

  Scenario: Mixed quotes
    Given the editor state is "B: "
    When "\"'sorry' you say?\" she asked" is typed
    Then the editor state is "B: “‘sorry’ you say?” she asked"

  Scenario Outline: Contractions
    When the editor is focused
    And <text> is typed
    Then the editor state is <new text>

    Examples:
      | text     | new text    |
      | "it's"   | "B: it’s"   |
      | "don't"  | "B: don’t"  |
      | "won't"  | "B: won’t"  |
      | "I'm"    | "B: I’m"    |
      | "you're" | "B: you’re" |
