# Gemma 4 Primary Model Design

## Context

He thong AI hien tai da co model router rieng trong `src/lib/ai`, voi provider `google` va `openai`.
Primary provider mac dinh la `google`, primary model mac dinh hien la `gemini-2.5-flash-lite`.
Google docs xac nhan Gemma 4 co the chay qua Gemini API bang endpoint `generateContent`, nen khong can them provider moi.

## Goal

Doi model AI chinh mac dinh tu `gemini-2.5-flash-lite` sang Gemma 4 cua Google.

Thanh cong khi:

- moi moi truong khong override env se dung Gemma 4 lam primary model
- provider van la `google` va van dung `GOOGLE_GENERATIVE_AI_API_KEY`
- health check, AI agent route, safe database route, va dashboard admin van doc dung model runtime
- docs/env mau khong con huong dan mac dinh `gemini-2.5-flash-lite`
- usage cost estimate khong tinh sai chi phi cho Gemma 4

## Decision

Dung `gemma-4-26b-a4b-it` lam primary model mac dinh.

Ly do:

- duoc Google ho tro qua Gemini API
- can bang tot hon cho default request so voi bien the `gemma-4-31b-it`
- khong can thay doi provider, API key, hay luong routing hien co
- phu hop muc tieu thay default model voi blast radius nho

Khong chon `gemma-4-31b-it` lam mac dinh trong lan nay vi day la model lon hon, co rui ro do tre cao hon cho moi request AI.

## Scope

Bao gom:

- doi fallback default trong `src/lib/ai/config.ts`
- doi env mau va Docker deployment docs sang `AI_PRIMARY_MODEL=gemma-4-26b-a4b-it`
- them Gemma 4 vao bang gia local cua usage estimator voi gia tri free-tier hien hanh
- giu fallback OpenAI hien co khong doi
- giu `AI_MAX_OUTPUT_TOKENS` va timeout hien co khong doi

Khong bao gom:

- them provider moi
- self-host Gemma
- them image/audio input
- bat Gemma thinking mode mac dinh
- doi UI dashboard admin ngoai viec hien model runtime da co san

## Architecture

Luot goi AI tiep tuc theo flow hien tai:

1. Backend doc `getAIConfig()`.
2. `resolveAIModel()` chon primary provider/model neu khong dung fallback.
3. Provider `google` goi `generateGoogleResponse()`.
4. Endpoint REST van la `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
5. Usage logging ghi model `gemma-4-26b-a4b-it`.

Vi Gemma 4 dung cung Gemini API, implementation chi la thay default model id va tai lieu cau hinh.

## Error Handling

Neu API key Google thieu, loi hien co `MISSING_GOOGLE_API_KEY` van duoc dung.
Neu model id khong duoc Google account/runtime ho tro, provider se tra loi loi qua `AIProviderError` nhu hien tai.
Health check admin tiep tuc la cach xac minh nhanh sau deploy.

## Testing

Kiem tra toi thieu:

- TypeScript/build hoac lint neu co the chay trong workspace
- search toan repo de dam bao default `gemini-2.5-flash-lite` khong con nam trong config/env/docs lien quan
- health check runtime co the duoc admin dung sau khi deploy voi API key Google

