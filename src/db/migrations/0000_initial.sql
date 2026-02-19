-- VA Research Initial Migration
-- Run this manually or via: npm run db:push

-- Enums
CREATE TYPE "user_role" AS ENUM('admin', 'viewer');
CREATE TYPE "post_category" AS ENUM('XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER');

-- Users
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" varchar(100),
  "role" "user_role" DEFAULT 'viewer' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- User Preferences
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "ticker_symbols" json DEFAULT '["OANDA:XAUUSD","BINANCE:BTCUSDT","FOREXCOM:SPX","FX_IDC:XAGUSD"]',
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Posts (Technical Theses)
CREATE TABLE IF NOT EXISTS "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "category" "post_category" DEFAULT 'OTHER' NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "published" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "posts_category_idx" ON "posts"("category");
CREATE INDEX IF NOT EXISTS "posts_author_idx" ON "posts"("author_id");
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "posts_published_idx" ON "posts"("published");
