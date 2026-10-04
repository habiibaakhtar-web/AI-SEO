from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import create_app
from app.core.config import Settings
from test_agent import context, payload


def client():
    return TestClient(create_app(Settings(_env_file=None, agent_service_token="secret-service-token")))


def test_private_routes_require_service_token():
    assert client().post("/content/generate", json={"kind": "ideas", "context": {}}).status_code == 401


def test_unconfigured_provider_returns_unavailable():
    response = client().post("/content/generate", headers={"X-Service-Token": "secret-service-token"}, json={"kind": "ideas", "context": {}})
    assert response.status_code == 503


def test_connection_routes_are_private_and_validate_results():
    headers = {"X-Service-Token": "secret-service-token"}
    assert client().post("/provider/status").status_code == 401
    assert client().post("/provider/test").status_code == 401
    assert client().post("/provider/status", headers=headers).json()["configured"] is False
    with patch("app.main.complete", new=AsyncMock(return_value={"connected": True})):
        assert client().post("/provider/test", headers=headers).status_code == 200
    with patch("app.main.complete", new=AsyncMock(return_value={"connected": "true"})):
        assert client().post("/provider/test", headers=headers).status_code == 502


def test_recommendations_validate_provider_output():
    ctx = context()
    with patch("app.main.complete", new=AsyncMock(return_value=payload(ctx))):
        response = client().post("/seo/recommendations", headers={"X-Service-Token": "secret-service-token"}, json=ctx.model_dump(mode="json"))
    assert response.status_code == 200
    with patch("app.main.complete", new=AsyncMock(return_value={"recommendations": []})):
        response = client().post("/seo/recommendations", headers={"X-Service-Token": "secret-service-token"}, json=ctx.model_dump(mode="json"))
    assert response.status_code == 502

