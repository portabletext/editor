Feature: Backspacing Before Containers

  Scenario: Deleting backward at the start of an empty text block after a callout lands at the end of the callout content
    Given the editor state is
      """
      CALLOUT:
        B: foo
      B:
      """
    When the selection is
      """
      CALLOUT:
        B: foo
      B: |
      """
    And a backward character deletion is performed
    Then the editor state is
      """
      CALLOUT:
        B: foo|
      """

  Scenario: Deleting backward at the start of an empty text block after a callout with multi-block content lands at the end of the last block
    Given the editor state is
      """
      CALLOUT:
        B: foo
        B: bar
      B:
      """
    When the selection is
      """
      CALLOUT:
        B: foo
        B: bar
      B: |
      """
    And a backward character deletion is performed
    Then the editor state is
      """
      CALLOUT:
        B: foo
        B: bar|
      """

  Scenario: Deleting backward at the start of an empty text block after a table lands at the end of the last cell content
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            B: bar
      B:
      """
    When the selection is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            B: bar
      B: |
      """
    And a backward character deletion is performed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            B: bar|
      """

  Scenario: Deleting backward at the start of an empty text block after a table whose last cell ends in an image focuses the image
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            {IMAGE}
      B:
      """
    When the selection is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            {IMAGE}
      B: |
      """
    And a backward character deletion is performed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            ^{IMAGE}|
      """
