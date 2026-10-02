Feature: Failure capture

  Scenario: Editors are created twice
    Given two editors
    Given two editors
    Then the text is ""
