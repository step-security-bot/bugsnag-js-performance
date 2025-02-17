Feature: Nested spans

  Scenario: Spans are nested under the correct parent context
    Given I navigate to the test URL "/docs/nested-spans"
    And I wait for 5 spans

    # Root span should have no parent
    Then the trace payload field "resourceSpans.0.scopeSpans.0.spans.4.name" equals "RootSpan"
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.4.parentSpanId" is null

    # Store the root span's id and traceId
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.4.id" is stored as the value "RootSpanId"
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.4.traceId" is stored as the value "RootSpanTraceId"

    # New root span should also have no parent
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.1.name" equals "NewRootSpan"
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.1.parentSpanId" is null
    And the trace payload field "resourceSpans.0.scopeSpans.0.spans.1.traceId" does not equal the stored value "RootSpanTraceId"

    # All child spans should have parents
    And a span named 'FirstChildSpan' has a parent named 'RootSpan'
    And a span named 'SecondChildSpan' has a parent named 'RootSpan'
    And a span named 'ChildOfFirstChildSpan' has a parent named 'FirstChildSpan'

