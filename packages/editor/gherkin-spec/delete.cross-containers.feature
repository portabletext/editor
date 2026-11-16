Feature: Deleting Across Containers

  Scenario: Backspace over a range from a root text block into a code-block line removes the selected text
    Given the editor state is
      """
      B: foo
      CODE-BLOCK:
        B: bar
      """
    When a focus event is sent
    And the selection is
      """
      B: ^foo
      CODE-BLOCK:
        B: ba|r
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: |
      CODE-BLOCK:
        B: r
      """

  Scenario: Backspace over a range from a code-block line into the root text block below removes the selected text
    Given the editor state is
      """
      CODE-BLOCK:
        B: foo
      B: bar
      """
    When a focus event is sent
    And the selection is
      """
      CODE-BLOCK:
        B: f^oo
      B: ba|r
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      CODE-BLOCK:
        B: f|
      B: r
      """

  Scenario: Backspace over a range across three root siblings with a container in the middle merges the outer text blocks
    Given the editor state is
      """
      B: foo
      CODE-BLOCK:
        B: bar
      B: baz
      """
    When a focus event is sent
    And the selection is
      """
      B: fo^o
      CODE-BLOCK:
        B: bar
      B: ba|z
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: fo|z
      """

  Scenario: Backspace over a range across two lines of the same container merges the lines
    Given the editor state is
      """
      CODE-BLOCK:
        B: foo
        B: bar
      """
    When a focus event is sent
    And the selection is
      """
      CODE-BLOCK:
        B: f^oo
        B: ba|r
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      CODE-BLOCK:
        B: f|r
      """

  Scenario: Backspace over a range covering a root void block merges the outer text blocks
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When a focus event is sent
    And the selection is
      """
      B: fo^o
      {IMAGE}
      B: b|ar
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: fo|ar
      """

  Scenario: Backspace at the start of an empty container line below a text block unwraps the line
    Given the editor state is
      """
      B: foo
      CODE-BLOCK:
        B:
      """
    When a focus event is sent
    And the selection is
      """
      B: foo
      CODE-BLOCK:
        B: |
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: foo
      B: |
      """

  Scenario: Backspace over a range starting inside a multi-line callout removes its trailing lines and keeps the callout with its leading content
    Given the editor state is
      """
      CALLOUT:
        B: foo
        B: bar
        B: baz
      B: qux
      """
    When a focus event is sent
    And the selection is
      """
      CALLOUT:
        B: f^oo
        B: bar
        B: baz
      B: qu|x
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      CALLOUT:
        B: f|
      B: x
      """

  Scenario: Backspace over a range ending inside a multi-line callout removes its leading lines and keeps the callout with its trailing content
    Given the editor state is
      """
      B: foo
      CALLOUT:
        B: bar
        B: baz
        B: qux
      """
    When a focus event is sent
    And the selection is
      """
      B: f^oo
      CALLOUT:
        B: bar
        B: baz
        B: qu|x
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: f|
      CALLOUT:
        B: x
      """

  Scenario: Backspace over a range across two containers removes the fully covered root block between them
    Given the editor state is
      """
      CALLOUT:
        B: foo
      B: bar
      CALLOUT:
        B: baz
      """
    When a focus event is sent
    And the selection is
      """
      CALLOUT:
        B: f^oo
      B: bar
      CALLOUT:
        B: ba|z
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      CALLOUT:
        B: f|
      CALLOUT:
        B: z
      """

  Scenario: Backspace over a hanging range across a callout removes the callout entirely
    Given the editor state is
      """
      B: foo
      CALLOUT:
        B: hello
      B: bar
      """
    When a focus event is sent
    And the selection is
      """
      B: ^foo
      CALLOUT:
        B: hello
      B: |bar
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B: |bar
      """

  Scenario: Deleting all the text in an editable container keeps the container
    Given the editor state is
      """
      CALLOUT:
        B: /im
      """
    When text is deleted at the following range
      """
      CALLOUT:
        B: ^/im|
      """
    Then the editor state is
      """
      CALLOUT:
        B:
      """
    And nothing is selected

  Scenario: Deleting a range across two code-blocks removes both
    Given the editor state is
      """
      CODE-BLOCK:
        B: foo
      CODE-BLOCK:
        B: bar
      """
    When text is deleted at the following range
      """
      CODE-BLOCK:
        B: ^foo
      CODE-BLOCK:
        B: bar|
      """
    Then the editor state is
      """
      B: |
      """
