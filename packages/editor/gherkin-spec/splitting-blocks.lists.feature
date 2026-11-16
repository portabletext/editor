Feature: Splitting Blocks Inside Lists

  Scenario: Pressing Enter repeatedly from the deepest list item escapes one level at a time, up to the root
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
    And "{Enter}" is pressed
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
                  B: level-3
                  B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
                  B:
                  B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
              B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
              B:
              B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
          B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
          B:
          B: |
      """
    When "{Enter}" is pressed
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
                  B: level-3
      B: |
      """

  Scenario: Pressing Enter in a list item's middle block splits it without leaving the list item
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
              B: level-2|
              LIST:
                LIST-ITEM:
                  B: level-3
      """
    And "{Enter}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              B: |
              LIST:
                LIST-ITEM:
                  B: level-3
      """
    When "{Enter}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              B:
              B: |
              LIST:
                LIST-ITEM:
                  B: level-3
      """
    When "{Enter}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              B:
              B:
              B: |
              LIST:
                LIST-ITEM:
                  B: level-3
      """
    When "{Enter}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: level-1
          LIST:
            LIST-ITEM:
              B: level-2
              B:
              B:
              B:
              B: |
              LIST:
                LIST-ITEM:
                  B: level-3
      """
