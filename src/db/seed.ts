/**
 * Seed script - run with: npx tsx src/db/seed.ts
 * Requires DATABASE_URL in .env
 */

import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, userPreferences, posts, portfolios, strategyTemplates } from './schema'
import bcrypt from 'bcryptjs'
import * as schema from './schema'

async function seed() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })

  console.log('🌱 Seeding database...')

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@varesearch.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!'
  const hash = await bcrypt.hash(adminPassword, 12)

  const [admin] = await db.insert(users).values({
    email: adminEmail, passwordHash: hash, name: 'VA Admin', role: 'admin', isActive: true,
  }).onConflictDoNothing().returning()

  if (admin) {
    await db.insert(userPreferences).values({ userId: admin.id }).onConflictDoNothing()
    await db.insert(portfolios).values({
      userId: admin.id, name: "Admin Paper Account",
      startingBalance: '250000', currentBalance: '250000',
    }).onConflictDoNothing()

    // ── Strategy Templates ─────────────────────────────────────────────────
    await db.insert(strategyTemplates).values([
      {
        name: 'Gold Trend Follower',
        description: 'Follows the dominant trend on XAUUSD using dual SMA crossover with strict R:R',
        category: 'XAUUSD',
        rules: [
          { id: '1', type: 'entry', indicator: 'SMA(10)', condition: 'crosses_above', value: 'SMA(30)', description: 'SMA10 crosses above SMA30 — bullish entry signal' },
          { id: '2', type: 'filter', indicator: 'RSI(14)', condition: 'between', value: '40-70', description: 'RSI must be between 40–70 (avoid overextended moves)' },
          { id: '3', type: 'exit', indicator: 'price', condition: 'touches', value: 'stop_loss', description: 'Exit if price hits stop loss (-2%)' },
          { id: '4', type: 'exit', indicator: 'price', condition: 'touches', value: 'take_profit', description: 'Take profit at +4% (2:1 R:R)' },
        ],
        defaultQuantity: '0.10',
        defaultStopLossPct: '2.00',
        defaultTakeProfitPct: '4.00',
        isPublic: true,
        createdBy: admin.id,
      },
      {
        name: 'BTC Momentum Breakout',
        description: 'Captures momentum breakouts on Bitcoin with tight stops',
        category: 'BTCUSD',
        rules: [
          { id: '1', type: 'entry', indicator: 'price', condition: 'breaks_above', value: '20-bar high', description: 'Price breaks above 20-bar high with volume' },
          { id: '2', type: 'filter', indicator: 'ATR(14)', condition: 'greater_than', value: '500', description: 'ATR must be above 500 (sufficient volatility)' },
          { id: '3', type: 'exit', indicator: 'SMA(10)', condition: 'crosses_below', value: 'price', description: 'Exit when price crosses below SMA10' },
          { id: '4', type: 'exit', indicator: 'price', condition: 'touches', value: 'take_profit', description: 'Target: 5% from entry' },
        ],
        defaultQuantity: '0.01',
        defaultStopLossPct: '2.50',
        defaultTakeProfitPct: '5.00',
        isPublic: true,
        createdBy: admin.id,
      },
      {
        name: 'Silver RSI Mean Reversion',
        description: 'Counter-trend strategy on XAGUSD using RSI extremes',
        category: 'XAGUSD',
        rules: [
          { id: '1', type: 'entry', indicator: 'RSI(14)', condition: 'below', value: 28, description: 'RSI drops below 28 — oversold extreme' },
          { id: '2', type: 'filter', indicator: 'price', condition: 'above', value: 'SMA(200)', description: 'Only long when price is above 200 SMA (uptrend)' },
          { id: '3', type: 'exit', indicator: 'RSI(14)', condition: 'above', value: 60, description: 'Exit when RSI recovers above 60' },
          { id: '4', type: 'exit', indicator: 'price', condition: 'touches', value: 'stop_loss', description: 'Hard stop at -1.5%' },
        ],
        defaultQuantity: '5',
        defaultStopLossPct: '1.50',
        defaultTakeProfitPct: '3.00',
        isPublic: true,
        createdBy: admin.id,
      },
      {
        name: 'SPX Macro Hedge',
        description: 'Systematic hedging approach for S&P 500 during macro uncertainty',
        category: 'SPX',
        rules: [
          { id: '1', type: 'entry', indicator: 'VIX', condition: 'above', value: 20, description: 'Enter short when VIX spikes above 20' },
          { id: '2', type: 'filter', indicator: 'SMA(50)', condition: 'below', value: 'SMA(200)', description: 'Only short when 50 SMA is below 200 SMA (death cross)' },
          { id: '3', type: 'exit', indicator: 'price', condition: 'touches', value: 'take_profit', description: 'Target: 3% downside' },
          { id: '4', type: 'exit', indicator: 'VIX', condition: 'below', value: 15, description: 'Close if VIX normalizes below 15' },
        ],
        defaultQuantity: '0.5',
        defaultStopLossPct: '1.50',
        defaultTakeProfitPct: '3.00',
        isPublic: true,
        createdBy: admin.id,
      },
    ]).onConflictDoNothing()

    // ── Demo post ──────────────────────────────────────────────────────────
    await db.insert(posts).values({
      title: 'XAUUSD — Macro Accumulation Zone',
      content: `## Thesis\n\nGold is currently trading at a **critical weekly demand zone** between $2,580–$2,620.\n\n### Key Levels\n- **Support**: $2,580 (Weekly FVG Base)\n- **Target 1**: $2,680 (Previous Range High)\n- **Target 2**: $2,720 (Liquidity Pool)\n- **Invalidation**: Daily close below $2,540\n\n### Macro Confluence\n- Fed pivot narrative remains intact\n- USD showing signs of exhaustion on DXY monthly chart\n- Real yields declining, historically bullish for XAU\n\n### Trade Structure\nLooking for a **limit entry** at $2,597 with a defined stop at $2,541. R:R of approximately **1:3** on this setup.`,
      category: 'XAUUSD', authorId: admin.id, published: true,
    }).onConflictDoNothing()

    console.log(`✅ Admin: ${adminEmail} / ${adminPassword}`)
  }

  // ── Demo viewer ─────────────────────────────────────────────────────────────
  const viewerHash = await bcrypt.hash('Viewer@123!', 12)
  const [viewer] = await db.insert(users).values({
    email: 'viewer@varesearch.com', passwordHash: viewerHash,
    name: 'Demo Trader', role: 'viewer', isActive: true,
  }).onConflictDoNothing().returning()

  if (viewer) {
    await db.insert(portfolios).values({
      userId: viewer.id, name: "Demo Trader's Account",
      startingBalance: '100000', currentBalance: '100000',
    }).onConflictDoNothing()
    await db.insert(userPreferences).values({ userId: viewer.id }).onConflictDoNothing()
    console.log('✅ Viewer: viewer@varesearch.com / Viewer@123!')
  }

  console.log('🚀 Seed complete')
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
