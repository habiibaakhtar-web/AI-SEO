import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import HTTPException
from app.core.config import Settings
from app.services.llm_service import complete, provider_status


async def main():
    settings = Settings()
    status = provider_status(settings)
    print("Provider:", status["provider"], "| Model:", status["model"] or "not set")
    if not status["configured"]:
        print("Set LLM_API_KEY, LLM_MODEL and LLM_API_URL in agent/.env.")
        return 1
    try:
        result = await complete(settings, 'Return {"connected":true}.', {"task": "connection check"})
        if result.get("connected") is not True:
            raise ValueError("Invalid check response")
        print("AI connection verified. Your API key was not printed.")
        return 0
    except HTTPException as error:
        print(error.detail)
        return 1
    except Exception:
        print("The provider returned an invalid connection-check response.")
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

