import asyncio
import json
from unittest.mock import patch
import httpx
import pytest
from fastapi import HTTPException
from app.core.config import Settings
from app.services.llm_service import complete, provider_status


def settings():
    return Settings(_env_file=None, llm_api_key="private-test-key", llm_model="openrouter/auto",
                    llm_api_url="https://openrouter.ai/api/v1/chat/completions")


def run(handler):
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with patch("app.services.llm_service.httpx.AsyncClient", return_value=client):
        return asyncio.run(complete(settings(), "Return connected true.", {}))


def test_openrouter_request_and_json_response():
    def handler(request):
        assert request.headers["Authorization"] == "Bearer private-test-key"
        assert request.headers["X-Title"] == "AI SEO & Website Growth Agent"
        body = json.loads(request.content)
        assert body["provider"]["require_parameters"] is True
        assert body["response_format"] == {"type": "json_object"}
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"connected":true}'}}]})
    assert run(handler) == {"connected": True}
    assert "private-test-key" not in json.dumps(provider_status(settings()))


@pytest.mark.parametrize("status", [401, 402, 429, 500])
def test_provider_errors_do_not_expose_response_or_key(status):
    with pytest.raises(HTTPException) as error:
        run(lambda request: httpx.Response(status, text="private-test-key raw-provider-details"))
    assert error.value.status_code == 502
    assert "private-test-key" not in error.value.detail
    assert "raw-provider-details" not in error.value.detail


def test_invalid_json_rejected():
    with pytest.raises(HTTPException):
        run(lambda request: httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]}))
