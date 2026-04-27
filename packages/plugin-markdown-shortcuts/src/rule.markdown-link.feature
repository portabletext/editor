Feature: Markdown Link Rule

  Background:
    Given a global keymap

  Scenario Outline: Transform markdown Link into annotation
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state                | inserted text | new state                         |
      | "B: \[foo\](bar"     | ")"           | "B: [@link _key=\"l1\":foo]new"   |
      | "B: \[\[foo\](bar"   | ")"           | "B: \[[@link _key=\"l1\":foo]new" |
      | "B: \[f\[oo\](bar"   | ")"           | "B: \[f[@link _key=\"l1\":oo]new" |
      | "B: \[f\[\]oo\](bar" | ")"           | "B: \[f\[\]oo\](bar)new\|"        |

  Scenario: Preserving decorator in link text
    Given the editor state is "B: \[foo\](bar"
    And "strong" around "foo"
    When the editor is focused
    And ")" is inserted
    And "new" is typed
    Then the editor state is "B: [strong:[@link:foo]]new|"

  Scenario: Preserving decorators in link text
    Given the editor state is "B: \[foo\](bar"
    And "strong" around "foo"
    And "em" around "oo"
    When the editor is focused
    And ")" is inserted
    And "new" is typed
    Then the editor state is "B: [strong:[@link:f]][strong:[em:[@link:oo]]]new"

  Scenario: Overwriting other links
    Given the editor state is "B: \[foo\](bar"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "bar"
    And ")" is inserted
    And "new" is typed
    Then the editor state is "B: [@link _key=\"l2\":foo]new"

  Scenario: Preserving other annotations
    Given the editor state is "B: \[foo\](bar"
    And a "link" "l1" around "foo"
    And a "comment" "c1" around "foo"
    When the editor is focused
    And the caret is put after "bar"
    And ")" is inserted
    And "new" is typed
    Then the editor state is "B: [@comment _key=\"c1\":[@link _key=\"l2\":foo]]new"
