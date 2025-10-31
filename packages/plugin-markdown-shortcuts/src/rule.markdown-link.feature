Feature: Markdown Link Rule

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Transform markdown Link into annotation
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>
    And <annotated> has <marks>

    Examples:
      | text          | inserted text | new text          | annotated | marks      |
      | "[foo](bar"   | ")"           | "foo,new"         | "foo"     | marks "k4" |
      | "[[foo](bar"  | ")"           | "[,foo,new"       | "foo"     | marks "k4" |
      | "[f[oo](bar"  | ")"           | "[f,oo,new"       | "oo"      | marks "k4" |
      | "[f[]oo](bar" | ")"           | "[f[]oo](bar)new" | ""        | no marks   |

  Scenario: Preserving decorator in link text
    Given the text "[foo](bar"
    And "strong" around "foo"
    When ")" is inserted
    And "new" is typed
    Then the text is "foo,new"
    And "foo" has marks "strong,k6"

  Scenario: Preserving decorators in link text
    Given the text "[foo](bar"
    And "strong" around "foo"
    And "em" around "oo"
    When ")" is inserted
    And "new" is typed
    Then the text is "f,oo,new"
    And "f" has marks "strong,k7"
    And "oo" has marks "strong,em,k7"

  Scenario: Overwriting other links
    Given the text "[foo](bar"
    And a "link" "l1" around "foo"
    When the caret is put after "bar"
    And ")" is inserted
    And "new" is typed
    Then the text is "foo,new"
    And "foo" has an annotation different than "l1"

  Scenario: Preserving other annotations
    Given the text "[foo](bar"
    And a "link" "l1" around "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "bar"
    And ")" is inserted
    And "new" is typed
    Then the text is "foo,new"
    And "foo" has an annotation different than "l1"
    And "foo" has marks "c1,k9"
