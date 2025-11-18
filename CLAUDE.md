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

## Additional Notes

- Dark theme by default (Tailwind + Clerk customization)
- Animated EggMascot component for UX
- System events track all data mutations
- No credential sharing required - manual entry model for privacy
