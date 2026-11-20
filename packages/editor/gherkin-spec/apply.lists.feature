Feature: Applying Patches Inside Lists

  Scenario: A collaborator's text change in a deeply nested list item is applied
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
    When the selection is cleared
    And a collaborator sets the span text at the following position to "remote-edit"
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              LIST:
                LIST-ITEM:
                  B: |level-3
      """
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
                  B: remote-edit
      """
    And nothing is selected
