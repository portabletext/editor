Feature: Navigating Between Containers and Siblings

  Scenario: Pressing ArrowDown inserts nothing when the container has a next sibling
    Given the editor state is
      """
      CALLOUT:
        B: AA
      B: after
      """
    When a focus event is sent
    And the selection is "CALLOUT:;;  B: AA|;;B: after"
    And a keydown event for "ArrowDown" is sent
    Then the editor state is
      """
      CALLOUT:
        B: AA|
      B: after
      """
