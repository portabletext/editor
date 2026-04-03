Feature: Per-style schema restrictions

  Scenario: Decorator toggle is blocked on restricted style
    Given the text "hello world"
    When "hello world" is selected
    And "h1" is toggled
    And "strong" is toggled
    Then "hello world" has no marks

  Scenario: Decorator toggle works on unrestricted style
    Given the text "hello world"
    When "hello world" is selected
    And "strong" is toggled
    Then "hello world" has marks "strong"

  Scenario: Style change to restricted strips existing decorators
    Given the text "hello world"
    When "hello world" is selected
    And "strong" is toggled
    Then "hello world" has marks "strong"
    When "h1" is toggled
    Then "hello world" has no marks

  Scenario: Style change to unrestricted preserves decorators
    Given the text "hello world"
    When "hello world" is selected
    And "strong" is toggled
    Then "hello world" has marks "strong"
    When "blockquote" is toggled
    Then "hello world" has marks "strong"

  Scenario: Partially restricted style allows some decorators
    Given the text "hello world"
    When "hello world" is selected
    And "h2" is toggled
    And "em" is toggled
    Then "hello world" has marks "em"

  Scenario: Partially restricted style blocks disallowed decorators
    Given the text "hello world"
    When "hello world" is selected
    And "h2" is toggled
    And "strong" is toggled
    Then "hello world" has no marks

  Scenario: Annotation toggle is blocked on restricted style
    Given the text "hello world"
    When "hello world" is selected
    And "h1" is toggled
    And "link" is toggled
    Then "hello world" has no marks

  Scenario: Annotation toggle works on unrestricted style
    Given the text "hello world"
    When "hello world" is selected
    And "link" "a1" is toggled
    Then "hello world" has marks "a1"

  Scenario: Style change to restricted strips existing annotations
    Given the text "hello world"
    When "hello world" is selected
    And "link" "a1" is toggled
    Then "hello world" has marks "a1"
    When "h1" is toggled
    Then "hello world" has no marks

  Scenario: List toggle is blocked on restricted style
    Given the text "hello world"
    When "hello world" is selected
    And "h1" is toggled
    And "bullet" list is toggled
    Then the text is "h1:hello world"

  Scenario: List toggle works on unrestricted style
    Given the text "hello world"
    When "hello world" is selected
    And "bullet" list is toggled
    Then the text is ">-:hello world"
