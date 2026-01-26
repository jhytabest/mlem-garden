-- Migration number: 0002   2026-01-26
-- Collectible breeding and trading system
-- - Remove UNIQUE constraint on user_id (allow multiple shobers per user)
-- - Add DNA, generation, lineage, rarity, marketplace fields
-- - Add new tables: user_wallets, ownership_history, marketplace_listings, breeding_requests, transactions

-- ============================================
-- 1. RECREATE SHOBERS TABLE (remove UNIQUE, add new fields)
-- ============================================

CREATE TABLE shobers_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Removed UNIQUE
  name TEXT NOT NULL DEFAULT 'Unnamed Shober',

  -- Original fields
  config TEXT NOT NULL DEFAULT '{}',
  position_x REAL DEFAULT 50,
  position_y REAL DEFAULT 50,
  total_pets INTEGER DEFAULT 0,
  total_gifts INTEGER DEFAULT 0,
  mood TEXT DEFAULT 'happy',

  -- NEW: Genetic DNA (24-char hex string)
  dna TEXT NOT NULL DEFAULT '000000000000000000000000',

  -- NEW: Lineage tracking
  generation INTEGER NOT NULL DEFAULT 0,
  parent1_id TEXT REFERENCES shobers_new(id) ON DELETE SET NULL,
  parent2_id TEXT REFERENCES shobers_new(id) ON DELETE SET NULL,

  -- NEW: Rarity (computed from DNA)
  rarity_score INTEGER DEFAULT 0,

  -- NEW: Collection management
  is_active INTEGER DEFAULT 0,  -- SQLite uses 0/1 for boolean

  -- NEW: Marketplace
  is_for_sale INTEGER DEFAULT 0,
  sale_price INTEGER,

  -- NEW: Breeding mechanics
  breeding_cooldown_until TEXT,
  breeding_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Migrate existing shobers (all become Gen 0, active, with placeholder DNA)
INSERT INTO shobers_new (
  id, user_id, name, config, position_x, position_y,
  total_pets, total_gifts, mood, dna, generation,
  rarity_score, is_active, created_at, updated_at
)
SELECT
  id, user_id, name, config, position_x, position_y,
  total_pets, total_gifts, mood,
  '000000000000000000000000',  -- Placeholder DNA (will be generated on first load)
  0,                           -- Gen 0
  50,                          -- Base rarity score
  1,                           -- Set as active (since they were the only shober)
  created_at, updated_at
FROM shobers;

DROP TABLE shobers;
ALTER TABLE shobers_new RENAME TO shobers;

-- Indexes for shobers
CREATE INDEX idx_shobers_user_id ON shobers(user_id);
CREATE INDEX idx_shobers_generation ON shobers(generation);
CREATE INDEX idx_shobers_rarity ON shobers(rarity_score DESC);
CREATE INDEX idx_shobers_for_sale ON shobers(is_for_sale) WHERE is_for_sale = 1;
CREATE INDEX idx_shobers_active ON shobers(user_id, is_active) WHERE is_active = 1;

-- ============================================
-- 2. USER WALLETS (Mlem Coins currency)
-- ============================================

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mlem_coins INTEGER DEFAULT 1000,       -- Starting balance
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create wallets for existing users with starting balance
INSERT OR IGNORE INTO user_wallets (user_id, mlem_coins)
SELECT id, 1000 FROM users;

-- ============================================
-- 3. OWNERSHIP HISTORY (provenance for blockchain)
-- ============================================

CREATE TABLE IF NOT EXISTS ownership_history (
  id TEXT PRIMARY KEY,
  shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  from_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,  -- NULL for minting/breeding
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL CHECK(transfer_type IN ('mint', 'breed', 'sale', 'gift')),
  price INTEGER,                         -- NULL for non-sales
  transaction_hash TEXT,                 -- For future blockchain integration
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_ownership_shober ON ownership_history(shober_id);
CREATE INDEX idx_ownership_created ON ownership_history(created_at DESC);

-- Record initial ownership for existing shobers
INSERT INTO ownership_history (id, shober_id, from_user_id, to_user_id, transfer_type, created_at)
SELECT
  lower(hex(randomblob(16))),
  id,
  NULL,
  user_id,
  'mint',
  created_at
FROM shobers;

-- ============================================
-- 4. MARKETPLACE LISTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  shober_id TEXT NOT NULL UNIQUE REFERENCES shobers(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK(price > 0),
  listed_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT                        -- Optional expiry
);

CREATE INDEX idx_listings_price ON marketplace_listings(price ASC);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_listings_listed ON marketplace_listings(listed_at DESC);

-- ============================================
-- 5. BREEDING REQUESTS (cross-user breeding)
-- ============================================

CREATE TABLE IF NOT EXISTS breeding_requests (
  id TEXT PRIMARY KEY,
  requester_shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  target_shober_id TEXT NOT NULL REFERENCES shobers(id) ON DELETE CASCADE,
  requester_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired', 'completed')),
  stud_fee INTEGER DEFAULT 0,            -- Optional fee for breeding
  baby_goes_to TEXT CHECK(baby_goes_to IN ('requester', 'target')),
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT (datetime('now', '+24 hours'))
);

CREATE INDEX idx_breeding_target ON breeding_requests(target_user_id, status);
CREATE INDEX idx_breeding_requester ON breeding_requests(requester_user_id, status);

-- ============================================
-- 6. TRANSACTIONS LOG (currency tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,               -- Positive = credit, Negative = debit
  type TEXT NOT NULL CHECK(type IN ('initial', 'daily_bonus', 'sale', 'purchase', 'stud_fee_earned', 'stud_fee_paid', 'breeding_cost')),
  reference_id TEXT,                     -- shober_id, listing_id, etc.
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);

-- Record initial balance transactions for existing users
INSERT INTO transactions (id, user_id, amount, type, description, created_at)
SELECT
  lower(hex(randomblob(16))),
  id,
  1000,
  'initial',
  'Welcome bonus',
  datetime('now')
FROM users;
