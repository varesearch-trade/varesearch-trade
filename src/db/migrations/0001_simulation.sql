-- VA Research Simulation System Migration

-- New enums (add only if not exists)
DO $$ BEGIN
  CREATE TYPE "trade_side" AS ENUM('long', 'short');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "trade_status" AS ENUM('open', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "order_type" AS ENUM('market', 'limit', 'stop');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "alert_status" AS ENUM('active', 'triggered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "alert_condition" AS ENUM('above', 'below');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "backtest_status" AS ENUM('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add is_active and created_by to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "created_by" uuid;

-- Portfolio Accounts
CREATE TABLE IF NOT EXISTS "portfolios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) DEFAULT 'Paper Trading Account' NOT NULL,
  "starting_balance" numeric(18,2) DEFAULT '100000' NOT NULL,
  "current_balance" numeric(18,2) DEFAULT '100000' NOT NULL,
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "total_pnl" numeric(18,2) DEFAULT '0' NOT NULL,
  "total_pnl_pct" numeric(10,4) DEFAULT '0' NOT NULL,
  "total_trades" integer DEFAULT 0 NOT NULL,
  "winning_trades" integer DEFAULT 0 NOT NULL,
  "losing_trades" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Strategy Templates
CREATE TABLE IF NOT EXISTS "strategy_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" "post_category" DEFAULT 'OTHER' NOT NULL,
  "rules" json NOT NULL,
  "default_quantity" numeric(18,6) DEFAULT '1',
  "default_stop_loss_pct" numeric(6,2),
  "default_take_profit_pct" numeric(6,2),
  "is_public" boolean DEFAULT true NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Trades
CREATE TABLE IF NOT EXISTS "trades" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "portfolio_id" uuid NOT NULL REFERENCES "portfolios"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "symbol" varchar(30) NOT NULL,
  "tv_symbol" varchar(50) NOT NULL,
  "side" "trade_side" NOT NULL,
  "order_type" "order_type" DEFAULT 'market' NOT NULL,
  "status" "trade_status" DEFAULT 'open' NOT NULL,
  "quantity" numeric(18,6) NOT NULL,
  "entry_price" numeric(18,6) NOT NULL,
  "exit_price" numeric(18,6),
  "stop_loss" numeric(18,6),
  "take_profit" numeric(18,6),
  "limit_price" numeric(18,6),
  "pnl" numeric(18,2),
  "pnl_pct" numeric(10,4),
  "fees" numeric(18,4) DEFAULT '0' NOT NULL,
  "strategy_template_id" uuid,
  "notes" text,
  "tags" json DEFAULT '[]',
  "opened_at" timestamp DEFAULT now() NOT NULL,
  "closed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "trades_portfolio_idx" ON "trades"("portfolio_id");
CREATE INDEX IF NOT EXISTS "trades_symbol_idx" ON "trades"("symbol");
CREATE INDEX IF NOT EXISTS "trades_status_idx" ON "trades"("status");

-- Price Alerts
CREATE TABLE IF NOT EXISTS "price_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "symbol" varchar(30) NOT NULL,
  "tv_symbol" varchar(50) NOT NULL,
  "condition" "alert_condition" NOT NULL,
  "target_price" numeric(18,6) NOT NULL,
  "current_price" numeric(18,6),
  "status" "alert_status" DEFAULT 'active' NOT NULL,
  "auto_trade" boolean DEFAULT false NOT NULL,
  "auto_side" "trade_side",
  "auto_quantity" numeric(18,6),
  "note" text,
  "triggered_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Backtests
CREATE TABLE IF NOT EXISTS "backtests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "strategy_template_id" uuid,
  "name" varchar(100) NOT NULL,
  "symbol" varchar(30) NOT NULL,
  "tv_symbol" varchar(50) NOT NULL,
  "timeframe" varchar(10) NOT NULL,
  "from_date" timestamp NOT NULL,
  "to_date" timestamp NOT NULL,
  "starting_capital" numeric(18,2) DEFAULT '100000' NOT NULL,
  "status" "backtest_status" DEFAULT 'pending' NOT NULL,
  "total_trades" integer,
  "win_rate" numeric(6,2),
  "total_return" numeric(18,2),
  "max_drawdown" numeric(10,4),
  "sharpe_ratio" numeric(8,4),
  "profit_factor" numeric(8,4),
  "avg_win" numeric(18,2),
  "avg_loss" numeric(18,2),
  "equity_curve" json,
  "trade_log" json,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
