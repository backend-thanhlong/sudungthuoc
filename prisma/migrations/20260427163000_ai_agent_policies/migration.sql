CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_user_policies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "chat_daily_limit" INTEGER,
    "review_daily_limit" INTEGER,
    "allow_fallback" BOOLEAN,
    "note" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_user_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_tool_policies" (
    "id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tool_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_settings_key_key" ON "ai_settings"("key");
CREATE UNIQUE INDEX "ai_user_policies_user_id_key" ON "ai_user_policies"("user_id");
CREATE UNIQUE INDEX "ai_tool_policies_tool_name_role_key" ON "ai_tool_policies"("tool_name", "role");
CREATE INDEX "ai_tool_policies_role_enabled_idx" ON "ai_tool_policies"("role", "enabled");

ALTER TABLE "ai_user_policies"
ADD CONSTRAINT "ai_user_policies_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
