from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import create_app
from app.core.config import Settings
from app.api.schemas.seo_schema import RecommendationRequest
from app.processors.response_processor import validate_recommendations


def context():
    return RecommendationRequest.model_validate({
        "audit_id": str(uuid4()),
        "issues": [{
            "id": str(uuid4()), "title": "Missing title", "category": "on_page",
            "severity": "high", "page_url": "https://example.com/",
            "description": "No title element was found.", "why_it_matters": "Titles describe pages.",
            "recommendation": "Add a descriptive title.",
        }],
    })


def payload(ctx):
    return {"recommendations": [{
        "issue_id": str(ctx.issues[0].id), "recommendation": "Add a descriptive title.",
        "reason": "The measured page has no title.", "priority": "high",
    }]}


def test_liveness_and_provider_not_ready():
    client = TestClient(create_app(Settings(_env_file=None)))
    assert client.get("/health").json()["success"] is True
    assert client.get("/ready").status_code == 503


def test_accepts_grounded_recommendation():
    ctx = context()
    assert validate_recommendations(payload(ctx), ctx).recommendations[0].issue_id == ctx.issues[0].id


@pytest.mark.parametrize("kind", ["unknown", "missing", "duplicate", "priority"])
def test_rejects_ungrounded_recommendations(kind):
    ctx = context()
    data = payload(ctx)
    if kind == "unknown":
        data["recommendations"][0]["issue_id"] = str(uuid4())
    elif kind == "missing":
        data["recommendations"] = []
    elif kind == "duplicate":
        data["recommendations"] *= 2
    else:
        data["recommendations"][0]["priority"] = "low"
    with pytest.raises(ValueError):
        validate_recommendations(data, ctx)


def test_rejects_invalid_types_and_extra_fields():
    ctx = context()
    data = payload(ctx)
    data["recommendations"][0]["priority"] = "urgent"
    with pytest.raises(ValidationError):
        validate_recommendations(data, ctx)
    data = payload(ctx)
    data["recommendations"][0]["traffic"] = 10000
    with pytest.raises(ValidationError):
        validate_recommendations(data, ctx)

