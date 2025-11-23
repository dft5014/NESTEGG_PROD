# CLAUDE.md - NestEgg Codebase Guide

## Project Overview

**NestEgg** is a comprehensive personal financial management and net worth tracking platform. It's designed as an open-source, privacy-focused alternative to services like Mint, YNAB, Monarch Money, and Personal Capital.

### Key Features
- Track net worth across all asset types without sharing bank credentials
- Manual entry or CSV import of financial data
- Unified portfolio view with advanced analytics
- Support for stocks, bonds, crypto, real estate, cash, metals, and liabilities
- Investment performance tracking and reporting
- Goal setting and financial planning
- System event monitoring and data consistency tracking

### Architecture Principles
- **Database-First:** Complex calculations happen in PostgreSQL views, not application code
- **Security-First:** No bank credential sharing required - manual entry model
- **Centralized State:** DataStore pattern for predictable data flow
- **UI Excellence:** Clean, interactive interfaces with purposeful animations

---

## 📋 TODO List & Task Tracking

**IMPORTANT:** A comprehensive TODO list is maintained in `/TODO.md` at the root of the repository. This list tracks all outstanding tasks, improvements, bugs, and technical debt.

### Instructions for Claude Code Sessions:

1. **Review TODO.md at the start of each session** to understand current priorities and known issues
2. **Update TODO.md as you work:**
   - Check off completed tasks using `[x]`
   - Add new bugs or issues as they are discovered
   - Add new tasks or improvements identified during code review
   - Update the "Last Updated" date at the top
3. **Reference TODO items in commits:** When completing tasks, reference them in commit messages (e.g., "Fix modal styling issue (TODO.md)")
4. **Keep it organized:** Move completed items to the "Completed Tasks" section at the bottom
5. **Add context where helpful:** Add notes, file references, or technical details under TODO items

### Priority Levels in TODO.md:
- **🔥 Critical:** Must be done before production launch
- **🚀 High:** Important for product quality and user experience
- **📋 Medium:** Should be done but not blocking
- **🔮 Future:** Nice to have, plan for later phases

**See `/TODO.md` for the complete list of tasks.**

---

## Technology Stack

### Backend
- **Framework:** FastAPI 0.95.0
- **Server:** Uvicorn 0.21.1
- **Database:** PostgreSQL (via SQLAlchemy 1.4.46)
- **Async DB:** databases 0.7.0, asyncpg 0.27.0
- **Caching:** Redis 4.6.0
- **Authentication:** Clerk (JWT with RS256)
- **Financial Data APIs:** Yahoo Finance, Polygon API, Alpha Vantage
- **Data Processing:** Pandas 2.0.3

### Frontend
- **Framework:** Next.js 15.2.3 (Pages Router)
- **UI Library:** React 19.0.0
- **Authentication:** Clerk NextJS 6.11.0
- **Styling:** Tailwind CSS 3.4.1
- **Charts:** Recharts 2.12.7, Chart.js 4.4.8
- **State Management:** React Context + useReducer (DataStore)
- **Animation:** Framer Motion 12.4.10
- **Icons:** Lucide React 0.476.0
- **Notifications:** React Hot Toast 2.4.1

---

## Directory Structure

```
/NESTEGG_PROD/
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # FastAPI app entry (100+ endpoints)
│   ├── scheduler.py                  # Background job scheduling
│   ├── core_db.py                    # Database connection & schema
│   ├── auth_clerk.py                 # Clerk authentication
│   ├── webhooks_clerk.py             # Clerk webhook handlers
│   ├── requirements.txt              # Python dependencies
│   ├── api_clients/                  # External financial data providers
│   │   ├── market_data_manager.py    # Data source abstraction layer
│   │   ├── polygon_client.py         # Polygon API client
│   │   ├── yahoo_finance_client.py   # Yahoo Finance client
│   │   └── alphavantage_client.py    # Alpha Vantage client
│   ├── services/                     # Core business logic
│   │   ├── price_updater_v2.py       # Security price updates
│   │   ├── portfolio_calculator.py   # Portfolio calculations
│   │   └── data_consistency_monitor.py
│   └── utils/                        # Utility functions
│       ├── common.py                 # Rate limiting, retries, events
│       ├── constants.py              # Institution lists, account types
│       └── redis_cache.py            # Caching layer
│
├── frontend/                         # Next.js React frontend
│   ├── pages/                        # Page components
│   │   ├── index.js                  # Landing page
│   │   ├── portfolio.js              # Main portfolio dashboard
│   │   ├── command-center.js         # Advanced data dashboard
│   │   ├── admin.js                  # Admin panel
│   │   ├── accounts.js               # Account management
│   │   ├── positions.js              # Position tracking
│   │   ├── liabilities.js            # Debt tracking
│   │   ├── reports.js                # Reporting & analytics
│   │   ├── profile.js                # User profile
│   │   ├── planning.js               # Financial planning
│   │   └── datastoreview.js          # Data inspection UI
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── charts/                   # Chart components
│   │   ├── modals/                   # Modal dialogs
│   │   ├── tables/                   # Table components
│   │   ├── ui/                       # Basic UI components
│   │   ├── sidebar.js                # Navigation sidebar
│   │   └── navbar.js                 # Top navigation bar
│   │
│   ├── store/                        # State management
│   │   ├── DataStore.js              # Central data store
│   │   └── hooks/                    # Custom data hooks
│   │       ├── usePortfolioSummary.js
│   │       ├── useAccountPositions.js
│   │       ├── useGroupedPositions.js
│   │       ├── useDetailedPositions.js
│   │       ├── useAccountsSummaryPositions.js
│   │       ├── useGroupedLiabilities.js
│   │       └── useDataMutations.js
│   │
│   ├── context/                      # React context providers
│   │   ├── AuthContext.js            # Authentication state
│   │   ├── UpdateCheckContext.js     # Data update checking
│   │   └── EggMascotContext.js       # Mascot state
│   │
│   ├── utils/                        # Frontend utilities
│   │   ├── api.js                    # API client with auth
│   │   ├── formatters.js             # Number/date formatting
│   │   └── apimethods/               # API method wrappers
│   │
│   ├── package.json                  # Frontend dependencies
│   ├── next.config.mjs               # Next.js configuration
│   ├── tailwind.config.mjs           # Tailwind configuration
│   └── jsconfig.json                 # Path aliases (@/)
│
└── render.yml                        # Render.com deployment config
```

---

## Development Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Required Environment Variables:**
```
DATABASE_URL          # PostgreSQL connection string
SECRET_KEY            # JWT signing key
POLYGON_API_KEY       # Stock market data API key
REDIS_HOST            # Redis cache server
REDIS_PORT            # Redis port
REDIS_DB              # Redis database number
REDIS_ENABLED         # Enable/disable caching (true/false)
CLERK_JWKS_URL        # Clerk JWKS endpoint
CLERK_ISSUER          # Clerk issuer URL
CLERK_SECRET_KEY      # Clerk admin API key
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

**Required Environment Variables:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Clerk public key
NEXT_PUBLIC_API_URL                 # Backend API URL
```

### Running the Scheduler (Background Jobs)

```bash
cd backend
python scheduler.py
```

---

## Code Conventions

### Python (Backend)

- **Style:** PEP 8 compliant
- **Type Hints:** Use throughout (Optional, List, Dict, Any)
- **Naming:**
  - Functions: `snake_case`
  - Classes: `PascalCase`
  - Constants: `SCREAMING_SNAKE_CASE`
- **Async:** Use `async/await` for all I/O operations
- **Database:** Parameterized queries with `text()` from SQLAlchemy
- **Logging:** Python logging module with module-specific loggers
- **Error Handling:** Specific exception handling with proper HTTP status codes

### JavaScript/React (Frontend)

- **Components:** Functional components with hooks
- **Naming:**
  - Functions/hooks: `camelCase`
  - Components: `PascalCase`
  - Constants: `SCREAMING_SNAKE_CASE`
- **Styling:** Tailwind CSS utility classes (no separate CSS files)
- **Icons:** Lucide React exclusively
- **State:** Use DataStore hooks for global state
- **API Calls:** Use `fetchWithAuth` from `utils/api.js`
- **Formatting:** Use formatters from `utils/formatters.js`:
  - `formatCurrency(value)`
  - `formatPercentage(value)`
  - `formatDate(date)`
- **Notifications:** React Hot Toast for user feedback

### UI/UX Design Principles
- **Hierarchy:** Clear visual importance through size, color, spacing
- **Contrast:** Sufficient distinction between elements
- **Balance:** Harmonious layout distribution
- **Movement:** Purposeful animations that enhance without overwhelming

### Import Order

1. External libraries (react, next, etc.)
2. Local utilities
3. Components
4. Types/constants

---

## State Management

### DataStore Pattern

The application uses a central DataStore (`frontend/store/DataStore.js`) with:

- **Provider:** `DataStoreProvider` wraps the app
- **Hook:** `useDataStore()` for accessing state
- **Actions:** Dispatch actions to modify state
- **Staleness Tracking:** Automatic cache invalidation

### Custom Hooks

Use domain-specific hooks from `store/hooks/`:

```javascript
// Portfolio data
const { summary, loading, error, refetch } = usePortfolioSummary();

// Account positions
const { positions, loading } = useAccountPositions(accountId);

// Grouped positions by symbol
const { groupedPositions, loading } = useGroupedPositions();

// Detailed positions
const { detailedPositions, loading } = useDetailedPositions();

// Liabilities
const { groupedLiabilities, loading } = useGroupedLiabilities();

// Data mutations
const { updatePosition, deletePosition } = useDataMutations();
```

---

## DataStore Field Library

Complete reference of every field available in the NestEgg DataStore. Use search to find fields by name, type, or description.

### Portfolio Summary Fields

#### Core Financial Metrics

| Field | Type | Path | Description |
|-------|------|------|-------------|
| net_worth | number | `summary.netWorth` | Total net worth (assets - liabilities) |
| total_assets | number | `summary.totalAssets` | Sum of all assets |
| total_liabilities | number | `summary.totalLiabilities` | Sum of all debts |
| liquid_assets | number | `summary.liquidAssets` | Securities + crypto + metals + cash |
| other_assets | number | `summary.otherAssets` | Real estate + vehicles + other illiquid |
| total_cost_basis | number | `summary.totalCostBasis` | Total amount invested |
| liquid_cost_basis | number | `summary.liquidCostBasis` | Cost basis of liquid assets |
| other_assets_cost_basis | number | `summary.otherAssetsCostBasis` | Cost basis of illiquid assets |
| total_unrealized_gain | number | `summary.unrealizedGain` | Total gain/loss $ |
| total_unrealized_gain_percent | number | `summary.unrealizedGainPercent` | Total gain/loss % |
| liquid_unrealized_gain | number | `summary.liquidUnrealizedGain` | Liquid assets gain/loss $ |
| liquid_unrealized_gain_percent | number | `summary.liquidUnrealizedGainPercent` | Liquid assets gain/loss % |

#### Asset Class Breakdown

| Field | Type | Path | Description |
|-------|------|------|-------------|
| security_value | number | `summary.assetAllocation.securities.value` | Total stocks/ETFs value |
| security_mix | number | `summary.assetAllocation.securities.percentage` | % of portfolio in securities |
| security_cost_basis | number | `summary.assetAllocation.securities.costBasis` | Amount invested in securities |
| security_gain_loss | number | `summary.assetAllocation.securities.gainLoss` | Securities profit/loss $ |
| security_gain_loss_percent | number | `summary.assetAllocation.securities.gainLossPercent` | Securities profit/loss % |
| security_count | number | `summary.assetAllocation.securities.count` | Number of security positions |
| security_annual_income | number | `summary.assetAllocation.securities.annualIncome` | Annual dividend income |
| cash_value | number | `summary.assetAllocation.cash.value` | Total cash holdings |
| cash_mix | number | `summary.assetAllocation.cash.percentage` | % of portfolio in cash |
| crypto_value | number | `summary.assetAllocation.crypto.value` | Total cryptocurrency value |
| crypto_mix | number | `summary.assetAllocation.crypto.percentage` | % of portfolio in crypto |
| metal_value | number | `summary.assetAllocation.metals.value` | Total precious metals value |
| metal_mix | number | `summary.assetAllocation.metals.percentage` | % of portfolio in metals |
| real_estate_value | number | `summary.assetAllocation.realEstate.value` | Total real estate value |
| real_estate_mix | number | `summary.assetAllocation.realEstate.percentage` | % of portfolio in real estate |

#### Liability Breakdown

| Field | Type | Path | Description |
|-------|------|------|-------------|
| credit_card_liabilities | number | `summary.liabilities.creditCard` | Total credit card debt |
| mortgage_liabilities | number | `summary.liabilities.mortgage` | Total mortgage balance |
| loan_liabilities | number | `summary.liabilities.loan` | Total loan balances |
| other_liabilities_value | number | `summary.liabilities.other` | Other debt types |
| liability_count | number | `summary.liabilities.counts.total` | Total number of liabilities |
| credit_card_count | number | `summary.liabilities.counts.creditCard` | Number of credit cards |
| mortgage_count | number | `summary.liabilities.counts.mortgage` | Number of mortgages |
| loan_count | number | `summary.liabilities.counts.loan` | Number of loans |

#### Period Performance

Periods: 1d, 1w, 1m, 3m, ytd, 1y, 2y, 3y

| Field Pattern | Type | Path Pattern | Description |
|---------------|------|--------------|-------------|
| net_worth_[period]_change | number | `summary.periodChanges['[period]'].netWorth` | Net worth $ change |
| net_worth_[period]_change_pct | number | `summary.periodChanges['[period]'].netWorthPercent` | Net worth % change |
| total_assets_[period]_change | number | `summary.periodChanges['[period]'].totalAssets` | Assets $ change |
| liquid_assets_[period]_change | number | `summary.periodChanges['[period]'].liquidAssets` | Liquid $ change |
| total_liabilities_[period]_change | number | `summary.periodChanges['[period]'].totalLiabilities` | Debt $ change |

#### Alternative Net Worth Components

| Field | Type | Path | Description |
|-------|------|------|-------------|
| alt_net_worth_value_real_estate | number | `summary.altNetWorth.realEstate` | Real estate component |
| alt_net_worth_net_cash_value | number | `summary.altNetWorth.netCash` | Net cash position |
| alt_net_worth_net_other_assets | number | `summary.altNetWorth.netOtherAssets` | Net other assets |
| alt_liquid_net_worth | number | `summary.altLiquidNetWorth` | Liquid net worth |
| alt_retirement_assets | number | `summary.altRetirementAssets` | Retirement accounts |
| alt_illiquid_net_worth | number | `summary.altIlliquidNetWorth` | Illiquid net worth |

### Account Fields (useAccounts)

| Field | Type | Path | Description |
|-------|------|------|-------------|
| id | number | `accounts[i].id` | Account ID |
| name | string | `accounts[i].name` | Account name |
| institution | string | `accounts[i].institution` | Bank/broker name |
| account_type | string | `accounts[i].accountType` | Type (e.g., 'brokerage') |
| account_subtype | string | `accounts[i].accountSubtype` | Subtype (e.g., 'taxable') |
| current_value | number | `accounts[i].totalValue` | Total account value |
| liquid_value | number | `accounts[i].liquidValue` | Liquid portion |
| illiquid_value | number | `accounts[i].illiquidValue` | Illiquid portion |
| total_cost_basis | number | `accounts[i].costBasis` | Total invested |
| unrealized_gain | number | `accounts[i].unrealizedGain` | Profit/loss $ |
| unrealized_gain_percent | number | `accounts[i].unrealizedGainPercent` | Profit/loss % |
| value_1d_change | number | `accounts[i].value1dChange` | 1-day $ change |
| value_1d_change_pct | number | `accounts[i].value1dChangePct` | 1-day % change |
| allocation_percent | number | `accounts[i].allocationPercent` | % of total portfolio |
| yield_percent | number | `accounts[i].yieldPercent` | Annual yield % |
| dividend_income_annual | number | `accounts[i].dividendIncomeAnnual` | Annual dividends |
| security_count | number | `accounts[i].securityCount` | # of securities |
| crypto_count | number | `accounts[i].cryptoCount` | # of cryptocurrencies |
| cash_count | number | `accounts[i].cashCount` | # of cash positions |

### Position Fields (useGroupedPositions)

| Field | Type | Path | Description |
|-------|------|------|-------------|
| identifier | string | `positions[i].identifier` | Ticker/symbol |
| name | string | `positions[i].name` | Full security name |
| asset_type | string | `positions[i].asset_type` | security/crypto/cash/metal |
| total_quantity | number | `positions[i].total_quantity` | Total shares/units |
| account_count | number | `positions[i].account_count` | # of accounts holding |
| avg_purchase_price | number | `positions[i].avg_purchase_price` | Average cost/share |
| latest_price_per_unit | number | `positions[i].current_price` | Current market price |
| total_current_value | number | `positions[i].total_current_value` | Total position value |
| total_cost_basis | number | `positions[i].total_cost_basis` | Total invested |
| total_gain_loss | number | `positions[i].total_gain_loss` | Profit/loss $ |
| total_gain_loss_pct | number | `positions[i].total_gain_loss_pct` | Profit/loss % |
| predominant_holding_term | string | `positions[i].predominant_holding_term` | 'long_term'/'short_term' |
| long_term_value | number | `positions[i].long_term_value` | Long-term cap gains value |
| short_term_value | number | `positions[i].short_term_value` | Short-term cap gains value |
| portfolio_allocation_pct | number | `positions[i].allocation_percent` | % of portfolio |
| value_1d_change | number | `positions[i].value_1d_change` | 1-day $ change |
| value_1d_change_pct | number | `positions[i].value_1d_change_pct` | 1-day % change |
| annual_income | number | `positions[i].annual_income` | Annual dividends |
| yield_percent | number | `positions[i].yield_percent` | Dividend yield % |
| ex_dividend_date | string | `positions[i].ex_dividend_date` | Next ex-dividend date |
| sector | string | `positions[i].sector` | Market sector |
| industry | string | `positions[i].industry` | Industry classification |
| pe_ratio | number | `positions[i].pe_ratio` | Price/earnings ratio |
| market_cap | number | `positions[i].market_cap` | Market capitalization |

### Liability Fields (useGroupedLiabilities)

| Field | Type | Path | Description |
|-------|------|------|-------------|
| identifier | string | `liabilities[i].identifier` | Unique ID |
| name | string | `liabilities[i].name` | Liability name |
| liability_type | string | `liabilities[i].liability_type` | credit_card/mortgage/loan |
| institution | string | `liabilities[i].institution` | Lender name |
| liability_count | number | `liabilities[i].account_count` | # of accounts |
| total_current_balance | number | `liabilities[i].total_current_balance` | Current balance |
| total_original_amount | number | `liabilities[i].total_original_balance` | Original amount |
| total_paid_down | number | `liabilities[i].total_paid_down` | Amount paid off |
| paydown_percentage | number | `liabilities[i].paydown_percentage` | % paid off |
| weighted_avg_interest_rate | number | `liabilities[i].weighted_avg_interest_rate` | Average APR |
| max_interest_rate | number | `liabilities[i].max_interest_rate` | Highest APR |
| min_interest_rate | number | `liabilities[i].min_interest_rate` | Lowest APR |
| estimated_annual_interest | number | `liabilities[i].annual_interest` | Interest cost/year |
| total_credit_limit | number | `liabilities[i].total_credit_limit` | Credit limit (cards) |
| credit_utilization_pct | number | `liabilities[i].credit_utilization_pct` | % of credit used |
| debt_allocation_pct | number | `liabilities[i].debt_allocation_pct` | % of total debt |

### Historical/Trend Fields (usePortfolioTrends)

| Field | Type | Path | Description |
|-------|------|------|-------------|
| date | string | `trends.chartData[i].date` | Snapshot date |
| netWorth | number | `trends.chartData[i].netWorth` | Net worth on date |
| totalAssets | number | `trends.chartData[i].totalAssets` | Assets on date |
| totalLiabilities | number | `trends.chartData[i].totalLiabilities` | Liabilities on date |
| liquidAssets | number | `trends.chartData[i].liquidAssets` | Liquid assets on date |
| unrealizedGain | number | `trends.chartData[i].unrealizedGain` | Gain/loss on date |
| unrealizedGainPercent | number | `trends.chartData[i].unrealizedGainPercent` | Gain/loss % on date |
| netCashPosition | number | `trends.chartData[i].netCashPosition` | Cash position on date |
| altLiquidNetWorth | number | `trends.chartData[i].altLiquidNetWorth` | Alt liquid NW on date |
| altRetirementAssets | number | `trends.chartData[i].altRetirementAssets` | Retirement on date |
| altIlliquidNetWorth | number | `trends.chartData[i].altIlliquidNetWorth` | Illiquid NW on date |

### Rich JSON Fields (usePortfolioSummary)

| Field | Type | Description |
|-------|------|-------------|
| topPositions | array | Top liquid holdings by value |
| topPerformersAmount | array | Top gainers by $ |
| topPerformersPercent | array | Top gainers by % |
| accountDiversification | object | Account allocation |
| sectorAllocation | object | Sector breakdown |
| institutionAllocation | array | Institution breakdown |
| concentrationMetrics | object | Concentration analysis |
| riskMetrics | object | Risk measurements |
| dividendMetrics | object | Dividend analysis |
| taxEfficiencyMetrics | object | Tax efficiency data |

### Field Naming Conventions

- **Database**: Fields use `snake_case`
- **Hooks**: Fields use `camelCase`
- **Percentages**: Suffixed with `_pct` or `Percent`
- **Changes**: Format is `[metric]_[period]_change`
- **Dates**: Strings in 'YYYY-MM-DD' format
- **Money**: All monetary values are numbers (floats)

### Usage Examples

```javascript
// Get net worth
const { summary } = usePortfolioSummary();
const netWorth = summary?.netWorth || 0;

// Get all positions
const { positions } = useGroupedPositions();
positions.forEach(p => console.log(p.identifier, p.total_current_value));

// Get account list
const { accounts } = useAccounts();
const totalValue = accounts.reduce((sum, a) => sum + a.currentValue, 0);

// Get 1-month change
const monthChange = summary?.periodChanges?.['1m']?.netWorth || 0;
```

---

## API Patterns

### Authentication

All API requests require a Bearer token:
```javascript
const response = await fetchWithAuth('/api/endpoint', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
```

### Key Endpoints

**User Management:**
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `POST /signup` - Create new user
- `POST /token` - Get auth token

**Accounts:**
- `GET /accounts` - List all accounts
- `GET /accounts/all/detailed` - Accounts with positions
- `POST /accounts` - Create account
- `PUT /accounts/{id}` - Update account
- `DELETE /accounts/{id}` - Delete account

**Positions:**
- `GET /positions/unified` - All positions unified
- `GET /positions/{account_id}` - Positions for account
- `POST /positions/{account_id}` - Create position
- `PUT /positions/{id}` - Update position
- `DELETE /positions/{id}` - Delete position

**Market Data:**
- `POST /market/update-all-securities-prices` - Update all prices
- `POST /market/update-all-securities-metrics` - Update company metrics
- `GET /market/security-statistics` - Get security stats

**Portfolio:**
- `GET /portfolio/net_worth_summary` - Net worth breakdown
- `GET /portfolio/snapshots` - Historical snapshots
- `GET /datastore/positions/detail` - Detailed position data
- `GET /datastore/accounts/summary` - Account summaries

**System:**
- `GET /system/warmup` - Warm up caches
- `GET /system/events` - Get system events

---

## Database Schema

### Primary Tables

- **users** - User accounts with Clerk integration
- **accounts** - Financial accounts (brokerage, bank, etc.)
- **positions** - Security positions (stocks, bonds, ETFs)
- **cash_accounts** - Cash holdings
- **crypto_holdings** - Cryptocurrency positions
- **metals_holdings** - Precious metals
- **real_estate_properties** - Real estate assets
- **liabilities** - Debts and loans
- **portfolio_snapshots** - Historical net worth snapshots
- **securities** - Market data cache
- **system_events** - Event monitoring log

---

## Common Development Tasks

**Before starting any task:** Review `/TODO.md` to check for related tasks or known issues. Update the TODO list as you complete work or discover new items.

### Adding a New API Endpoint

1. Add route in `backend/main.py`:
```python
@app.get("/your-endpoint")
async def your_endpoint(user_id: int = Depends(get_current_user_id)):
    # Implementation
    return {"data": result}
```

2. Add API method in `frontend/utils/apimethods/`:
```javascript
export const yourMethod = async () => {
  return fetchWithAuth('/your-endpoint');
};
```

### Adding a New Page

1. Create file in `frontend/pages/yourpage.js`
2. Use existing layout patterns (sidebar, navbar)
3. Import from DataStore hooks for data
4. Use Tailwind for styling

### Adding a New Component

1. Create in appropriate `frontend/components/` subdirectory
2. Use Lucide icons
3. Use Tailwind CSS classes
4. Export as default

### Adding a New DataStore Hook

1. Create in `frontend/store/hooks/`
2. Use the pattern from existing hooks
3. Connect to DataStore context
4. Handle loading, error, and data states

---

## Background Jobs (Scheduler)

The scheduler (`backend/scheduler.py`) runs these tasks:

1. **Price Updates** - Every N minutes (configurable)
2. **Metrics Updates** - Daily at configured time
3. **Historical Data** - Daily at configured time
4. **Portfolio Snapshots** - Daily at configured time

Jobs only run during US market hours (ET timezone).

---

## Deployment

### Frontend (Vercel)

- Automatic deployment on push to main
- Config in `frontend/vercel.json`

### Backend (Render.com)

- Config in `render.yml`
- Two services:
  1. **nestegg-api** - FastAPI web service
  2. **nestegg-scheduler** - Background worker

---

## Testing

Currently no formal testing framework. Test pages exist for Clerk integration:
- `frontend/pages/test-clerk-*.js`

**Recommended for future:**
- Backend: pytest, pytest-asyncio
- Frontend: Jest, React Testing Library
- E2E: Playwright

---

## Key Files by Size/Importance

| File | Lines | Purpose |
|------|-------|---------|
| `backend/main.py` | ~9,500 | All API endpoints |
| `frontend/pages/command-center.js` | ~2,800 | Advanced dashboard |
| `frontend/components/modals/AddQuickPositionModal.js` | Large | Complex position entry |
| `frontend/store/DataStore.js` | Large | Global state management |
| `backend/services/price_updater_v2.py` | Large | Price update logic |

---

## Git Workflow

- **Branch naming:** `claude/[feature-name]-[identifier]`
- **Commit messages:** Clear, descriptive, imperative mood
- **Push:** Always use `git push -u origin <branch-name>`

---

## Security Considerations

- Clerk handles authentication (never store passwords)
- Parameterized SQL queries (prevent injection)
- CORS configured for allowed origins
- JWT tokens for API access
- Rate limiting on external API calls

---

## Performance Patterns

- Redis caching for frequently accessed data
- Async/await for I/O operations
- Automatic staleness tracking in DataStore
- Statement caching disabled for PgBouncer compatibility

---

## Troubleshooting

### Common Issues

1. **Database connection errors:** Check `DATABASE_URL`
2. **Auth failures:** Verify Clerk environment variables
3. **Market data not updating:** Check API keys (Polygon, Yahoo)
4. **Redis errors:** Ensure Redis server is running or disable with `REDIS_ENABLED=false`

### Logs

- Backend: Python logging to console
- Scheduler: Separate logger for job status
- Frontend: Browser console

---

## External Documentation

- **DataStore Field Library:** https://www.notion.so/NestEgg-DataStore-Field-Library-2426699fc7038146a984d3fee7386d2e
- **Project Overview:** https://www.notion.so/NestEgg-Overview-2426699fc7038129835fff6e56ef85a9

---

## Additional Notes

- Dark theme by default (Tailwind + Clerk customization)
- Animated EggMascot component for UX
- System events track all data mutations
- No credential sharing required - manual entry model for privacy
