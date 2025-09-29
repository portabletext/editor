Feature: Edge Cases

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Longer Transform
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text       | inserted text | new text            |
      | ""         | "."           | "...new"            |
      | "foo"      | "."           | "foo...new"         |
      | ""         | "foo."        | "foo...new"         |
      | "foo."     | "."           | "foo....new"        |
      | ""         | "foo.bar."    | "foo...bar...new"   |
      | "foo.bar." | "baz."        | "foo.bar.baz...new" |

  Scenario Outline: End String Rule
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text         | inserted text | new text            |
      | "-"          | ">"           | "→new"              |
      | ""           | "->"          | "→new"              |
      | "foo"        | "->"          | "foo→new"           |
      | ""           | "foo->"       | "foo→new"           |
      | "foo-"       | ">bar"        | "foo->barnew"       |
      | ""           | "foo->bar->"  | "foo->bar→new"      |
      | "foo->bar->" | "baz->"       | "foo->bar->baz→new" |

  Scenario Outline: Non-Global Rule
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text           | inserted text  | new text              |
      | "(c"           | ")"            | "©new"                |
      | ""             | "(c)"          | "©new"                |
      | "foo"          | "(c)"          | "foo©new"             |
      | ""             | "foo(c)"       | "foo©new"             |
      | "foo(c"        | ")bar"         | "foo©barnew"          |
      | ""             | "foo(c)bar(c)" | "foo©bar©new"         |
      | "foo(c)bar(c)" | "baz(c)"       | "foo(c)bar(c)baz©new" |
