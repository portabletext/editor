Feature: Inserting Text Inside Lists

  Scenario: Typing at the end of a deeply nested list item appends to its text
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              LIST:
                LIST-ITEM:
                  B: level-3
      """
    When the editor is focused
    And the selection is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              LIST:
                LIST-ITEM:
                  B: level-3|
      """
    And "!" is typed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              LIST:
                LIST-ITEM:
                  B: level-3!|
      """
