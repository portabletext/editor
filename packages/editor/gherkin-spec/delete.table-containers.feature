Feature: Deleting Across Table Containers

  Scenario: Backspace over a range across cells in the same row keeps the intermediate cells with their content cleared
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
          CELL:
            B: MIDDLE
          CELL:
            B: baz
      """
    When a focus event is sent
    And the selection is
      """
      TABLE:
        ROW:
          CELL:
            B: f^oo
          CELL:
            B: MIDDLE
          CELL:
            B: ba|z
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: f|
          CELL:
            B:
          CELL:
            B: z
      """

  Scenario: Backspace over a range across rows in the same table keeps the intermediate rows with their cells cleared
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: foo
        ROW:
          CELL:
            B: MID0
          CELL:
            B: MID1
        ROW:
          CELL:
            B: baz
      """
    When a focus event is sent
    And the selection is
      """
      TABLE:
        ROW:
          CELL:
            B: f^oo
        ROW:
          CELL:
            B: MID0
          CELL:
            B: MID1
        ROW:
          CELL:
            B: ba|z
      """
    And "{Backspace}" is pressed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: f|
        ROW:
          CELL:
            B:
          CELL:
            B:
        ROW:
          CELL:
            B: z
      """

  Scenario: Selecting an entire empty table and pressing Delete unsets the table
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
      """
    When a focus event is sent
    And the selection is "TABLE:;;  ROW:;;    CELL:;;      B: ^;;    CELL:;;      B:;;    CELL:;;      B:;;  ROW:;;    CELL:;;      B:;;    CELL:;;      B:;;    CELL:;;      B: |"
    And "{Delete}" is pressed
    Then the editor state is
      """
      B: |
      """

  Scenario: Selecting only the first two of three empty cells in a row and pressing Delete collapses the selection without removing structure
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
      """
    When a focus event is sent
    And the selection is "TABLE:;;  ROW:;;    CELL:;;      B: ^;;    CELL:;;      B: |;;    CELL:;;      B:"
    And "{Delete}" is pressed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: |
          CELL:
            B:
          CELL:
            B:
      """

  Scenario: Selecting from the first cell to a middle cell of a 2x3 table and pressing Delete preserves the trailing cells
    Given the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
      """
    When a focus event is sent
    And the selection is "TABLE:;;  ROW:;;    CELL:;;      B: ^;;    CELL:;;      B:;;    CELL:;;      B:;;  ROW:;;    CELL:;;      B:;;    CELL:;;      B: |;;    CELL:;;      B:"
    And "{Delete}" is pressed
    Then the editor state is
      """
      TABLE:
        ROW:
          CELL:
            B: |
          CELL:
            B:
          CELL:
            B:
        ROW:
          CELL:
            B:
          CELL:
            B:
          CELL:
            B:
      """
