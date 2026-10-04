# OpenRouter setup

Yes: this project can use an OpenRouter API key.

1. Create a key at https://openrouter.ai/settings/keys.
2. Copy agent/.env.example to agent/.env if agent/.env does not exist.
3. Put the key in agent/.env as LLM_API_KEY. Do not put it in frontend/.env, a VITE_ variable, README, or source code.
4. Select a model on OpenRouter that supports JSON responses. The supplied openrouter/auto option routes through OpenRouter; it is not a guarantee of free usage.
5. Restart npm run dev after changing the configuration.

Example:
```env
LLM_API_KEY=your-openrouter-key
LLM_MODEL=openrouter/auto
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_MAX_TOKENS=4096
APP_URL=http://127.0.0.1:5173
```

Use the exact model ID from OpenRouter if you prefer a specific model. The request requires response_format support; incompatible models/providers are rejected rather than silently losing structured-output validation.

## Verify it

Log in and open Settings -> AI connection -> Test AI connection. This makes a small real model request. It reports invalid keys, insufficient credits, model incompatibility, rate limits, timeouts or successful JSON generation without printing the key.

Alternatively, from the agent directory:
```powershell
.venv/Scripts/python scripts/check_ai.py
```

The crawler, deterministic scores, stored history and keywords do not need an AI key. AI explanations/content/chat use the key only through the server-side Python service. Existing rule-based results are retained; run a new audit to create AI recommendations after connecting a provider.

npm run dev generates/shares AGENT_SERVICE_TOKEN for backend-to-agent authentication. It is not an OpenRouter key. For separately run services, set matching private service tokens in backend/.env and agent/.env.

References:
- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [Chat completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)
- [Structured output support](https://openrouter.ai/docs/guides/features/structured-outputs)

