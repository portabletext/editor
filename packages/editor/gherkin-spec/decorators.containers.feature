Feature: Decorators in Containers

  Scenario: Toggling bold on text in a deeply nested list item makes it bold
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
                  B: ^level-3|
      """
    And "strong" is toggled
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
                  B: [strong:^level-3|]
      """
