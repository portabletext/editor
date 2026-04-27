# Complex marks like links
Feature: Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario: Selection after adding an annotation
    Given the editor state is "B: foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: foo [@link _key="l1":^bar|] baz
      """

  Scenario: Inserting text after an annotation
    Given the editor state is "B: foo"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "foo"
    And "bar" is typed
    Then the editor state is
      """
      B: [@link _key="l1":foo]bar|
      """

  Scenario Outline: Toggling annotation on with a collapsed selection
    Given the editor state is "B: foo bar baz"
    When the caret is put <position>
    And "link" "l1" is toggled
    Then the editor state is <new text>

    Examples:
      | position     | new text                                |
      | before "bar" | "B: foo [@link _key=\"l1\":^bar\|] baz" |
      | after "bar"  | "B: foo [@link _key=\"l1\":^bar\|] baz" |
      | after "ar"   | "B: foo [@link _key=\"l1\":^bar\|] baz" |

  Scenario: Toggling annotation on with a collapsed selection inside split block
    Given the editor state is "B: foo bar baz"
    And "strong" around "bar"
    When the caret is put before "az"
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: foo [strong:bar] [@link _key="l1":^baz|]
      """

  Scenario: Toggling annotation off with a part-selection inside split block
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ][strong:[@link _key="l1":bar]][@link _key="l1": ]^baz|
      """

  Scenario: Toggling annotation off with a part-selection does not remove sibling annotations
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo "
    And a "link" "l2" around "bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ][strong:[@link _key="l2":bar]][@link _key="l2": ]^baz|
      """

  Scenario: Toggling annotation off with a collapsed selection inside split block
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When the caret is put before "baz"
    And "link" is toggled
    Then the editor state is "B: foo [strong:bar] |baz"

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the left
    Given the editor state is "B: foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "bar"
    When "boo" is selected
    And "link" is toggled
    And the caret is put before "aa"
    And "link" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ][strong:[@link _key="l1":bar]][@link _key="l1": baz ]boo b|aa
      """

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the right
    Given the editor state is "B: foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "boo"
    When "bar" is selected
    And "link" is toggled
    And the caret is put before "oo "
    And "link" is toggled
    Then the editor state is
      """
      B: f|oo bar[@link _key="l1": baz ][strong:[@link _key="l1":boo]][@link _key="l1": baa]
      """

  Scenario Outline: Toggling annotation off with a collapsed selection
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When the caret is put <position>
    And "link" is toggled
    Then the editor state is <new text>

    Examples:
      | position    | new text         |
      | before "oo" | "B: foo bar baz" |
      | after "o b" | "B: foo bar baz" |
      | after "ba"  | "B: foo bar baz" |

  Scenario Outline: Writing on top of annotation
    When the editor is focused
    Given the editor state is "B: foo bar baz"
    And a "comment" "c1" around "bar"
    When <selection>
    And "removed" is typed
    Then the editor state is <new text>

    Examples:
      | selection                   | new text                                       |
      | "bar" is selected           | "B: foo removed\| baz"                         |
      | "bar" is selected backwards | "B: foo removed\| baz"                         |
      | "ar" is selected            | "B: foo [@comment _key=\"c1\":b]removed\| baz" |
      | "ar" is selected backwards  | "B: foo [@comment _key=\"c1\":b]removed\| baz" |

  Scenario: Writing inside an annotation
    Given the editor state is "B: foo baz"
    And a "link" "l1" around "foo baz"
    When the editor is focused
    And the caret is put after "foo"
    And " bar" is typed
    Then the editor state is
      """
      B: [@link _key="l1":foo bar| baz]
      """

  Scenario Outline: Inserting text at the edge of an annotation
    Given the editor state is <text>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | annotated | position      | new text                                  |
      | "B: foo bar baz" | "bar"     | after "foo "  | "B: foo new[@link _key=\"l1\":bar] baz"   |
      | "B: foo bar baz" | "bar"     | before "bar"  | "B: foo new[@link _key=\"l1\":bar] baz"   |
      | "B: foo bar baz" | "bar"     | after "bar"   | "B: foo [@link _key=\"l1\":bar]new\| baz" |
      | "B: foo bar baz" | "bar"     | before " baz" | "B: foo [@link _key=\"l1\":bar]new\| baz" |
      | "B: foo"         | "foo"     | before "foo"  | "B: new\|[@link _key=\"l1\":foo]"         |
      | "B: foo"         | "foo"     | after "foo"   | "B: [@link _key=\"l1\":foo]new\|"         |

  Scenario: Inserting text between annotations
    Given the editor state is "B: foobar"
    And a "link" "l1" around "foo"
    And a "link" "l2" around "bar"
    When the editor is focused
    And the caret is put after "foo"
    And "n" is typed
    Then the editor state is
      """
      B: [@link _key="l1":foo]n|[@link _key="l2":bar]
      """

  Scenario: Inserting text after inline object, before annotation
    When the editor is focused
    And a "stock-ticker" is inserted
    And "{ArrowRight}" is pressed
    And "bar" is typed
    And "bar" is selected
    And "link" "l1" is toggled
    And the caret is put before "bar"
    And "foo " is typed
    Then the editor state is
      """
      B: {stock-ticker}foo |[@link _key="l1":bar]
      """

  Scenario Outline: Toggling decorator at the edge of an annotation
    Given the editor state is <text>
    And a "link" "l1" around <annotated>
    When the editor is focused
    And the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | annotated | position      | new text                                           |
      | "B: foo bar baz" | "bar"     | after "foo "  | "B: foo [strong:new\|][@link _key=\"l1\":bar] baz" |
      | "B: foo bar baz" | "bar"     | before "bar"  | "B: foo [strong:new\|][@link _key=\"l1\":bar] baz" |
      | "B: foo bar baz" | "bar"     | after "bar"   | "B: foo [@link _key=\"l1\":bar][strong:new\|] baz" |
      | "B: foo bar baz" | "bar"     | before " baz" | "B: foo [@link _key=\"l1\":bar][strong:new\|] baz" |
      | "B: foo"         | "foo"     | before "foo"  | "B: [strong:new\|][@link _key=\"l1\":foo]"         |
      | "B: foo"         | "foo"     | after "foo"   | "B: [@link _key=\"l1\":foo][strong:new\|]"         |
