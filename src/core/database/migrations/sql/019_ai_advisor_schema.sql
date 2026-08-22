CREATE TABLE IF NOT EXISTS command_telemetry (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  command_name TEXT NOT NULL,
  alias_used TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_guild_time ON command_telemetry (guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_cmd ON command_telemetry (command_name);

ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS ai_suggest_channel_id TEXT;
