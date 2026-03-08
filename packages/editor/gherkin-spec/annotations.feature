# Complex marks like links
Feature: Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario: Selection after adding an annotation
    Given the text "P: foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" has marks "l1"
    And "bar" is selected

  Scenario: Inserting text after an annotation
    Given the text "P: foo"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "foo"
    And "bar" is typed
    Then "foo" has marks "l1"
    And "bar" has no marks

  Scenario Outline: Toggling annotation on with a collapsed selection
    Given the text "P: foo bar baz"
    When the caret is put <position>
    And "link" "l1" is toggled
    Then "bar" has marks "l1"

    Examples:
      | position       |
      | before "bar"   |
      | after "bar"    |
      | after "ar"     |

  Scenario: Toggling annotation on with a collapsed selection inside split block
    Given the text "P: foo bar baz"
    And "strong" around "bar"
    When the caret is put before "az"
    And "link" "l1" is toggled
    Then the text is "P: foo [strong:bar] [@link:baz]"
    And "foo " has no marks
    And "bar" has marks "strong"
    And " " has no marks
    And "baz" has marks "l1"

  Scenario: Toggling annotation off with a part-selection inside split block
    Given the text "P: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the text is "P: [@link:foo ][strong:[@link:bar]][@link: ]baz"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " " has marks "l1"
    And "baz" has no marks
    And "baz" is selected

  Scenario: Toggling annotation off with a part-selection does not remove sibling annotations
    Given the text "P: foo bar baz"
    And a "link" "l1" around "foo "
    And a "link" "l2" around "bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the text is "P: [@link:foo ][strong:[@link:bar]][@link: ]baz"
    And "foo " has marks "l1"
    And "bar" has marks "l2,strong"
    And " " has marks "l2"
    And "baz" has no marks
    And "baz" is selected

  Scenario: Toggling annotation off with a collapsed selection inside split block
    Given the text "P: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When the caret is put before "baz"
    And "link" is toggled
    Then the text is "P: foo [strong:bar] baz"
    And "foo " has no marks
    And "bar" has marks "strong"
    And " baz" has no marks
    And the caret is before "baz"

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the left
    Given the text "P: foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "bar"
    When "boo" is selected
    And "link" is toggled
    And the caret is put before "aa"
    And "link" is toggled
    Then the text is "P: [@link:foo ][strong:[@link:bar]][@link: baz ]boo baa"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " baz " has marks "l1"
    And "boo baa" has no marks

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the right
    Given the text "P: foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "boo"
    When "bar" is selected
    And "link" is toggled
    And the caret is put before "oo "
    And "link" is toggled
    Then the text is "P: foo bar[@link: baz ][strong:[@link:boo]][@link: baa]"
    And "foo bar" has no marks
    And " baz " has marks "l1"
    And "boo" has marks "l1,strong"
    And " baa" has marks "l1"

  Scenario Outline: Toggling annotation off with a collapsed selection
    Given the text "P: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When the caret is put <position>
    And "link" is toggled
    Then "foo bar baz" has no marks

    Examples:
      | position      |
      | before "oo"   |
      | after "o b"   |
      | after "ba"    |

  Scenario Outline: Writing on top of annotation
    When the editor is focused
    Given the text "P: foo bar baz"
    And a "comment" "c1" around "bar"
    When <selection>
    And "removed" is typed
    Then the text is <new>
    And "removed" has no marks

    Examples:
      | selection                      | new text                    |
      | "bar" is selected              | "P: foo removed baz"           |
      | "bar" is selected backwards    | "P: foo removed baz"           |
      | "ar" is selected               | "P: foo [@comment:b]removed baz"        |
      | "ar" is selected backwards     | "P: foo [@comment:b]removed baz"        |

  Scenario: Writing inside an annotation
    Given the text "P: foo baz"
    And a "link" "l1" around "foo baz"
    When the editor is focused
    And the caret is put after "foo"
    And " bar" is typed
    Then the text is "P: [@link:foo bar baz]"
    And "foo bar baz" has marks "l1"

  Scenario Outline: Inserting text at the edge of an annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And "new" is typed
    Then the text is <new>

    Examples:
      | text            | annotated | position         | new text                  |
      | "P: foo bar baz"   | "bar"     | after "foo "     | "P: foo new[@link:bar] baz"        |
      | "P: foo bar baz"   | "bar"     | before "bar"     | "P: foo new[@link:bar] baz"        |
      | "P: foo bar baz"   | "bar"     | after "bar"      | "P: foo [@link:bar]new baz"        |
      | "P: foo bar baz"   | "bar"     | before " baz"    | "P: foo [@link:bar]new baz"        |
      | "P: foo"           | "foo"     | before "foo"     | "P: new[@link:foo]"                 |
      | "P: foo"           | "foo"     | after "foo"      | "P: [@link:foo]new"                 |

  Scenario Outline: Inserting text between annotations
    Given the text "P: foobar"
    And a "link" "l1" around "foo"
    And a "link" "l2" around "bar"
    When the editor is focused
    And the caret is put after "foo"
    And "n" is typed
    Then the text is "P: [@link:foo]n[@link:bar]"

  Scenario: Inserting text after inline object, before annotation
    When the editor is focused
    And a "stock-ticker" is inserted
    And "{ArrowRight}" is pressed
    And "bar" is typed
    And "bar" is selected
    And "link" "l1" is toggled
    And the caret is put before "bar"
    And "foo " is typed
    Then the text is "P: {stock-ticker}foo [@link:bar]"

  Scenario Outline: Toggling decorator at the edge of an annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the text is <new>
    And "new" has marks "strong"

    Examples:
      | text            | annotated | position         | new text                  |
      | "P: foo bar baz"   | "bar"     | after "foo "     | "P: foo [strong:new][@link:bar] baz"       |
      | "P: foo bar baz"   | "bar"     | before "bar"     | "P: foo [strong:new][@link:bar] baz"       |
      | "P: foo bar baz"   | "bar"     | after "bar"      | "P: foo [@link:bar][strong:new] baz"       |
      | "P: foo bar baz"   | "bar"     | before " baz"    | "P: foo [@link:bar][strong:new] baz"       |
      | "P: foo"           | "foo"     | before "foo"     | "P: [strong:new][@link:foo]"                 |
      | "P: foo"           | "foo"     | after "foo"      | "P: [@link:foo][strong:new]"                 |
