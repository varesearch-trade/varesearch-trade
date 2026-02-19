# VA Research — Full-Stack Financial Terminal

> A production-grade Next.js application with role-based auth, PostgreSQL persistence, live market data, and an admin publishing system.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth v5 (Credentials provider) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS + custom CSS |
| Typography | JetBrains Mono + Inter |
| Charts | TradingView Embedded Widgets |
| Markdown | react-markdown + remark-gfm |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── posts/                # GET all, POST new
│   │   ├── posts/[id]/           # DELETE, PATCH
│   │   ├── preferences/          # GET/PUT ticker config
│   │   └── economic-events/      # Live events feed (mock → real API)
│   ├── admin/                    # Protected admin route
│   ├── intelligence/             # Public blog/research page
│   ├── login/                    # Auth page
│   ├── layout.tsx                # Root layout + ticker + disclaimer
│   └── page.tsx                  # Main terminal dashboard
├── auth.ts                       # NextAuth configuration
├── middleware.ts                  # Route protection
├── db/
│   ├── index.ts                  # Drizzle client
│   ├── schema.ts                 # PostgreSQL schema
│   └── seed.ts                   # Database seeder
├── components/
│   ├── terminal/
│   │   ├── Header.tsx            # Navigation header
│   │   ├── TickerTape.tsx        # TradingView ticker (DB-persisted)
│   │   ├── DisclaimerBar.tsx     # Scrolling disclaimer
│   │   ├── TradingViewChart.tsx  # Dynamic chart widget
│   │   ├── MarketImpactFeed.tsx  # Economic events feed
│   │   ├── IntelligenceFeed.tsx  # Posts with category filter
│   │   ├── NewsTimeline.tsx      # TradingView news widget
│   │   ├── LoginForm.tsx         # Auth form
│   │   └── TerminalDashboard.tsx # Main interactive dashboard
│   ├── admin/
│   │   └── AdminDashboard.tsx    # Full admin management UI
│   └── ui/
│       └── MarkdownRenderer.tsx  # Styled markdown component
└── types/
    └── next-auth.d.ts            # Type augmentation
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — Random 32+ char string (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — `http://localhost:3000` for dev

### 3. Set up the database
```bash
# Push schema to PostgreSQL
npm run db:push

# Seed initial admin + demo data
npx tsx src/db/seed.ts
```

### 4. Run development server
```bash
npm run dev
```

---

## 👤 Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@varesearch.com | Admin@123! |
| Viewer | viewer@varesearch.com | Viewer@123! |

> **Change these immediately in production!**

---

## 🔐 Authentication & Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: publish posts, delete posts, configure ticker tape, access `/admin` |
| **Viewer** | Read-only: view terminal, read research posts |
| **Guest** | View terminal only (no research posts) |

Route protection is handled in `middleware.ts`:
- `/admin/*` → requires `admin` role
- `/settings/*` → requires any authenticated user

---

## 📊 Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | varchar(255) UNIQUE | |
| password_hash | text | bcrypt hashed |
| name | varchar(100) | |
| role | enum | `admin` or `viewer` |

### `user_preferences`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid FK | one-to-one with users |
| ticker_symbols | json | Array of TradingView symbol strings |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | varchar(255) | |
| content | text | Markdown |
| category | enum | XAUUSD, BTCUSD, ETHUSD, etc. |
| author_id | uuid FK | |
| published | boolean | Draft vs. live |
| created_at / updated_at | timestamp | |

---

## 📡 API Reference

### Posts
```
GET  /api/posts              # All published posts (optional ?category=)
POST /api/posts              # Create post (admin only)
PATCH /api/posts/:id         # Update post (admin only)
DELETE /api/posts/:id        # Delete post (admin only)
```

### Preferences
```
GET /api/preferences         # Get user's ticker config (auth required)
PUT /api/preferences         # Save ticker symbols (auth required)
```

### Economic Events
```
GET /api/economic-events?symbol=OANDA:XAUUSD
```
Returns mock data by default. To connect a real API, edit `src/app/api/economic-events/route.ts` and integrate with:
- [Trading Economics](https://tradingeconomics.com/api/)
- [Alpha Vantage Economic Calendar](https://www.alphavantage.co/)
- [Tradier](https://developer.tradier.com/)

---

## 🔄 Connecting a Real Economic Calendar API

In `src/app/api/economic-events/route.ts`, replace the mock data section with:

```typescript
// Example: Trading Economics
const response = await fetch(
  `https://api.tradingeconomics.com/calendar?c=${process.env.ECONOMIC_CALENDAR_API_KEY}`,
  { next: { revalidate: 300 } } // cache for 5 min
)
const data = await response.json()
// Map to EconomicEvent[] shape
```

---

## 🏭 Production Deployment

### Vercel (recommended)
1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy — Neon serverless works natively with Vercel Edge

### Environment variables for production
```bash
DATABASE_URL=postgresql://...?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com
```

---

## 🎨 Design System

| Variable | Value | Usage |
|----------|-------|-------|
| `--gold` | `#D4AF37` | Primary accent |
| `--bg` | `#030303` | Page background |
| `--surface` | `rgba(15,15,15,0.8)` | Glass cards |
| `--border` | `rgba(255,255,255,0.05)` | Subtle borders |
| Font Mono | JetBrains Mono | Labels, values, code |
| Font Sans | Inter | Headlines, body |
