CREATE TABLE IF NOT EXISTS ship_configs (
  guild_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'global' CHECK (mode IN ('global', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
