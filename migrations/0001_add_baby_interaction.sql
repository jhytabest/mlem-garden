-- Migration number: 0001 	 2026-01-25T23:00:00.000Z
-- Redefine interactions table to add 'baby' to the CHECK constraint

CREATE TABLE interactions_new (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('pet', 'gift', 'emoji', 'baby')),
  data TEXT, -- JSON: emoji type, gift type, etc.
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO interactions_new (id, from_user_id, to_shober_id, type, data, created_at)
SELECT id, from_user_id, to_shober_id, type, data, created_at FROM interactions;

DROP TABLE interactions;

ALTER TABLE interactions_new RENAME TO interactions;

CREATE INDEX IF NOT EXISTS idx_interactions_to_shober ON interactions(to_shober_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
