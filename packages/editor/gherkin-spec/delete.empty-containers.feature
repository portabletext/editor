Feature: Deleting Empty Containers

  Scenario: Deleting backward in an empty callout with a text block before unwraps it to root
    Given the editor state is
      """
      B: foo
      CALLOUT:
        B:
      """
    When the selection is
      """
      B: foo
      CALLOUT:
        B: |
      """
    And text is deleted backward
    Then the editor state is
      """
      B: foo
      B: |
      """

  Scenario: Deleting backward in an empty callout with a text block after unwraps it to root
    Given the editor state is
      """
      CALLOUT:
        B:
      B: foo
      """
    When the selection is
      """
      CALLOUT:
        B: |
      B: foo
      """
    And text is deleted backward
    Then the editor state is
      """
      B: |
      B: foo
      """

  Scenario: Deleting backward in an empty callout that is the only block leaves a placeholder text block
    Given the editor state is
      """
      CALLOUT:
        B:
      """
    When the selection is
      """
      CALLOUT:
        B: |
      """
    And text is deleted backward
    Then the editor state is
      """
      B: |
      """

  Scenario: Deleting forward in an empty callout with a text block after unwraps it to root
    Given the editor state is
      """
      CALLOUT:
        B:
      B: foo
      """
    When the selection is
      """
      CALLOUT:
        B: |
      B: foo
      """
    And text is deleted
    Then the editor state is
      """
      B: |
      B: foo
      """
