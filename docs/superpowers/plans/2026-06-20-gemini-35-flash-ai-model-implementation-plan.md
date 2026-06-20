# Gemini 3.5 Flash AI Model Implementation Plan

## Inputs

Plan này dựa trên:

- Spec đã duyệt: [2026-06-20-gemini-35-flash-ai-model-design.md](/opt/sudungthuoc/sudungthuoc/docs/superpowers/specs/2026-06-20-gemini-35-flash-ai-model-design.md)
- AI config hiện tại: [config.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/config.ts)
- Model choices hiện tại: [model-options.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/model-options.ts)
- Model router hiện tại: [model-router.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/model-router.ts)
- Google provider hiện tại: [google.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/providers/google.ts)
- Usage estimator hiện tại: [usage.ts](/opt/sudungthuoc/sudungthuoc/src/lib/ai/usage.ts)
- Admin AI health check: [health-check/route.ts](/opt/sudungthuoc/sudungthuoc/src/app/api/admin/ai-agent/health-check/route.ts)
- Docker config: [docker-compose.yml](/opt/sudungthuoc/sudungthuoc/docker-compose.yml)
- Deployment docs: [DOCKER_DEPLOYMENT.md](/opt/sudungthuoc/sudungthuoc/DOCKER_DEPLOYMENT.md)

## Goal

Tích hợp `gemini-3.5-flash` vào hệ thống AI theo phạm vi đã duyệt:

- đổi primary model mặc định toàn hệ thống sang `gemini-3.5-flash`
- thêm `Gemini 3.5 Flash` vào dropdown chọn model của chatbot
- route explicit Gemini choice qua Google provider
- giữ nguyên fallback, quota, API key, provider adapter và safe database guardrails

## Delivery Principles

- Không thêm provider mới vì Google provider hiện tại đã gọi Gemini API theo model ID.
- Không thay đổi prompt, tool policy, quota, schema DB hay cách lưu AI settings.
- Không overwrite secrets. Chỉ đổi model ID trong env mẫu và giá trị `.env` hiện có nếu đúng chuỗi model.
- Giữ DeepSeek explicit option hoạt động như cũ.
- Không gom các thay đổi unrelated đang có trong worktree.

## Current Constraints

- `model-options.ts` hiện chỉ hỗ trợ explicit provider `deepseek`.
- `model-router.ts` hiện thay explicit DeepSeek model bằng `config.deepseekModel`, behavior này cần giữ.
- `config.ts`, `.env`, `.env.docker.example`, và `docker-compose.yml` đang dùng `gemini-2.5-flash` ở một số default.
- Admin AI console không có config editor cho model ID; nó chỉ hiển thị runtime provider/model và health check.
- Safe database SQL generation dùng primary model từ config nên sẽ tự chuyển sang model mới.

## Target Files

### Code

- `src/lib/ai/config.ts`
- `src/lib/ai/model-options.ts`
- `src/lib/ai/model-router.ts`
- `src/lib/ai/usage.ts`

### Runtime Defaults And Docs

- `.env`
- `.env.docker.example`
- `docker-compose.yml`
- `DOCKER_DEPLOYMENT.md`

### Verification Only

- `src/lib/ai/providers/google.ts`
- `src/app/api/admin/ai-agent/health-check/route.ts`
- `src/app/api/ai/agent/route.ts`
- `src/lib/ai/safe-database.ts`

## Phase Breakdown

## Phase 1: Add Gemini 3.5 Flash Model Constant And Chat Option

### Objective

Đưa `gemini-3.5-flash` vào danh sách model chatbot có thể chọn trực tiếp.

### Tasks

1. Trong `src/lib/ai/model-options.ts`, thêm:
   - `GEMINI_35_FLASH_MODEL = "gemini-3.5-flash"`
2. Thêm option vào `AI_CHAT_MODEL_OPTIONS`:
   - value: `gemini-3.5-flash`
   - label: `Gemini 3.5 Flash`
   - description: model Google Gemini tốc độ cao
3. Mở rộng `AIExplicitModelSelection.provider` thành `"google" | "deepseek"`.
4. Cập nhật `normalizeAIChatModelChoice()`:
   - giữ `gemini-3.5-flash`
   - giữ `deepseek-v4-flash`
   - unknown về `system-default`
5. Cập nhật `resolveExplicitChatModel()`:
   - Gemini trả `{ provider: "google", model: GEMINI_35_FLASH_MODEL }`
   - DeepSeek giữ behavior hiện tại

### Acceptance Criteria

- Type `AIChatModelChoice` bao gồm `gemini-3.5-flash`.
- Request sanitize chấp nhận Gemini 3.5 Flash vì dùng `normalizeAIChatModelChoice()`.
- Dropdown chatbot nhận option mới nếu đang render từ `AI_CHAT_MODEL_OPTIONS`.

## Phase 2: Update Model Router For Explicit Google Model

### Objective

Cho explicit Gemini choice route qua Google provider mà không phá DeepSeek override.

### Tasks

1. Trong `src/lib/ai/model-router.ts`, xử lý explicit model:
   - nếu provider là `deepseek`, trả `model: config.deepseekModel`
   - nếu provider là `google`, trả `model: explicitModel.model`
2. Giữ `usedFallback: false` cho mọi explicit choice.
3. Không đổi `canUseFallback()`.
4. Không đổi `generateRoutedAIResponse()` vì đã support provider `google`.

### Acceptance Criteria

- Chọn Gemini 3.5 Flash gọi Google provider với `gemini-3.5-flash`.
- Chọn DeepSeek vẫn gọi DeepSeek provider với `config.deepseekModel`.
- Explicit model tiếp tục bỏ qua fallback.

## Phase 3: Change Primary Defaults To Gemini 3.5 Flash

### Objective

Đổi default primary model trên local, Docker và documentation.

### Tasks

1. Trong `src/lib/ai/config.ts`, đổi fallback default:
   - từ `process.env.AI_PRIMARY_MODEL || "gemini-2.5-flash"`
   - sang `process.env.AI_PRIMARY_MODEL || "gemini-3.5-flash"`
2. Trong `.env`, đổi:
   - `AI_PRIMARY_MODEL="gemini-3.5-flash"`
3. Trong `.env.docker.example`, đổi:
   - `AI_PRIMARY_MODEL=gemini-3.5-flash`
4. Trong `docker-compose.yml`, đổi default interpolation cho `AI_PRIMARY_MODEL` ở cả `app` và `app-admin`.
5. Trong `DOCKER_DEPLOYMENT.md`, cập nhật model primary được khuyến nghị sang `gemini-3.5-flash`.
6. Không đổi fallback model hoặc DeepSeek model.

### Acceptance Criteria

- Không còn default vận hành `gemini-2.5-flash` trong config/env/docker.
- Env override vẫn hoạt động.
- Google API key env không đổi.

## Phase 4: Usage Estimation Review

### Objective

Đảm bảo usage logging không sai lệch chi phí.

### Tasks

1. Kiểm tra `src/lib/ai/usage.ts`.
2. Nếu có pricing chính thức đáng tin cậy cho `gemini-3.5-flash`, thêm entry vào `MODEL_PRICES_PER_MILLION`.
3. Nếu chưa xác minh được pricing chính thức, không thêm pricing.
4. Không thay đổi token logging.

### Acceptance Criteria

- Token usage vẫn log input/output.
- Cost estimate chỉ có khi pricing được xác minh.
- Unknown pricing không gây lỗi, `estimatedCostUsd` là `undefined`.

## Phase 5: Focused Verification

### Objective

Xác minh compile, lint và routing behavior cơ bản.

### Tasks

1. Chạy:
   - `npx tsc --noEmit`
   - `npm run lint`
2. Chạy focused lint:
   - `npx eslint src/lib/ai/config.ts src/lib/ai/model-options.ts src/lib/ai/model-router.ts src/lib/ai/usage.ts`
3. Dùng `rg` xác minh các chuỗi:
   - `gemini-3.5-flash`
   - `gemini-2.5-flash`
4. Nếu có thể, chạy admin health check thủ công sau khi deploy.

### Acceptance Criteria

- TypeScript pass.
- Lint pass hoặc mọi lỗi còn lại được xác định là unrelated.
- `gemini-2.5-flash` không còn là default vận hành.

## Phase 6: Rollout

### Objective

Đưa model mới vào runtime container.

### Tasks

1. Sau khi code được duyệt/merge, rebuild:
   - `docker compose up -d --build`
2. Kiểm tra container:
   - `docker ps`
   - `docker logs --tail 80 sudungthuoc_app`
3. Vào admin AI console:
   - xác nhận primary model hiển thị `gemini-3.5-flash`
   - chạy health check primary
4. Gửi một chat bằng `Mặc định hệ thống`.
5. Gửi một chat chọn explicit `Gemini 3.5 Flash`.
6. Kiểm tra usage log ghi model `gemini-3.5-flash`.

### Acceptance Criteria

- App build và start thành công.
- Health check primary OK với Google API key hợp lệ.
- Chat system default và explicit Gemini đều trả lời.
- DeepSeek explicit option không regression.

## Risk Notes

- Nếu Google API key/project chưa được cấp quyền dùng `gemini-3.5-flash`, health check sẽ trả provider error nhưng app vẫn xử lý bằng `AIProviderError`.
- Nếu model ID thay đổi phía Google, chỉ cần đổi env/config model string, không cần đổi provider adapter.
- Worktree hiện có nhiều thay đổi unrelated; khi implement cần stage theo file scope, không stage toàn bộ.

## Implementation Checklist

- [ ] Add Gemini constant and chat option.
- [ ] Extend explicit model type/provider handling.
- [ ] Update model router for explicit Google model.
- [ ] Change primary defaults to `gemini-3.5-flash`.
- [ ] Update env/docker/deployment docs.
- [ ] Review usage pricing behavior.
- [ ] Run type-check and lint.
- [ ] Rebuild Docker runtime.
- [ ] Run admin AI health check.
- [ ] Test default and explicit chat.

## Self Review

Plan này không có placeholder. Field/model string thống nhất là `gemini-3.5-flash`. Phạm vi chỉ chạm model routing/config/env/docs và verification, không đổi provider, quota, fallback policy, database schema hoặc prompt logic.
