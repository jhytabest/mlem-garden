-- Mlem Garden Database Schema
-- Run with: wrangler d1 execute mlem-garden-db --file=./schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Shobers table (one per user)
CREATE TABLE IF NOT EXISTS shobers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Unnamed Shober',
  config TEXT NOT NULL DEFAULT '{}', -- JSON: colors, accessories, expression, etc.
  position_x REAL DEFAULT 50,
  position_y REAL DEFAULT 50,
  total_pets INTEGER DEFAULT 0,
  total_gifts INTEGER DEFAULT 0,
  mood TEXT DEFAULT 'happy', -- happy, excited, sleepy, curious
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shobers_user_id ON shobers(user_id);

-- Interactions table (pets, gifts, reactions)
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('pet', 'gift', 'emoji')),
  data TEXT, -- JSON: emoji type, gift type, etc.
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interactions_to_shober ON interactions(to_shober_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

-- Gifts inventory (collectibles received by shobers)
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  gift_type TEXT NOT NULL,
  from_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  received_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gifts_shober_id ON gifts(shober_id);
