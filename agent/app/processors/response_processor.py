from app.api.schemas.seo_schema import RecommendationRequest, RecommendationResponse


def validate_recommendations(payload: dict, context: RecommendationRequest) -> RecommendationResponse:
    """Validate shape and grounding before accepting any provider response."""
    response = RecommendationResponse.model_validate(payload)
    expected = {issue.id: issue.severity for issue in context.issues}
    received = [item.issue_id for item in response.recommendations]
    if len(received) != len(set(received)):
        raise ValueError("Duplicate issue recommendations")
    if set(received) != set(expected):
        raise ValueError("Recommendations must reference every supplied issue exactly once")
    if any(item.priority != expected[item.issue_id] for item in response.recommendations):
        raise ValueError("Recommendation priority must match the verified issue")
    return response

