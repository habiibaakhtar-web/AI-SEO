import secrets
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Literal
from app.core.config import Settings
from app.services.llm_service import complete, provider_status
from app.api.schemas.seo_schema import RecommendationRequest
from app.processors.response_processor import validate_recommendations


class ContentRequest(BaseModel):
    kind: Literal["ideas", "brief", "meta", "assistant", "keywords"]
    context: dict


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title="AI SEO Agent", version="0.2.0")
    app.state.settings = settings

    def authorize(token):
        expected = settings.agent_service_token.get_secret_value()
        if not expected or not token or not secrets.compare_digest(token, expected):
            raise HTTPException(status_code=401, detail="Service authentication required.")

    @app.get("/health")
    def health():
        return {"success": True, "message": "Agent service is running.", "data": {"service": "agent", "version": "0.2.0"}}

    @app.get("/ready")
    def ready():
        configured = bool(settings.llm_api_key.get_secret_value() and settings.llm_model and settings.llm_api_url and settings.agent_service_token.get_secret_value())
        return JSONResponse(status_code=200 if configured else 503, content={
            "success": configured, "message": "AI provider is configured." if configured else "AI provider is not configured."
        })

    @app.post("/provider/status")
    def status(x_service_token: str | None = Header(default=None)):
        authorize(x_service_token)
        return provider_status(settings)

    @app.post("/provider/test")
    async def test_connection(x_service_token: str | None = Header(default=None)):
        authorize(x_service_token)
        result = await complete(settings, 'Return {"connected":true}.', {"task": "connection check"})
        if not isinstance(result, dict) or result.get("connected") is not True:
            raise HTTPException(status_code=502, detail="The model did not return valid connection-check JSON.")
        return {"connected": True, "provider": provider_status(settings)["provider"], "model": settings.llm_model}

    @app.post("/seo/recommendations")
    async def recommendations(body: RecommendationRequest, x_service_token: str | None = Header(default=None)):
        authorize(x_service_token)
        payload = await complete(settings,
            'Return {"recommendations":[{"issue_id":"UUID","recommendation":"action","reason":"why","priority":"same severity","suggested_text":null}]}. '
            "Reference every supplied issue exactly once and preserve its severity.", body.model_dump(mode="json"))
        try:
            result = validate_recommendations(payload, body)
            return result.model_dump(mode="json")
        except ValueError:
            raise HTTPException(status_code=502, detail="Recommendation validation failed.")

    @app.post("/content/generate")
    async def content(body: ContentRequest, x_service_token: str | None = Header(default=None)):
        authorize(x_service_token)
        payload = await complete(settings,
            'Return {"text":"a useful plain-text draft"}. Answer the requested tool kind. '
            "For assistant use only verified audit context for measurable claims. For meta include title and description. "
            "For brief include keywords, intent, headings, questions and goals.", body.model_dump())
        if not isinstance(payload, dict) or not isinstance(payload.get("text"), str) or not payload["text"].strip() or len(payload["text"]) > 20000:
            raise HTTPException(status_code=502, detail="Content validation failed.")
        return {"text": payload["text"]}

    return app


app = create_app()
