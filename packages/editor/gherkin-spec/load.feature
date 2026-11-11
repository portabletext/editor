Feature: Load
  A large first value goes into the editor whole and is drawn in chunks after
  `ready`. Until the last block is drawn, the editor is not editable and a user
  edit does nothing.

  Scenario Outline: Typing is ignored while a large first value is drawn at <depth>
    Given a large first value at "<depth>"
    Then the editor is not editable
    When "x" is typed
    Then the large value is unchanged by the user
    And the editor is editable

    Examples:
      | depth          |
      | root           |
      | callout        |
      | nested callout |
      | table cell     |
