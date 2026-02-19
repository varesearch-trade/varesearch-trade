import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  pgEnum,
  boolean,
  json,
  numeric,
  integer,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['admin', 'viewer'])
export const categoryEnum = pgEnum('post_category', [
  'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER',
])
export const tradeSideEnum = pgEnum('trade_side', ['long', 'short'])
export const tradeStatusEnum = pgEnum('trade_status', ['open', 'closed', 'cancelled'])
export const orderTypeEnum = pgEnum('order_type', ['market', 'limit', 'stop'])
export const alertStatusEnum = pgEnum('alert_status', ['active', 'triggered', 'cancelled'])
export const alertConditionEnum = pgEnum('alert_condition', ['above', 'below'])
export const backtestStatusEnum = pgEnum('backtest_status', ['pending', 'running', 'completed', 'failed'])

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }),
  role: userRoleEnum('role').default('viewer').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
})

// ─── User Preferences ─────────────────────────────────────────────────────────
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  tickerSymbols: json('ticker_symbols').$type<string[]>().default([
    'OANDA:XAUUSD', 'BINANCE:BTCUSDT', 'FOREXCOM:SPX', 'FX_IDC:XAGUSD',
  ]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Portfolio Accounts ───────────────────────────────────────────────────────
export const portfolios = pgTable('portfolios', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  name: varchar('name', { length: 100 }).default('Paper Trading Account').notNull(),
  startingBalance: numeric('starting_balance', { precision: 18, scale: 2 }).default('100000').notNull(),
  currentBalance: numeric('current_balance', { precision: 18, scale: 2 }).default('100000').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  totalPnl: numeric('total_pnl', { precision: 18, scale: 2 }).default('0').notNull(),
  totalPnlPct: numeric('total_pnl_pct', { precision: 10, scale: 4 }).default('0').notNull(),
  totalTrades: integer('total_trades').default(0).notNull(),
  winningTrades: integer('winning_trades').default(0).notNull(),
  losingTrades: integer('losing_trades').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Trades ───────────────────────────────────────────────────────────────────
export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: varchar('symbol', { length: 30 }).notNull(),
  tvSymbol: varchar('tv_symbol', { length: 50 }).notNull(),
  side: tradeSideEnum('side').notNull(),
  orderType: orderTypeEnum('order_type').default('market').notNull(),
  status: tradeStatusEnum('status').default('open').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull(),
  entryPrice: numeric('entry_price', { precision: 18, scale: 6 }).notNull(),
  exitPrice: numeric('exit_price', { precision: 18, scale: 6 }),
  stopLoss: numeric('stop_loss', { precision: 18, scale: 6 }),
  takeProfit: numeric('take_profit', { precision: 18, scale: 6 }),
  limitPrice: numeric('limit_price', { precision: 18, scale: 6 }),
  pnl: numeric('pnl', { precision: 18, scale: 2 }),
  pnlPct: numeric('pnl_pct', { precision: 10, scale: 4 }),
  fees: numeric('fees', { precision: 18, scale: 4 }).default('0').notNull(),
  strategyTemplateId: uuid('strategy_template_id'),
  notes: text('notes'),
  tags: json('tags').$type<string[]>().default([]),
  openedAt: timestamp('opened_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
}, (t) => ({
  portfolioIdx: index('trades_portfolio_idx').on(t.portfolioId),
  symbolIdx: index('trades_symbol_idx').on(t.symbol),
  statusIdx: index('trades_status_idx').on(t.status),
}))

// ─── Price Alerts ─────────────────────────────────────────────────────────────
export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: varchar('symbol', { length: 30 }).notNull(),
  tvSymbol: varchar('tv_symbol', { length: 50 }).notNull(),
  condition: alertConditionEnum('condition').notNull(),
  targetPrice: numeric('target_price', { precision: 18, scale: 6 }).notNull(),
  currentPrice: numeric('current_price', { precision: 18, scale: 6 }),
  status: alertStatusEnum('status').default('active').notNull(),
  autoTrade: boolean('auto_trade').default(false).notNull(),
  autoSide: tradeSideEnum('auto_side'),
  autoQuantity: numeric('auto_quantity', { precision: 18, scale: 6 }),
  note: text('note'),
  triggeredAt: timestamp('triggered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Strategy Templates ───────────────────────────────────────────────────────
export const strategyTemplates = pgTable('strategy_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: categoryEnum('category').default('OTHER').notNull(),
  rules: json('rules').$type<StrategyRule[]>().notNull(),
  defaultQuantity: numeric('default_quantity', { precision: 18, scale: 6 }).default('1'),
  defaultStopLossPct: numeric('default_stop_loss_pct', { precision: 6, scale: 2 }),
  defaultTakeProfitPct: numeric('default_take_profit_pct', { precision: 6, scale: 2 }),
  isPublic: boolean('is_public').default(true).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Backtests ────────────────────────────────────────────────────────────────
export const backtests = pgTable('backtests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  strategyTemplateId: uuid('strategy_template_id'),
  name: varchar('name', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 30 }).notNull(),
  tvSymbol: varchar('tv_symbol', { length: 50 }).notNull(),
  timeframe: varchar('timeframe', { length: 10 }).notNull(),
  fromDate: timestamp('from_date').notNull(),
  toDate: timestamp('to_date').notNull(),
  startingCapital: numeric('starting_capital', { precision: 18, scale: 2 }).default('100000').notNull(),
  status: backtestStatusEnum('status').default('pending').notNull(),
  totalTrades: integer('total_trades'),
  winRate: numeric('win_rate', { precision: 6, scale: 2 }),
  totalReturn: numeric('total_return', { precision: 10, scale: 4 }),
  maxDrawdown: numeric('max_drawdown', { precision: 10, scale: 4 }),
  sharpeRatio: numeric('sharpe_ratio', { precision: 8, scale: 4 }),
  profitFactor: numeric('profit_factor', { precision: 8, scale: 4 }),
  avgWin: numeric('avg_win', { precision: 18, scale: 2 }),
  avgLoss: numeric('avg_loss', { precision: 18, scale: 2 }),
  equityCurve: json('equity_curve').$type<EquityPoint[]>(),
  tradeLog: json('trade_log').$type<BacktestTrade[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

// ─── Posts ────────────────────────────────────────────────────────────────────
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: categoryEnum('category').default('OTHER').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  published: boolean('published').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── JSON Types ───────────────────────────────────────────────────────────────
export type StrategyRule = {
  id: string
  type: 'entry' | 'exit' | 'filter'
  indicator: string
  condition: string
  value: string | number
  description: string
}

export type EquityPoint = {
  date: string
  equity: number
  drawdown: number
}

export type BacktestTrade = {
  date: string
  side: 'long' | 'short'
  entry: number
  exit: number
  pnl: number
  pnlPct: number
}

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type Portfolio = typeof portfolios.$inferSelect
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert
export type PriceAlert = typeof priceAlerts.$inferSelect
export type StrategyTemplate = typeof strategyTemplates.$inferSelect
export type Backtest = typeof backtests.$inferSelect
export type UserPreferences = typeof userPreferences.$inferSelect
