Feature: Overlapping Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario Outline: Inserting text at the edge of overlapping annotations
    Given the editor state is <text>
    And a "link" "l1" around <link>
    And a "comment" "c1" around <comment>
    When the editor is focused
    And the caret is put <position>
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text             | link          | comment | position      | new text                                                                                                 |
      | "B: foo bar baz" | "foo bar baz" | "bar"   | after "foo "  | "B: [@link _key=\"l1\":foo new][@link _key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\": baz]"   |
      | "B: foo bar baz" | "foo bar baz" | "bar"   | before "bar"  | "B: [@link _key=\"l1\":foo new][@link _key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\": baz]"   |
      | "B: foo bar baz" | "foo bar baz" | "bar"   | after "bar"   | "B: [@link _key=\"l1\":foo ][@link _key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\":new\| baz]" |
      | "B: foo bar baz" | "foo bar baz" | "bar"   | before " baz" | "B: [@link _key=\"l1\":foo ][@link _key=\"l1\":[@comment _key=\"c1\":bar]][@link _key=\"l1\":new\| baz]" |
      | "B: foo"         | "foo"         | "foo"   | before "foo"  | "B: new\|[@link _key=\"l1\":[@comment _key=\"c1\":foo]]"                                                 |
      | "B: foo"         | "foo"         | "foo"   | after "foo"   | "B: [@link _key=\"l1\":[@comment _key=\"c1\":foo]]new\|"                                                 |

  Scenario: Overlapping annotation
    Given the editor state is "B: foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected
    And "comment" "c1" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":foo][@link _key="l1":[@comment _key="c1":b]][@link _key="l1":ar]
      """

  Scenario: Overlapping annotation (backwards selection)
    Given the editor state is "B: foobar"
    And a "link" "l1" around "bar"
    When "foob" is selected backwards
    And "comment" "c1" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":foo][@link _key="l1":[@comment _key="c1":b]][@link _key="l1":ar]
      """

  Scenario: Overlapping annotation from behind
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":fo][@comment _key="c1":[@link _key="l1":^o]][@link _key="l1":bar|]
      """

  Scenario: Overlapping annotation from behind (backwards selection)
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":fo][@comment _key="c1":[@link _key="l1":|o]][@link _key="l1":bar^]
      """

  Scenario: Overlapping same-type annotation
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected
    And "comment" "c2" is toggled
    Then the editor state is
      """
      B: [@comment _key="c2":foob][@comment _key="c1":ar]
      """

  Scenario: Overlapping same-type annotation (backwards selection)
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "bar"
    When "foob" is selected backwards
    And "comment" "c2" is toggled
    Then the editor state is
      """
      B: [@comment _key="c2":foob][@comment _key="c1":ar]
      """

  Scenario: Overlapping same-type annotation from behind
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected
    And "comment" "c2" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":fo][@comment _key="c2":obar]
      """

  Scenario: Overlapping same-type annotation from behind (backwards selection)
    Given the editor state is "B: foobar"
    And a "comment" "c1" around "foo"
    When "obar" is selected backwards
    And "comment" "c2" is toggled
    Then the editor state is
      """
      B: [@comment _key="c1":fo][@comment _key="c2":obar]
      """
