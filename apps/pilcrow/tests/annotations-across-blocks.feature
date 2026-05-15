Feature: Annotations Across Blocks

  Background:
    Given one editor
    And a global keymap

  Scenario: Adding annotation across blocks
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And "{Enter}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1,l2" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":^foo]
      B: [@link _key="l2":bar|]
      """

  Scenario: Adding annotation across blocks (backwards selection)
    Given the editor state is "B: "
    When the editor is focused
    And "foo" is typed
    And "{Enter}" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1,l2" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":|foo]
      B: [@link _key="l2":bar^]
      """

  Scenario: Adding annotation across an image
    When the editor is focused
    And "foo|{image}" is inserted at "auto" and selected at the "end"
    And "{Enter}" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" "l1,l2" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":^foo]
      {IMAGE}
      B: [@link _key="l2":bar|]
      """

  Scenario: Adding annotation across an image (backwards selection)
    When the editor is focused
    And "foo|{image}" is inserted at "auto" and selected at the "end"
    And "{Enter}" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "link" "l1,l2" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":|foo]
      {IMAGE}
      B: [@link _key="l2":bar^]
      """

  Scenario: Splitting an annotation across blocks
    Given the editor state is "B: foobar"
    And a "link" "l1" around "foobar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo]
      B: [@link _key="l1":bar]
      """

  Scenario: Splitting an annotation across blocks using a selection
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When the editor is focused
    And "bar" is selected
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo ]
      B: [@link _key="l1": baz]
      """

  Scenario: Splitting a split annotation across blocks
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo]
      B: [@link _key="l1": ][strong:[@link _key="l1":bar]][@link _key="l1": baz]
      """

  Scenario: Splitting text after annotation doesn't touch the annotation
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "bar"
    And "{Enter}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo] bar
      B:  baz
      """

  # Warning: Possible wrong behaviour
  # "foo" and "bar" should rejoin as one link
  # Fixing this is possibly a breaking change
  Scenario: Splitting and merging an annotation across blocks
    Given the editor state is "B: foobar"
    And a "link" "l1" around "foobar"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo][@link _key="l2":bar]
      """

  # Warning: Possible wrong behaviour
  # The " baz" link should have a unique key
  # Fixing this is possibly a breaking change
  Scenario: Toggling part of an annotation off
    Given the editor state is "B: foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "link" is toggled
    Then the editor state is
      """
      B: [@link _key="l1":foo ]bar[@link _key="l1": baz]
      """

  Scenario: Splitting block before annotation
    Given the editor state is "B: foo"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    Then the editor state is "B: ;;B: [@link _key=\"l1\":foo]"

  Scenario: Splitting block after annotation
    Given the editor state is "B: foo"
    And a "link" "l1" around "foo"
    When the editor is focused
    And the caret is put after "foo"
    And "{Enter}" is pressed
    Then the editor state is "B: [@link _key=\"l1\":foo];;B: "

  Scenario: Merging blocks with annotations
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And "foo" is selected
    And "link" "l1" is toggled
    And "bar" is selected
    And "link" "l2" is toggled
    And the caret is put before "bar"
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: [@link _key="l1":foo][@link _key="l2":bar]
      """
