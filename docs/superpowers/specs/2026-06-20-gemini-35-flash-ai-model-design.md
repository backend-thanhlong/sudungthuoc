# Design: Gemini 3.5 Flash AI Model Integration

## Context

The AI Agent already supports Google Gemini through `src/lib/ai/providers/google.ts`. The provider calls the Gemini API `generateContent` endpoint with the configured model ID, so integrating another Gemini model does not require a new provider.

Current AI model routing is split across:

- `src/lib/ai/config.ts` for primary/fallback provider and model IDs from env
- `src/lib/ai/model-router.ts` for resolving system default, fallback, and explicit model choices
- `src/lib/ai/model-options.ts` for chatbot model choices
- `src/lib/ai/safe-database.ts` for safe SQL generation using the primary model
- `src/app/api/admin/ai-agent/health-check/route.ts` for provider health checks
- `src/app/dashboard/admin/ai-agent/page.tsx` for admin runtime visibility

The user wants to integrate Gemini 3.5 Flash. The selected scope is:

1. Make Gemini 3.5 Flash the default primary model.
2. Add Gemini 3.5 Flash as an explicit chatbot model choice.

Google AI documentation lists Gemini 3.5 Flash with stable model string `gemini-3.5-flash` in the Gemini API model documentation:

https://ai.google.dev/gemini-api/docs/models

## Scope

Add `gemini-3.5-flash` to the AI runtime:

- default primary model when `AI_PRIMARY_MODEL` is not set
- Docker Compose default
- env example value
- deployment documentation value
- chatbot explicit model option
- model router support for explicit Google model choices

Out of scope:

- adding a new provider
- changing Google API key handling
- changing fallback policy
- changing quota or admin policy tables
- changing database schema
- changing prompt logic
- changing safe database view access

## Runtime Behavior

System default:

- Primary provider remains `google`.
- Primary model default becomes `gemini-3.5-flash`.
- Existing env override behavior stays intact. If `AI_PRIMARY_MODEL` is set, it wins.

Explicit chatbot model choice:

- Add a dropdown option labeled `Gemini 3.5 Flash`.
- Selecting it routes the request to provider `google` and model `gemini-3.5-flash`.
- Explicit model choice should bypass fallback selection, matching the existing DeepSeek option behavior.

Fallback:

- Fallback remains governed by current settings and `AI_FALLBACK_*` env.
- Fallback is still admin-only and task-limited.
- If the user selects `Gemini 3.5 Flash` explicitly and also requests fallback, keep current behavior: model choice wins and include the existing fallback ignored warning.

Safe database:

- Safe SQL generation uses `config.primaryModel`, so it will use `gemini-3.5-flash` after the default/env update.
- No prompt or validation changes are required.

Health check:

- Health check already reads provider/model from `getAIProviderStatus()`.
- After the config update, primary health check tests `gemini-3.5-flash`.

## Code Design

### `src/lib/ai/config.ts`

Change:

```ts
primaryModel: process.env.AI_PRIMARY_MODEL || "gemini-3.5-flash"
```

### `src/lib/ai/model-options.ts`

Add:

- `GEMINI_35_FLASH_MODEL = "gemini-3.5-flash"`
- option:
  - value `gemini-3.5-flash`
  - label `Gemini 3.5 Flash`
  - description: fast Google Gemini model

Update types:

- `AIExplicitModelSelection` should allow provider `"google" | "deepseek"`.
- `normalizeAIChatModelChoice()` should preserve Gemini 3.5 Flash and DeepSeek; unknown values fall back to system default.
- `resolveExplicitChatModel()` should return `{ provider: "google", model: GEMINI_35_FLASH_MODEL }` for Gemini choice.

### `src/lib/ai/model-router.ts`

Current explicit model handling returns provider from `resolveExplicitChatModel()`, but for DeepSeek it replaces the model with `config.deepseekModel`.

Update behavior:

- If explicit provider is `deepseek`, keep using `config.deepseekModel` so env can override the DeepSeek model ID.
- If explicit provider is `google`, use the explicit model string directly.

This keeps the current DeepSeek override behavior while supporting fixed Google model choices.

### `src/lib/ai/usage.ts`

Add cost estimate only if pricing is verified from an official source during implementation. If pricing is not verified, omit the `gemini-3.5-flash` entry so estimated cost remains `undefined` while token usage still logs.

### Env And Deployment Files

Update references from `gemini-2.5-flash` to `gemini-3.5-flash` in:

- `.env`
- `.env.docker.example`
- `docker-compose.yml`
- `DOCKER_DEPLOYMENT.md`

Do not overwrite user secrets. Only change model ID strings.

## Data Flow

Default AI request:

1. User sends chat/review request without explicit model choice.
2. `normalizeAgentRequest()` returns `modelChoice = system-default`.
3. `resolveAIModel()` selects `config.primaryProvider` and `config.primaryModel`.
4. `generateGoogleResponse()` calls Gemini API with `gemini-3.5-flash` unless env overrides it.
5. Usage logging stores `model = gemini-3.5-flash`.

Explicit Gemini request:

1. User selects `Gemini 3.5 Flash` in chatbot.
2. Request carries `modelChoice = gemini-3.5-flash`.
3. `resolveExplicitChatModel()` returns provider `google`, model `gemini-3.5-flash`.
4. `generateRoutedAIResponse()` calls Google provider with that model.
5. Response and activity log record `gemini-3.5-flash`.

## Error Handling

No new error shape is required.

If Google API rejects the model ID or the API key is missing:

- `generateGoogleResponse()` throws `AIProviderError`.
- Existing agent route returns controlled provider errors.
- Existing health check reports provider error code/message.

## Testing

Automated checks:

```bash
npx tsc --noEmit
npm run lint
```

Focused checks:

```bash
npx eslint src/lib/ai/config.ts src/lib/ai/model-options.ts src/lib/ai/model-router.ts
```

Manual checks:

- Admin AI console shows primary model `gemini-3.5-flash`.
- Provider health check for primary succeeds with a valid Google API key.
- Chatbot dropdown includes `Gemini 3.5 Flash`.
- Chat with system default logs `gemini-3.5-flash`.
- Chat with explicit Gemini 3.5 Flash logs `gemini-3.5-flash`.
- Existing DeepSeek explicit option still routes to `config.deepseekModel`.

## Rollout

1. Apply code and env default changes.
2. Rebuild app container so Docker defaults are applied.
3. Run primary provider health check in admin AI console.
4. Test one normal chat and one explicit Gemini 3.5 Flash chat.

## Self Review

No placeholders remain. The design uses one model ID consistently: `gemini-3.5-flash`. It keeps provider handling, fallback policy, quota, and database access unchanged. The implementation scope is limited to model config, chatbot option routing, env/docs, and verification.
