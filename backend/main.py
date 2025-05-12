# Standard library imports
import json
import logging
import math
import os
import sys
import asyncio
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Any
from datetime import date
from typing import Dict, Optional
from uuid import UUID

# Third-party imports
import bcrypt
import databases
import jwt
import statistics
import sqlalchemy
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import select
from sqlalchemy import func, case, literal_column
from sqlalchemy.sql import select, join, text # Ensure text is imported
from sqlalchemy import Table, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, MetaData, select

# Load environment variables first
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Get environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is not set in the environment!")

# Add the project root directory to Python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

# Local application imports
from backend.services.price_updater_v2 import PriceUpdaterV2
from backend.services.data_consistency_monitor import DataConsistencyMonitor
from backend.services.portfolio_calculator import PortfolioCalculator
from backend.utils.common import record_system_event, update_system_event
from backend.api_clients.market_data_manager import MarketDataManager
from backend.api_clients.yahoo_data import Yahoo_Data
from backend.api_clients.yahoo_finance_client import YahooFinanceClient
from backend.api_clients.yahooquery_client import YahooQueryClient
from backend.api_clients.direct_yahoo_client import DirectYahooFinanceClient

# Initialize Database Connection
database = databases.Database(
    DATABASE_URL,
    statement_cache_size=0  # Disable statement caching for PgBouncer compatibility
)

metadata = sqlalchemy.MetaData()

# Set up logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define Users Table
users = sqlalchemy.Table(
    "users",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("email", sqlalchemy.String, unique=True, nullable=False),
    sqlalchemy.Column("password_hash", sqlalchemy.String, nullable=False),
)

# Define Accounts Table
accounts = sqlalchemy.Table(
    "accounts",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("user_id", sqlalchemy.String, sqlalchemy.ForeignKey("users.id"), nullable=False),
    sqlalchemy.Column("account_name", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("institution", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("type", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("account_category", sqlalchemy.String, nullable=True),
)

# Define Positions Tables
positions = sqlalchemy.Table(
    "positions",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("account_id", sqlalchemy.Integer, sqlalchemy.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("ticker", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("shares", sqlalchemy.Float, nullable=False),
    sqlalchemy.Column("price", sqlalchemy.Float, nullable=False),
    sqlalchemy.Column("cost_basis", sqlalchemy.Float, nullable=True),
    sqlalchemy.Column("purchase_date", sqlalchemy.Date, nullable=True),
    sqlalchemy.Column("date", sqlalchemy.DateTime, default=datetime.utcnow),
)

crypto_positions = sqlalchemy.Table(
    "crypto_positions", # <-- VERIFY TABLE NAME
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("account_id", sqlalchemy.Integer, sqlalchemy.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
    # --- Add ALL columns from your crypto_positions table below ---
    sqlalchemy.Column("coin_type", sqlalchemy.String),
    sqlalchemy.Column("coin_symbol", sqlalchemy.String),
    sqlalchemy.Column("quantity", sqlalchemy.Float),
    sqlalchemy.Column("purchase_price", sqlalchemy.Float),
    sqlalchemy.Column("purchase_date", sqlalchemy.Date),
    sqlalchemy.Column("storage_type", sqlalchemy.String),
    sqlalchemy.Column("notes", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("tags", sqlalchemy.ARRAY(sqlalchemy.String), nullable=True), # Adjust type if using JSON
    sqlalchemy.Column("is_favorite", sqlalchemy.Boolean, default=False),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
    # --- End columns ---
)

metal_positions = sqlalchemy.Table(
    "metal_positions", # <-- VERIFY TABLE NAME
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("account_id", sqlalchemy.Integer, sqlalchemy.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
    # --- Add ALL columns from your metal_positions table below ---
    sqlalchemy.Column("metal_type", sqlalchemy.String),
    sqlalchemy.Column("quantity", sqlalchemy.Float),
    sqlalchemy.Column("unit", sqlalchemy.String),
    sqlalchemy.Column("purity", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("purchase_price", sqlalchemy.Float),
    sqlalchemy.Column("cost_basis", sqlalchemy.Float, nullable=True),
    sqlalchemy.Column("purchase_date", sqlalchemy.Date),
    sqlalchemy.Column("storage_location", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("description", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
    # --- End columns ---
)

real_estate_positions = sqlalchemy.Table(
    "real_estate_positions", # <-- VERIFY TABLE NAME
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("account_id", sqlalchemy.Integer, sqlalchemy.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
    # --- Add ALL columns from your real_estate_positions table below ---
    sqlalchemy.Column("address", sqlalchemy.String),
    sqlalchemy.Column("property_type", sqlalchemy.String),
    sqlalchemy.Column("purchase_price", sqlalchemy.Float),
    sqlalchemy.Column("estimated_value", sqlalchemy.Float, nullable=True),
    sqlalchemy.Column("purchase_date", sqlalchemy.Date),
    # Add other relevant columns...
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
    # --- End columns ---
)

account_reconciliations = Table(
    "account_reconciliations",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("account_id", Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
    Column("user_id", String, ForeignKey("users.id"), nullable=False),
    Column("reconciliation_date", DateTime, default=datetime.utcnow),
    Column("app_balance", Float),
    Column("actual_balance", Float),
    Column("variance", Float),
    Column("variance_percent", Float),
    Column("is_reconciled", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow),
)

position_reconciliations = Table(
    "position_reconciliations",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("account_reconciliation_id", Integer, ForeignKey("account_reconciliations.id", ondelete="CASCADE"), nullable=False),
    Column("position_id", Integer, nullable=False),
    Column("asset_type", String, nullable=False),
    Column("app_quantity", Float),
    Column("app_value", Float),
    Column("actual_quantity", Float),
    Column("actual_value", Float),
    Column("quantity_variance", Float),
    Column("quantity_variance_percent", Float),
    Column("value_variance", Float),
    Column("value_variance_percent", Float),
    Column("is_quantity_reconciled", Boolean, default=False),
    Column("is_value_reconciled", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow),
)

# Create Database Engine
engine = sqlalchemy.create_engine(DATABASE_URL)
metadata.create_all(engine)


# Initialize FastAPI App
app = FastAPI(title="NestEgg API", description="Investment portfolio tracking API")

# List of allowed origins
allowed_origins = [
    "https://nestegg-prod-dihp4pwlw-dft5014s-projects.vercel.app",  # Actual deployed domain
    "https://nestegg-prod.vercel.app",  # Optional if you want to allow your production domain root
    "http://localhost:3000",            # React's default local development port
    "http://127.0.0.1:3000",            # Alternative localhost address
]

# Enable CORS (Allow Frontend to Connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Password Hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Generation
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Dependency to get the current user
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = await database.fetch_one(users.select().where(users.c.email == payload.get("sub")))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ----- PYDANTIC MODELS  -----
# ----- THESE ARE USED IN VARIOUS API CALLS  -----

class PositionReconciliationData(BaseModel):
    position_id: int
    asset_type: str
    app_quantity: float
    app_value: float
    actual_quantity: float
    actual_value: float
    is_quantity_reconciled: bool
    is_value_reconciled: bool

class AccountLevelReconciliation(BaseModel):
    app_balance: float
    actual_balance: float
    variance: float
    variance_percent: float
    is_reconciled: bool

class ReconciliationRequest(BaseModel):
    account_id: int
    reconciliation_date: datetime
    account_level: AccountLevelReconciliation
    positions: List[PositionReconciliationData]

class UserSignup(BaseModel):
    email: str
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UpdateLockRequest(BaseModel):
    update_type: str

class ReleaseLockRequest(BaseModel):
    update_type: str
    success: bool
    details: Optional[dict] = None
    history_id: Optional[str] = None

class UpdateThresholds(BaseModel):
    price_updates: int
    metrics_updates: int
    history_updates: int
    portfolio_snapshots: int

class AccountCreate(BaseModel):
    account_name: str
    institution: Optional[str] = None
    type: Optional[str] = None
    account_category: str


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    institution: Optional[str] = None
    type: Optional[str] = None
    account_category: Optional[str] = None

class PositionBasicInfo(BaseModel):
    id: int
    asset_type: str # 'security', 'crypto', 'metal', 'real_estate'
    ticker_or_name: str # Ticker for securities, name/type for others
    quantity_or_shares: Optional[float] = None
    value: Optional[float] = None
    cost_basis_total: Optional[float] = None # Total cost for this position entry
    gain_loss_amount: Optional[float] = None
    gain_loss_percent: Optional[float] = None

# Detailed Account information including calculated metrics and positions
class AccountDetail(BaseModel):
    id: int
    user_id: str
    account_name: str
    institution: Optional[str] = None
    type: Optional[str] = None
    balance: float = 0.0 # This might represent cash balance or total calculated value depending on usage
    cash_balance: float = 0.0 
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Calculated Fields
    total_value: float = 0.0
    total_cost_basis: float = 0.0
    total_gain_loss: float = 0.0
    total_gain_loss_percent: float = 0.0
    positions_count: int = 0
    # Nested positions for modal drill-down
    positions: List[PositionBasicInfo] = [] # List of basic position info

class AccountsDetailedResponse(BaseModel):
    accounts: List[AccountDetail]

class PositionCreate(BaseModel):
    ticker: str
    shares: float
    price: float
    cost_basis: float
    purchase_date: str  # Format: YYYY-MM-DD

class SecuritySearch(BaseModel):
    query: str

class SecurityCreate(BaseModel):
    ticker: str

class SecurityUpdate(BaseModel):
    update_type: str  # Can be 'metrics', 'current_price', or 'history'
    days: Optional[int] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    subscription_plan: str = "basic"
    notification_preferences: Dict[str, bool] = {
        "emailUpdates": True,
        "marketAlerts": True,
        "performanceReports": True,
        "securityAlerts": True,
        "newsletterUpdates": False
    }
    is_admin: bool = False

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    emailUpdates: bool = True
    marketAlerts: bool = True
    performanceReports: bool = True
    securityAlerts: bool = True
    newsletterUpdates: bool = False

# Crypto Models
class CryptoPositionCreate(BaseModel):
    coin_type: str
    coin_symbol: str
    quantity: float
    purchase_price: float
    current_price: float
    purchase_date: str  # Format: YYYY-MM-DD
    storage_type: str = "Exchange"  # Default to Exchange
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: bool = False

class CryptoPositionUpdate(BaseModel):
    coin_type: Optional[str] = None
    coin_symbol: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    current_price: Optional[float] = None
    purchase_date: Optional[str] = None
    storage_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None

# Metals Models
class MetalPositionCreate(BaseModel):
    metal_type: str
    quantity: float
    unit: str = "oz"  # Default to troy ounces
    purity: Optional[str] = "999"  # Default to 999 (24K)
    purchase_price: float
    cost_basis: Optional[float] = None
    purchase_date: str  # Format: YYYY-MM-DD
    storage_location: Optional[str] = None
    description: Optional[str] = None

class MetalPositionUpdate(BaseModel):
    metal_type: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purity: Optional[str] = None
    purchase_price: Optional[float] = None
    cost_basis: Optional[float] = None
    purchase_date: Optional[str] = None
    storage_location: Optional[str] = None
    description: Optional[str] = None

class PositionDetail(BaseModel):
    id: int
    account_id: int
    ticker: str
    shares: float
    price: float
    cost_basis: Optional[float] = None
    purchase_date: Optional[date] = None
    date: Optional[datetime] = None # Timestamp of last update from DB
    account_name: str
    value: float # Calculated field
    # Optional: Add other fields you might want from securities table via JOIN
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    
class PositionsDetailedResponse(BaseModel):
    positions: List[PositionDetail]

class CryptoPositionDetail(BaseModel):
    id: int
    account_id: int
    coin_type: Optional[str] = None
    coin_symbol: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    current_price: Optional[float] = None
    purchase_date: Optional[date] = None
    storage_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None # Assuming stored as array/list
    is_favorite: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Added fields
    account_name: str
    total_value: float # Calculated field
    gain_loss: Optional[float] = None # Calculated field
    gain_loss_percent: Optional[float] = None # Calculated field

class CryptoPositionsDetailedResponse(BaseModel):
    crypto_positions: List[CryptoPositionDetail]

class MetalPositionDetail(BaseModel):
    id: int
    account_id: int
    metal_type: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purity: Optional[str] = None
    purchase_price: Optional[float] = None # Price per unit at purchase
    cost_basis: Optional[float] = None # Cost per unit at purchase (might be same as purchase_price)
    purchase_date: Optional[date] = None
    storage_location: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Added fields
    account_name: str
    total_value: Optional[float] = None # Calculated field
    gain_loss: Optional[float] = None # Calculated field
    gain_loss_percent: Optional[float] = None # Calculated field

class MetalPositionsDetailedResponse(BaseModel):
    metal_positions: List[MetalPositionDetail]

class RealEstatePositionCreate(BaseModel):
    account_id: int
    property_name: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    property_type: str  # residential, commercial, industrial, land, etc.
    purchase_price: float
    current_value: float
    purchase_date: Optional[str] = None  # Format: YYYY-MM-DD
    square_footage: Optional[int] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    lot_size_sqft: Optional[int] = None
    year_built: Optional[int] = None
    property_taxes: Optional[float] = None
    zillow_id: Optional[str] = None
    last_zestimate_date: Optional[str] = None
    notes: Optional[str] = None

class RealEstatePositionUpdate(BaseModel):
    property_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    property_type: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    purchase_date: Optional[str] = None
    square_footage: Optional[int] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    lot_size_sqft: Optional[int] = None
    year_built: Optional[int] = None
    property_taxes: Optional[float] = None
    zillow_id: Optional[str] = None
    last_zestimate_date: Optional[str] = None
    notes: Optional[str] = None

class PortfolioAssetSummary(BaseModel):
    asset_type: str
    total_value: float
    total_cost_basis: float
    count: int

class PortfolioSummaryAllResponse(BaseModel):
    total_value: float
    total_cost_basis: float
    total_gain_loss: float
    total_gain_loss_percent: float
    total_positions: int
    total_accounts: int # Or maybe filter for accounts with these asset types
    breakdown: Optional[List[PortfolioAssetSummary]] = None # Optional breakdown by asset

# FX Prices Models
class FXAssetCreate(BaseModel):
    symbol: str
    asset_type: str  # "crypto", "metal", or "currency"
    name: str

class FXAssetUpdate(BaseModel):
    active: Optional[bool] = None
    name: Optional[str] = None

# Model for Detailed Crypto Position
class CryptoPositionDetail(BaseModel):
    id: int
    account_id: int
    coin_type: Optional[str] = None
    coin_symbol: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    current_price: Optional[float] = None
    purchase_date: Optional[date] = None
    storage_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None # Assuming stored as array/list
    is_favorite: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    account_name: str
    total_value: float
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None

class CryptoPositionsDetailedResponse(BaseModel):
    crypto_positions: List[CryptoPositionDetail]

# Model for Detailed Metal Position
class MetalPositionDetail(BaseModel):
    id: int
    account_id: int
    metal_type: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purity: Optional[str] = None
    purchase_price: Optional[float] = None
    cost_basis: Optional[float] = None
    purchase_date: Optional[date] = None
    storage_location: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    account_name: str
    current_price_per_unit: Optional[float] = None # Needs real data source
    total_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None

class MetalPositionsDetailedResponse(BaseModel):
    metal_positions: List[MetalPositionDetail]

# Model for Detailed Real Estate Position
class RealEstatePositionDetail(BaseModel):
    id: int
    account_id: int
    address: Optional[str] = None
    property_type: Optional[str] = None
    purchase_price: Optional[float] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    account_name: str
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None
    # Add other relevant fields as needed

class RealEstatePositionsDetailedResponse(BaseModel):
    real_estate_positions: List[RealEstatePositionDetail]

# Model for Portfolio Summary
class PortfolioAssetSummary(BaseModel):
    asset_type: str
    total_value: float
    total_cost_basis: float
    count: int

class PortfolioSummaryAllResponse(BaseModel):
    total_value: float
    total_cost_basis: float
    total_gain_loss: float
    total_gain_loss_percent: float
    total_positions: int
    total_accounts: int
    breakdown: List[PortfolioAssetSummary] # Non-optional now

# Cash Models
class CashPositionCreate(BaseModel):
    cash_type: str  # "Savings", "CD", "Money Market", etc.
    name: str
    amount: float
    interest_rate: Optional[float] = None
    interest_period: Optional[str] = None
    maturity_date: Optional[str] = None  # Format: YYYY-MM-DD
    notes: Optional[str] = None

class CashPositionUpdate(BaseModel):
    cash_type: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = None
    interest_rate: Optional[float] = None
    interest_period: Optional[str] = None
    maturity_date: Optional[str] = None
    notes: Optional[str] = None

class CashPositionDetail(BaseModel):
    id: int
    account_id: int
    cash_type: str
    name: str
    amount: float
    interest_rate: Optional[float] = None
    interest_period: Optional[str] = None
    maturity_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    account_name: str
    monthly_interest: Optional[float] = None
    annual_interest: Optional[float] = None

class CashPositionsDetailedResponse(BaseModel):
    cash_positions: List[CashPositionDetail]

# FX Prices Models
class FXAssetCreate(BaseModel):
    symbol: str
    asset_type: str  # "crypto", "metal", or "currency"
    name: str

class FXAssetUpdate(BaseModel):
    active: Optional[bool] = None
    name: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    emailUpdates: bool = True
    marketAlerts: bool = True
    performanceReports: bool = True
    securityAlerts: bool = True
    newsletterUpdates: bool = False


# ----- HELPER FUNCTIONS  -----
# ----- BELOW PROVIDE ADDITIONAL REUSABLE FUNCTIONALITY TO VARIOUS API ENDPOINTS  -----


async def _get_detailed_securities(user_id: str) -> List[PositionDetail]:
    try:
        query = select(
            positions.c.id, positions.c.account_id, positions.c.ticker,
            positions.c.shares, positions.c.price, positions.c.cost_basis,
            positions.c.purchase_date, positions.c.date, accounts.c.account_name
        ).select_from(
            positions.join(accounts, positions.c.account_id == accounts.c.id)
        ).where(accounts.c.user_id == user_id)

        results = await database.fetch_all(query)
        positions_list = []
        for row in results:
            row_dict = dict(row)
            value = float(row_dict.get("shares", 0)) * float(row_dict.get("price", 0))
            cost_basis_val = row_dict.get("cost_basis")
            if cost_basis_val is None: cost_basis_val = row_dict.get("price")

            positions_list.append(PositionDetail(
                id=row_dict["id"], account_id=row_dict["account_id"], ticker=row_dict["ticker"],
                shares=float(row_dict.get("shares") or 0), price=float(row_dict.get("price") or 0),
                cost_basis=float(cost_basis_val or 0), purchase_date=row_dict.get("purchase_date"),
                date=row_dict.get("date"), account_name=row_dict["account_name"], value=float(value or 0)
            ))
        return positions_list
    except Exception as e:
        logger.error(f"Error in _get_detailed_securities for user {user_id}: {e}")
        return []

async def _get_detailed_crypto(user_id: str) -> List[CryptoPositionDetail]:
    try:
        query = """
        SELECT cp.*, a.account_name FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id WHERE a.user_id = :user_id
        """
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        crypto_list = []
        for row in results:
            row_dict = dict(row)
            quantity = float(row_dict.get("quantity", 0))
            current_price = float(row_dict.get("current_price", 0))
            purchase_price = float(row_dict.get("purchase_price", 0))
            total_value = quantity * current_price
            gain_loss = total_value - (quantity * purchase_price)
            gain_loss_percent = ((current_price / purchase_price) - 1) * 100 if purchase_price > 0 else 0
            tags_list = row_dict.get("tags")
            if isinstance(tags_list, str) and tags_list.startswith('{') and tags_list.endswith('}'):
                try: tags_list = [tag.strip('" ') for tag in tags_list[1:-1].split(',') if tag.strip()]
                except Exception: tags_list = []
            elif not isinstance(tags_list, list): tags_list = []

            crypto_list.append(CryptoPositionDetail(
                id=row_dict["id"], account_id=row_dict["account_id"], coin_type=row_dict.get("coin_type"),
                coin_symbol=row_dict.get("coin_symbol"), quantity=quantity, purchase_price=purchase_price,
                current_price=current_price, purchase_date=row_dict.get("purchase_date"),
                storage_type=row_dict.get("storage_type"), notes=row_dict.get("notes"), tags=tags_list,
                is_favorite=row_dict.get("is_favorite", False), created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"), account_name=row_dict["account_name"],
                total_value=total_value, gain_loss=gain_loss, gain_loss_percent=gain_loss_percent
            ))
        return crypto_list
    except Exception as e:
        logger.error(f"Error in _get_detailed_crypto for user {user_id}: {e}")
        return []

async def _get_detailed_metals(user_id: str) -> List[MetalPositionDetail]:
    try:
        query = """
        SELECT mp.*, a.account_name FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id WHERE a.user_id = :user_id
        """
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        metals_list = []
        for row in results:
            row_dict = dict(row)
            quantity = float(row_dict.get("quantity", 0))
            purchase_price = float(row_dict.get("purchase_price", 0))
            cost_basis_per_unit = float(row_dict.get("cost_basis", purchase_price))
            # TODO: Fetch actual current price per unit for metals
            current_price_per_unit = purchase_price # Placeholder
            total_value = quantity * current_price_per_unit
            total_cost = quantity * cost_basis_per_unit
            gain_loss = total_value - total_cost
            gain_loss_percent = ((current_price_per_unit / cost_basis_per_unit) - 1) * 100 if cost_basis_per_unit > 0 else 0

            metals_list.append(MetalPositionDetail(
                id=row_dict["id"], account_id=row_dict["account_id"], metal_type=row_dict.get("metal_type"),
                quantity=quantity, unit=row_dict.get("unit"), purity=row_dict.get("purity"),
                purchase_price=purchase_price, cost_basis=cost_basis_per_unit, purchase_date=row_dict.get("purchase_date"),
                storage_location=row_dict.get("storage_location"), description=row_dict.get("description"),
                created_at=row_dict.get("created_at"), updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"], current_price_per_unit=current_price_per_unit,
                total_value=total_value, gain_loss=gain_loss, gain_loss_percent=gain_loss_percent
            ))
        return metals_list
    except Exception as e:
        logger.error(f"Error in _get_detailed_metals for user {user_id}: {e}")
        return []

async def _get_detailed_real_estate(user_id: str) -> List[RealEstatePositionDetail]:
    try:
        query = """
        SELECT re.*, a.account_name FROM real_estate_positions re
        JOIN accounts a ON re.account_id = a.id WHERE a.user_id = :user_id
        """
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        realestate_list = []
        for row in results:
             row_dict = dict(row)
             purchase_price = float(row_dict.get("purchase_price", 0))
             # TODO: Fetch actual estimated value for real estate
             estimated_value = float(row_dict.get("estimated_value", purchase_price)) # Placeholder
             gain_loss = estimated_value - purchase_price
             gain_loss_percent = ((estimated_value / purchase_price) - 1) * 100 if purchase_price > 0 else 0

             realestate_list.append(RealEstatePositionDetail(
                 id=row_dict["id"], account_id=row_dict["account_id"], address=row_dict.get("address"),
                 property_type=row_dict.get("property_type"), purchase_price=purchase_price,
                 estimated_value=estimated_value, purchase_date=row_dict.get("purchase_date"),
                 created_at=row_dict.get("created_at"), updated_at=row_dict.get("updated_at"),
                 account_name=row_dict["account_name"], gain_loss=gain_loss, gain_loss_percent=gain_loss_percent
             ))
        return realestate_list
    except Exception as e:
        logger.error(f"Error in _get_detailed_real_estate for user {user_id}: {e}")
        return []

async def _get_detailed_cash(user_id: str) -> List[CashPositionDetail]:
    try:
        query = """
        SELECT cp.*, a.account_name FROM cash_positions cp
        JOIN accounts a ON cp.account_id = a.id WHERE a.user_id = :user_id
        ORDER BY a.account_name, cp.name
        """
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        
        cash_positions_list = []
        for row in results:
            row_dict = dict(row)
            
            # Calculate interest values
            amount = float(row_dict.get("amount") or 0)
            interest_rate = float(row_dict.get("interest_rate") or 0)
            annual_interest = amount * interest_rate
            monthly_interest = annual_interest / 12
            
            cash_positions_list.append(CashPositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                cash_type=row_dict["cash_type"],
                name=row_dict["name"],
                amount=amount,
                interest_rate=interest_rate,
                interest_period=row_dict.get("interest_period"),
                maturity_date=row_dict.get("maturity_date"),
                notes=row_dict.get("notes"),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"],
                monthly_interest=monthly_interest,
                annual_interest=annual_interest
            ))

        return cash_positions_list
    except Exception as e:
        logger.error(f"Error in _get_detailed_cash for user {user_id}: {str(e)}")
        return []

# ----- API ENDPOINT DIRECTORY  -----
# ----- BELOW FEATURES VARIOUS ENDPOINTS USED BY CLIENT APPLICATION  -----

# General application APIS
@app.get("/")
async def read_root():
    return {"message": "Welcome to NestEgg API!", "version": "1.0.0"}

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# ----- USER MANAGEMENT  -----
# User Management
@app.get("/users")
async def get_users():
    query = users.select()
    result = await database.fetch_all(query)
    return {"users": result}

@app.get("/user")
async def get_user_data(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"], 
        "id": current_user["id"]
    }

@app.get("/user/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's extended profile information."""
    try:
        # Query the database for the user's profile
        query = "SELECT * FROM users WHERE id = :user_id"
        result = await database.fetch_one(query, {"user_id": current_user["id"]})
        
        # Debug logging
        logger.info(f"User profile query result type: {type(result)}")
        
        # Handle the case where result is None
        if result is None:
            logger.warning(f"No user profile found for ID: {current_user['id']}")
            # Create a default profile with minimal user information
            profile = UserProfileResponse(
                id=str(current_user["id"]),  # Convert to string
                email=current_user["email"],
                first_name=current_user.get("first_name", ""),
                last_name=current_user.get("last_name", ""),
                phone="",
                occupation="",
                date_of_birth=None,
                address="",
                city="",
                state="",
                zip_code="",
                country="",
                bio="",
                created_at=datetime.utcnow(),
                subscription_plan="basic",
                notification_preferences={  # Ensure this is a dict
                    "emailUpdates": True,
                    "marketAlerts": True,
                    "performanceReports": True,
                    "securityAlerts": True,
                    "newsletterUpdates": False
                },
                is_admin=False
            )
            return profile
        
        # Extract notification preferences with proper type conversion
        notification_prefs = result["notification_preferences"] if "notification_preferences" in result and result["notification_preferences"] is not None else {}
        
        # Ensure it's a dictionary
        if not isinstance(notification_prefs, dict):
            notification_prefs = {
                "emailUpdates": True,
                "marketAlerts": True,
                "performanceReports": True,
                "securityAlerts": True,
                "newsletterUpdates": False
            }
        
        # Safely create response object with existing data
        profile = UserProfileResponse(
            id=str(result["id"]),  # Convert to string
            email=result["email"],
            first_name=result["first_name"] if "first_name" in result and result["first_name"] is not None else "",
            last_name=result["last_name"] if "last_name" in result and result["last_name"] is not None else "",
            phone=result["phone"] if "phone" in result and result["phone"] is not None else "",
            occupation=result["occupation"] if "occupation" in result and result["occupation"] is not None else "",
            date_of_birth=result["date_of_birth"] if "date_of_birth" in result and result["date_of_birth"] is not None else None,
            address=result["address"] if "address" in result and result["address"] is not None else "",
            city=result["city"] if "city" in result and result["city"] is not None else "",
            state=result["state"] if "state" in result and result["state"] is not None else "",
            zip_code=result["zip_code"] if "zip_code" in result and result["zip_code"] is not None else "",
            country=result["country"] if "country" in result and result["country"] is not None else "",
            bio=result["bio"] if "bio" in result and result["bio"] is not None else "",
            created_at=result["created_at"] if "created_at" in result and result["created_at"] is not None else datetime.utcnow(),
            subscription_plan=result["subscription_plan"] if "subscription_plan" in result and result["subscription_plan"] is not None else "basic",
            notification_preferences=notification_prefs,  # Use the properly validated preferences
            is_admin=result["is_admin"] if "is_admin" in result and result["is_admin"] is not None else False
        )
        
        return profile
    except Exception as e:
        logger.error(f"Error retrieving user profile: {str(e)}")
        # Add more detailed debug information
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile")

@app.put("/user/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update the current user's profile information."""
    try:
        # Extract update fields carefully
        update_fields = {}
        # Handle data extraction based on the type of profile_data
        if hasattr(profile_data, "dict") and callable(profile_data.dict):
            # If it's a Pydantic model
            try:
                data_dict = profile_data.dict(exclude_unset=True)
            except:
                # Fallback if dict() method fails
                data_dict = {k: v for k, v in profile_data.__dict__.items() 
                           if not k.startswith('_') and v is not None}
        else:
            # Direct dictionary access
            data_dict = {k: v for k, v in profile_data.__dict__.items() 
                       if not k.startswith('_') and v is not None}
        
        for field, value in data_dict.items():
            update_fields[field] = value
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        # Build query string safely
        fields_str = ", ".join([f"{k} = :{k}" for k in update_fields.keys()])
        query = f"UPDATE users SET {fields_str} WHERE id = :user_id RETURNING *"
        
        # Add user_id to params
        update_fields["user_id"] = current_user["id"]
        
        # Log the query for debugging
        logger.info(f"Update query: {query}")
        logger.info(f"Update parameters: {update_fields}")
        
        # Execute the update
        result = await database.fetch_one(query, update_fields)
        
        # Debug logging for result
        logger.info(f"Update result type: {type(result)}")
        
        # Handle case where result is None
        if result is None:
            logger.warning(f"Update returned no result for user ID: {current_user['id']}")
            # Create a default response with provided update fields
            profile = UserProfileResponse(
                id=str(current_user["id"]),  # Convert to string
                email=current_user["email"],
                first_name=update_fields.get("first_name", current_user.get("first_name", "")),
                last_name=update_fields.get("last_name", current_user.get("last_name", "")),
                phone=update_fields.get("phone", ""),
                occupation=update_fields.get("occupation", ""),
                date_of_birth=update_fields.get("date_of_birth"),
                address=update_fields.get("address", ""),
                city=update_fields.get("city", ""),
                state=update_fields.get("state", ""),
                zip_code=update_fields.get("zip_code", ""),
                country=update_fields.get("country", ""),
                bio=update_fields.get("bio", ""),
                created_at=datetime.utcnow(),
                subscription_plan="basic",
                notification_preferences={  # Ensure this is a dict
                    "emailUpdates": True,
                    "marketAlerts": True,
                    "performanceReports": True,
                    "securityAlerts": True,
                    "newsletterUpdates": False
                },
                is_admin=False
            )
            
            # Try to insert a new user profile instead
            try:
                # Add any missing fields needed for insert
                insert_data = update_fields.copy()
                insert_data.pop("user_id", None)  # Remove the user_id key used for WHERE clause
                
                # Construct columns and values for insertion
                columns = ", ".join(["id"] + list(insert_data.keys()))
                placeholders = ", ".join([":user_id"] + [f":{k}" for k in insert_data.keys()])
                
                insert_query = f"INSERT INTO users ({columns}) VALUES ({placeholders}) RETURNING *"
                insert_params = {"user_id": current_user["id"], **insert_data}
                
                logger.info(f"Attempting to create profile - Query: {insert_query}")
                logger.info(f"Insert parameters: {insert_params}")
                
                insert_result = await database.fetch_one(insert_query, insert_params)
                
                if insert_result:
                    logger.info("Successfully created new user profile")
                    # Update the profile with inserted data
                    for key in insert_result.keys():
                        if key != "id" and key != "email" and hasattr(profile, key):
                            setattr(profile, key, insert_result[key])
            except Exception as insert_err:
                logger.error(f"Error creating new profile: {str(insert_err)}")
                # Continue with default profile on error
            
            return profile
        
        # Extract notification preferences with proper type conversion
        notification_prefs = result["notification_preferences"] if "notification_preferences" in result and result["notification_preferences"] is not None else {}
        
        # Ensure it's a dictionary
        if not isinstance(notification_prefs, dict):
            notification_prefs = {
                "emailUpdates": True,
                "marketAlerts": True,
                "performanceReports": True,
                "securityAlerts": True,
                "newsletterUpdates": False
            }
        
        # Build profile response from the update result
        profile = UserProfileResponse(
            id=str(result["id"]),  # Convert to string
            email=result["email"],
            first_name=result["first_name"] if "first_name" in result and result["first_name"] is not None else "",
            last_name=result["last_name"] if "last_name" in result and result["last_name"] is not None else "",
            phone=result["phone"] if "phone" in result and result["phone"] is not None else "",
            occupation=result["occupation"] if "occupation" in result and result["occupation"] is not None else "",
            date_of_birth=result["date_of_birth"] if "date_of_birth" in result and result["date_of_birth"] is not None else None,
            address=result["address"] if "address" in result and result["address"] is not None else "",
            city=result["city"] if "city" in result and result["city"] is not None else "",
            state=result["state"] if "state" in result and result["state"] is not None else "",
            zip_code=result["zip_code"] if "zip_code" in result and result["zip_code"] is not None else "",
            country=result["country"] if "country" in result and result["country"] is not None else "",
            bio=result["bio"] if "bio" in result and result["bio"] is not None else "",
            created_at=result["created_at"] if "created_at" in result and result["created_at"] is not None else datetime.utcnow(),
            subscription_plan=result["subscription_plan"] if "subscription_plan" in result and result["subscription_plan"] is not None else "basic",
            notification_preferences=notification_prefs,  # Use the properly validated preferences
            is_admin=result["is_admin"] if "is_admin" in result and result["is_admin"] is not None else False
        )
        
        return profile
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        # Add more detailed debug information
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to update user profile")

@app.post("/signup", status_code=status.HTTP_201_CREATED)
async def create_user(user: UserSignup):
    try:
        existing_user = await database.fetch_one(users.select().where(users.c.email == user.email))
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

        password_hash = hash_password(user.password)
        user_id = str(uuid.uuid4())
        query = users.insert().values(id=user_id, email=user.email, password_hash=password_hash)
        await database.execute(query)
        return {"message": "User created successfully!", "user_id": user_id}
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await database.fetch_one(users.select().where(users.c.email == form_data.username))
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user_admin(current_user: dict = Depends(get_current_user)):
    # You could implement extra checks here to ensure the user is an admin
    # For now, we'll just use the regular user authentication
    return current_user

@app.post("/user/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change the current user's password."""
    try:
        # Get the current user's password hash
        query = "SELECT password_hash FROM users WHERE id = :user_id"
        result = await database.fetch_one(query, {"user_id": current_user["id"]})
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(password_data.current_password, result["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash the new password
        hashed_password = hash_password(password_data.new_password)
        
        # Update the password
        update_query = "UPDATE users SET password_hash = :password_hash WHERE id = :user_id"
        await database.execute(update_query, {"password_hash": hashed_password, "user_id": current_user["id"]})
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to change password")

@app.put("/user/notifications")
async def update_notification_preferences(
    notification_data: NotificationPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update the user's notification preferences."""
    try:
        # Update notification preferences
        query = """
        UPDATE users 
        SET notification_preferences = :preferences 
        WHERE id = :user_id
        RETURNING *
        """
        result = await database.fetch_one(query, {
            "preferences": json.dumps(notification_data.dict()),
            "user_id": current_user["id"]
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Notification preferences updated successfully"}
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update notification preferences")

# ----- ACCOUNT MANAGEMENT  -----
# MANAGES ACCOUNTS FOR EACH USER AND PROVIDES ABILITY TO EXTRACT
# Account Management
@app.get("/accounts")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    try:
        query = accounts.select().where(accounts.c.user_id == current_user["id"])
        result = await database.fetch_all(query)
        
        accounts_list = []
        for row in result:
            account_data = {
                "id": row["id"],
                "account_name": row["account_name"],
                "institution": row["institution"] if "institution" in row else None,
                "type": row["type"] if "type" in row else None,
                "account_category": row["account_category"] if "account_category" in row else None,
            }
            
                
            accounts_list.append(account_data)
        
        return {"accounts": accounts_list}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch accounts: {str(e)}")

@app.get("/accounts/enriched")
async def get_enriched_accounts(current_user: dict = Depends(get_current_user)):
    try:
        # Simple query to get all columns from enriched_accounts for the current user
        query = """
            SELECT * FROM enriched_accounts 
            WHERE user_id = :user_id
        """
        params = {"user_id": current_user["id"]}
        
        result = await database.fetch_all(query=query, values=params)
        
        # Convert SQLAlchemy rows to dicts
        accounts_list = [dict(row) for row in result]
        
        return {"accounts": accounts_list}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                            detail=f"Failed to fetch enriched account data: {str(e)}")

@app.get("/accounts/all/detailed", response_model=AccountsDetailedResponse)
async def get_all_detailed_accounts(current_user: dict = Depends(get_current_user)):
    """
    Fetch all accounts for the logged-in user, enriched with calculated
    metrics (value, cost basis, gain/loss) aggregated from all position types,
    and includes a list of basic position info for each account.
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed accounts for user_id: {user_id}")

        # 1. Fetch all basic account info
        accounts_query = accounts.select().where(accounts.c.user_id == user_id).order_by(accounts.c.account_name)
        user_accounts_raw = await database.fetch_all(accounts_query)

        # Use INFO level for this crucial log
        logger.info(f"Fetched user_accounts_raw for user {user_id}: {user_accounts_raw}")

        if not user_accounts_raw:
            logger.warning(f"No accounts found for user {user_id}. Returning empty list.")
            return AccountsDetailedResponse(accounts=[])

        # 2. Fetch all detailed positions across all types (using internal helpers)
        all_securities = await _get_detailed_securities(user_id)
        all_crypto = await _get_detailed_crypto(user_id)
        all_metals = await _get_detailed_metals(user_id)
        all_real_estate = await _get_detailed_real_estate(user_id)
        all_cash = await _get_detailed_cash(user_id)

        detailed_accounts_list = []

        # 3. Process each account
        for i, account_raw in enumerate(user_accounts_raw): # Add index for logging
            # Log the raw object at the START of the loop iteration using INFO
            logger.info(f"Processing account index {i} (type: {type(account_raw)}): {account_raw}")

            # The check for None
            if account_raw is None:
                logger.warning(f"Account index {i} is None. Skipping.")
                continue # Skip this iteration if account_raw is None

            # Initialize aggregates (inside loop, reset for each account)
            account_positions_basic_info = []
            account_total_value = 0.0
            account_total_cost_basis = 0.0
            account_positions_count = 0
            account_id = None # Initialize account_id
            account_dict = None # Initialize account_dict

            try:
                # --- Access required fields first ---
                account_id = account_raw["id"] # Direct access - raises TypeError if None, KeyError if missing
                logger.info(f"Account index {i}: ID {account_id} accessed successfully.")

                # --- *** Convert Record to dict *** ---
                account_dict = dict(account_raw)
                logger.info(f"Account index {i}: Converted account_raw to dict.")
                # --- *** Use account_dict below for accessing account fields *** ---

                # --- Aggregate positions ---
                # Aggregate Securities
                for pos in all_securities:
                     if pos.account_id == account_id:
                         value = pos.value
                         cost_total = float(pos.shares * pos.cost_basis)
                         gain_loss_amount = value - cost_total
                         gain_loss_percent = (gain_loss_amount / cost_total) * 100 if cost_total > 0 else 0
                         account_total_value += value
                         account_total_cost_basis += cost_total
                         account_positions_count += 1
                         account_positions_basic_info.append(PositionBasicInfo(
                             id=pos.id, asset_type='security', ticker_or_name=pos.ticker,
                             quantity_or_shares=pos.shares, value=value, cost_basis_total=cost_total,
                             gain_loss_amount=gain_loss_amount, gain_loss_percent=gain_loss_percent))
                # Aggregate Crypto
                for crypto in all_crypto:
                      if crypto.account_id == account_id:
                          value = crypto.total_value
                          cost_total = float(crypto.quantity * crypto.purchase_price)
                          gain_loss_amount = crypto.gain_loss if crypto.gain_loss is not None else (value - cost_total)
                          gain_loss_percent = crypto.gain_loss_percent if crypto.gain_loss_percent is not None else ((value / cost_total) - 1) * 100 if cost_total > 0 else 0
                          account_total_value += value
                          account_total_cost_basis += cost_total
                          account_positions_count += 1
                          account_positions_basic_info.append(PositionBasicInfo(
                              id=crypto.id, asset_type='crypto', ticker_or_name=crypto.coin_symbol or crypto.coin_type or 'Unknown',
                              quantity_or_shares=crypto.quantity, value=value, cost_basis_total=cost_total,
                              gain_loss_amount=gain_loss_amount, gain_loss_percent=gain_loss_percent))
                # Aggregate Metals
                for metal in all_metals:
                     if metal.account_id == account_id:
                         value = metal.total_value or 0
                         cost_total = float(metal.quantity * metal.cost_basis)
                         gain_loss_amount = metal.gain_loss if metal.gain_loss is not None else (value - cost_total)
                         gain_loss_percent = metal.gain_loss_percent if metal.gain_loss_percent is not None else ((value / cost_total) - 1) * 100 if cost_total > 0 else 0
                         account_total_value += value
                         account_total_cost_basis += cost_total
                         account_positions_count += 1
                         account_positions_basic_info.append(PositionBasicInfo(
                             id=metal.id, asset_type='metal', ticker_or_name=metal.metal_type or 'Unknown',
                             quantity_or_shares=metal.quantity, value=value, cost_basis_total=cost_total,
                             gain_loss_amount=gain_loss_amount, gain_loss_percent=gain_loss_percent))
                # Aggregate Real Estate
                for re_pos in all_real_estate:
                       if re_pos.account_id == account_id:
                           value = re_pos.estimated_value or re_pos.purchase_price or 0
                           cost_total = float(re_pos.purchase_price or 0)
                           gain_loss_amount = re_pos.gain_loss if re_pos.gain_loss is not None else (value - cost_total)
                           gain_loss_percent = re_pos.gain_loss_percent if re_pos.gain_loss_percent is not None else ((value / cost_total) - 1) * 100 if cost_total > 0 else 0
                           account_total_value += value
                           account_total_cost_basis += cost_total
                           account_positions_count += 1
                           account_positions_basic_info.append(PositionBasicInfo(
                               id=re_pos.id, asset_type='real_estate', ticker_or_name=re_pos.address or re_pos.property_type or 'Unknown',
                               quantity_or_shares=1, value=value, cost_basis_total=cost_total,
                               gain_loss_amount=gain_loss_amount, gain_loss_percent=gain_loss_percent))

                # Aggregate Cash
                for cash_pos in all_cash:
                        if cash_pos.account_id == account_id:
                            value = cash_pos.amount
                            cost_total = cash_pos.amount  # For cash, cost basis is typically the same as current value
                            gain_loss_amount = 0  # Typically zero for cash
                            gain_loss_percent = 0
                            account_total_value += value
                            account_total_cost_basis += cost_total
                            account_positions_count += 1
                            account_positions_basic_info.append(PositionBasicInfo(
                                id=cash_pos.id, 
                                asset_type='cash', 
                                ticker_or_name=cash_pos.name or cash_pos.cash_type,
                                quantity_or_shares=1,  # Treat cash as a single position
                                value=value, 
                                cost_basis_total=cost_total,
                                gain_loss_amount=gain_loss_amount, 
                                gain_loss_percent=gain_loss_percent
                            ))

                # --- End Aggregate positions ---


                # Calculate final account-level gain/loss
                account_total_gain_loss = account_total_value - account_total_cost_basis
                account_total_gain_loss_percent = (account_total_gain_loss / account_total_cost_basis) * 100 if account_total_cost_basis > 0 else 0

                # Create AccountDetail object - Convert UUID to str
                logger.info(f"Account index {i}: Attempting to create AccountDetail object from dict.")
                account_detail = AccountDetail(
                    id=account_dict["id"],
                    user_id=str(account_dict["user_id"]),
                    account_name=account_dict.get("account_name", "Unknown Account"),
                    institution=account_dict.get("institution"),
                    type=account_dict.get("type"),
                    balance=float(account_total_value), # Use calculated value
                    cash_balance=sum(cash_pos.amount for cash_pos in all_cash if cash_pos.account_id == account_id),  # Add the missing comma here
                    created_at=account_dict.get("created_at"),
                    updated_at=account_dict.get("updated_at"),
                    # Calculated fields
                    total_value=float(account_total_value),
                    total_cost_basis=float(account_total_cost_basis),
                    total_gain_loss=float(account_total_gain_loss),
                    total_gain_loss_percent=float(account_total_gain_loss_percent),
                    positions_count=account_positions_count,
                    positions=account_positions_basic_info
                )
                detailed_accounts_list.append(account_detail)
                logger.info(f"Account index {i}: Successfully created and added AccountDetail for account_id: {account_id}")

            except KeyError as ke:
                # Use account_dict in log message if available, otherwise account_raw
                log_data = account_dict if account_dict is not None else account_raw
                logger.error(f"Account index {i}: KeyError accessing account data from dict. Missing key: {ke}. Account data: {log_data}", exc_info=False)
                continue
            except TypeError as te:
                 # This specific TypeError ('NoneType' not callable) should hopefully NOT happen now when using account_dict.get()
                 # but might happen earlier if conversion to dict fails or on direct access if None check failed.
                log_data = account_dict if account_dict is not None else account_raw
                logger.error(f"Account index {i}: TypeError accessing account data. Error: {te}. Account data: {log_data}", exc_info=True)
                continue # Skip this account
            except Exception as e:
                log_data = account_dict if account_dict is not None else account_raw
                logger.error(f"Account index {i}: Unexpected error processing account_id {account_id}. Error: {e}. Account data: {log_data}", exc_info=True)
                continue # Skip this account

        logger.info(f"Finished processing accounts. Returning {len(detailed_accounts_list)} detailed accounts for user_id: {user_id}")
        return AccountsDetailedResponse(accounts=detailed_accounts_list)

    except Exception as e:
        logger.error(f"General error in get_all_detailed_accounts for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed accounts: {str(e)}"
        )

@app.post("/accounts", status_code=status.HTTP_201_CREATED)
async def add_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    try:
        query = accounts.insert().values(
            user_id=current_user["id"],
            account_name=account.account_name,
            institution=account.institution,
            type=account.type,
            account_category=account.account_category
        )
        
        account_id = await database.execute(query)
        return {
            "message": "Account added successfully!",
            "account_id": account_id
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.put("/accounts/{account_id}")
async def update_account(account_id: int, account_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account exists and belongs to the user
        query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        existing_account = await database.fetch_one(query)
        
        if not existing_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Process the raw dictionary to ensure correct field names
        update_values = {}
        
        # Map potentially problematic field names to their correct versions
        field_mapping = {
            'account_name': 'account_name',
            'account*name': 'account_name',  # Handle the corrupted field name
            'institution': 'institution',
            'type': 'type',
            'account_category': 'account_category'
        }
        
        # Add values to update_values using the mapping
        for key, value in account_data.items():
            if key in field_mapping and value is not None:
                correct_key = field_mapping[key]
                update_values[correct_key] = value
        
        # Only perform update if there are values to update
        if update_values:
            # Don't include updated_at if it doesn't exist in your table
            # update_values["updated_at"] = datetime.utcnow()
            
            update_query = accounts.update().where(
                accounts.c.id == account_id
            ).values(**update_values)
            await database.execute(update_query)
        
        # Return updated account data
        get_query = accounts.select().where(accounts.c.id == account_id)
        updated_account = await database.fetch_one(get_query)
        
        return {
            "message": "Account updated successfully",
            "account": dict(updated_account)
        }
    except Exception as e:
        # Print the error for debugging
        import traceback
        print(f"Update account error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.delete("/accounts/{account_id}")
async def delete_account(account_id: int, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account exists and belongs to the user
        query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        existing_account = await database.fetch_one(query)
        
        if not existing_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Delete account (will cascade to positions)
        delete_query = accounts.delete().where(accounts.c.id == account_id)
        await database.execute(delete_query)
        
        return {"message": "Account deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

# ----- REPORTING ON ACCOUNT POSITIONS  -----
# Summary reporting by pulling each balance in each account - not primary way to get position detail
@app.get("/positions/unified")
async def get_unified_positions(
    asset_type: Optional[str] = None,
    account_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all positions for the current user from the unified positions view.
    
    Args:
        asset_type: Optional filter for specific asset types
                   (security, crypto, metal, cash)
        account_id: Optional filter for a specific account
                  
    Returns:
        All positions data from the unified view with optional filtering
    """
    try:
        user_id = current_user["id"]
        
        # Build dynamic query with parameterized filters
        query = """
        SELECT * FROM all_positions_unified 
        WHERE user_id = :user_id
        """
        
        params = {"user_id": user_id}
        
        # Add optional filters if provided
        if asset_type:
            query += " AND asset_type = :asset_type"
            params["asset_type"] = asset_type
            
        if account_id:
            query += " AND account_id = :account_id"
            params["account_id"] = account_id
            
        # Add ordering for consistent results
        query += " ORDER BY asset_type, account_id, name"
        
        # Execute query
        results = await database.fetch_all(query=query, values=params)
        
        if not results:
            return {"positions": []}
        
        # Process results to handle data type conversion for JSON response
        positions = []
        for row in results:
            position = dict(row)
            
            # Handle timestamp formatting
            for field in ['created_at', 'updated_at', 'price_updated_at', 'purchase_date']:
                if field in position and position[field] is not None:
                    if hasattr(position[field], 'isoformat'):
                        position[field] = position[field].isoformat()
            
            positions.append(position)
        
        return {"positions": positions}
        
    except Exception as e:
        logger.error(f"Error fetching unified positions: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch positions: {str(e)}"
        )

@app.get("/positions/all/detailed", response_model=PositionsDetailedResponse)
async def get_all_detailed_positions(current_user: dict = Depends(get_current_user)):
    """
    Fetch all security positions for the logged-in user,
    enriched with account details (like account_name).
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed positions for user_id: {user_id}")

        # Construct the JOIN query using SQLAlchemy core
        query = select(
            positions.c.id,
            positions.c.account_id,
            positions.c.ticker,
            positions.c.shares,
            positions.c.price,
            positions.c.cost_basis,
            positions.c.purchase_date,
            positions.c.date,
            accounts.c.account_name  # Get the account name via JOIN
        ).select_from(
            positions.join(accounts, positions.c.account_id == accounts.c.id)
        ).where(
            accounts.c.user_id == user_id
        ).order_by(
            accounts.c.account_name, positions.c.ticker # Optional ordering
        )

        results = await database.fetch_all(query)

        positions_list = []
        for row in results:
            row_dict = dict(row) # Convert RowProxy to dict

            # Calculate value
            value = (row_dict.get("shares") or 0) * (row_dict.get("price") or 0)

            # Ensure cost_basis fallback if null
            cost_basis = row_dict.get("cost_basis")
            if cost_basis is None:
                cost_basis = row_dict.get("price") # Fallback to current price

            position_detail = PositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                ticker=row_dict["ticker"],
                shares=float(row_dict.get("shares") or 0),
                price=float(row_dict.get("price") or 0),
                cost_basis=float(cost_basis or 0),
                purchase_date=row_dict.get("purchase_date"), # Already a date object or None
                date=row_dict.get("date"), # Already a datetime object or None
                account_name=row_dict["account_name"],
                value=float(value or 0)
            )
            positions_list.append(position_detail)

        logger.info(f"Returning {len(positions_list)} detailed positions for user_id: {user_id}")
        return PositionsDetailedResponse(positions=positions_list)

    except Exception as e:
        logger.error(f"Error fetching all detailed positions for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed positions: {str(e)}"
        )

@app.get("/crypto/all/detailed", response_model=CryptoPositionsDetailedResponse)
async def get_all_detailed_crypto_positions(current_user: dict = Depends(get_current_user)):
    """
    Fetch all crypto positions for the logged-in user,
    enriched with account details (like account_name).
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed crypto positions for user_id: {user_id}")

        # SQL Query joining crypto_positions and accounts
        # Adjust column names if your crypto_positions table schema is different
        query = """
        SELECT
            cp.id, cp.account_id, cp.coin_type, cp.coin_symbol, cp.quantity,
            cp.purchase_price, cp.current_price, cp.purchase_date,
            cp.storage_type, cp.notes,
            cp.tags, cp.is_favorite, cp.created_at, cp.updated_at,
            a.account_name
        FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE a.user_id = :user_id
        ORDER BY a.account_name, cp.coin_type, cp.coin_symbol
        """

        results = await database.fetch_all(query=query, values={"user_id": user_id})

        crypto_positions_list = []
        for row in results:
            row_dict = dict(row)

            # Calculate derived values
            quantity = float(row_dict.get("quantity") or 0)
            current_price = float(row_dict.get("current_price") or 0)
            purchase_price = float(row_dict.get("purchase_price") or 0)
            total_value = quantity * current_price
            gain_loss = total_value - (quantity * purchase_price)
            gain_loss_percent = ((current_price / purchase_price) - 1) * 100 if purchase_price and purchase_price > 0 else 0

            # Parse tags if stored as string representation of list/array
            tags_list = row_dict.get("tags")
            # Example simple parsing (adjust if stored differently, e.g., JSON string)
            if isinstance(tags_list, str) and tags_list.startswith('{') and tags_list.endswith('}'):
                 try:
                    # Assuming PostgreSQL array string like '{tag1,tag2}'
                    tags_list = [tag.strip('" ') for tag in tags_list[1:-1].split(',') if tag.strip()]
                 except Exception:
                    tags_list = [] # Fallback if parsing fails
            elif not isinstance(tags_list, list):
                tags_list = []


            crypto_detail = CryptoPositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                coin_type=row_dict.get("coin_type"),
                coin_symbol=row_dict.get("coin_symbol"),
                quantity=quantity,
                purchase_price=purchase_price,
                current_price=current_price,
                purchase_date=row_dict.get("purchase_date"),
                storage_type=row_dict.get("storage_type"),
                notes=row_dict.get("notes"),
                tags=tags_list,
                is_favorite=row_dict.get("is_favorite", False),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"],
                total_value=total_value,
                gain_loss=gain_loss,
                gain_loss_percent=gain_loss_percent
            )
            crypto_positions_list.append(crypto_detail)

        logger.info(f"Returning {len(crypto_positions_list)} detailed crypto positions for user_id: {user_id}")
        return CryptoPositionsDetailedResponse(crypto_positions=crypto_positions_list)

    except Exception as e:
        logger.error(f"Error fetching all detailed crypto positions for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed crypto positions: {str(e)}"
        )

@app.get("/metals/all/detailed", response_model=MetalPositionsDetailedResponse)
async def get_all_detailed_metal_positions(current_user: dict = Depends(get_current_user)):
    """
    Fetch all metal positions for the logged-in user,
    enriched with account details (like account_name).
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed metal positions for user_id: {user_id}")

        # *** Make sure 'metal_positions' is the correct table name ***
        query = """
        SELECT
            mp.id, mp.account_id, mp.metal_type, mp.quantity, mp.unit, mp.purity,
            mp.purchase_price, mp.cost_basis, mp.purchase_date, mp.storage_location,
            mp.description, mp.created_at, mp.updated_at,
            a.account_name
        FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id
        WHERE a.user_id = :user_id
        ORDER BY a.account_name, mp.metal_type
        """

        results = await database.fetch_all(query=query, values={"user_id": user_id})

        metal_positions_list = []
        for row in results:
            row_dict = dict(row)
            quantity = float(row_dict.get("quantity") or 0)
            purchase_price = float(row_dict.get("purchase_price") or 0)
            cost_basis_per_unit = float(row_dict.get("cost_basis") or purchase_price) # Use purchase price if cost basis null

            # --- Placeholder for Current Metal Price ---
            # TODO: Implement logic to fetch the current spot price for row_dict["metal_type"]
            # This might involve another table lookup or an external API call.
            # For testing, we can use purchase price as a placeholder.
            current_price_per_unit = purchase_price # Replace with actual current price logic
            # --- End Placeholder ---

            total_value = quantity * current_price_per_unit
            total_cost = quantity * cost_basis_per_unit
            gain_loss = total_value - total_cost
            gain_loss_percent = ((current_price_per_unit / cost_basis_per_unit) - 1) * 100 if cost_basis_per_unit and cost_basis_per_unit > 0 else 0

            metal_detail = MetalPositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                metal_type=row_dict.get("metal_type"),
                quantity=quantity,
                unit=row_dict.get("unit"),
                purity=row_dict.get("purity"),
                purchase_price=purchase_price,
                cost_basis=cost_basis_per_unit,
                purchase_date=row_dict.get("purchase_date"),
                storage_location=row_dict.get("storage_location"),
                description=row_dict.get("description"),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"],
                current_price_per_unit=current_price_per_unit, # Include fetched/placeholder price
                total_value=total_value,
                gain_loss=gain_loss,
                gain_loss_percent=gain_loss_percent
            )
            metal_positions_list.append(metal_detail)

        logger.info(f"Returning {len(metal_positions_list)} detailed metal positions for user_id: {user_id}")
        return MetalPositionsDetailedResponse(metal_positions=metal_positions_list)

    except Exception as e:
        logger.error(f"Error fetching all detailed metal positions for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed metal positions: {str(e)}"
        )

@app.get("/realestate/all/detailed", response_model=RealEstatePositionsDetailedResponse)
async def get_all_detailed_realestate_positions(current_user: dict = Depends(get_current_user)):
    """
    Fetch all real estate positions for the logged-in user,
    enriched with account details (like account_name).
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed real estate positions for user_id: {user_id}")

        # *** Make sure 'real_estate_positions' is the correct table name & columns ***
        query = """
        SELECT
            re.id, re.account_id, re.address, re.property_type,
            re.purchase_price, re.purchase_date,
            re.created_at, re.updated_at,
            a.account_name
        FROM real_estate_positions re  -- Use alias 're'
        JOIN accounts a ON re.account_id = a.id
        WHERE a.user_id = :user_id
        ORDER BY a.account_name, re.address
        """

        results = await database.fetch_all(query=query, values={"user_id": user_id})

        real_estate_positions_list = []
        for row in results:
            row_dict = dict(row)
            purchase_price = float(row_dict.get("purchase_price") or 0)
            estimated_value = float(row_dict.get("estimated_value") or purchase_price) # Default to purchase price if no estimate

            gain_loss = estimated_value - purchase_price
            gain_loss_percent = ((estimated_value / purchase_price) - 1) * 100 if purchase_price and purchase_price > 0 else 0

            realestate_detail = RealEstatePositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                address=row_dict.get("address"),
                property_type=row_dict.get("property_type"),
                purchase_price=purchase_price,
                estimated_value=estimated_value,
                purchase_date=row_dict.get("purchase_date"),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"],
                gain_loss=gain_loss,
                gain_loss_percent=gain_loss_percent
            )
            real_estate_positions_list.append(realestate_detail)

        logger.info(f"Returning {len(real_estate_positions_list)} detailed real estate positions for user_id: {user_id}")
        return RealEstatePositionsDetailedResponse(real_estate_positions=real_estate_positions_list)

    except Exception as e:
        logger.error(f"Error fetching all detailed real estate positions for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed real estate positions: {str(e)}"
        )

@app.get("/cash/all/detailed", response_model=CashPositionsDetailedResponse)
async def get_all_detailed_cash_positions(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        logger.info(f"Fetching all detailed cash positions for user_id: {user_id}")

        query = """
        SELECT cp.*, a.account_name 
        FROM cash_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE a.user_id = :user_id
        ORDER BY a.account_name, cp.name
        """
        results = await database.fetch_all(query=query, values={"user_id": user_id})

        cash_positions_list = []
        for row in results:
            row_dict = dict(row)
            
            # Calculate interest values
            amount = float(row_dict.get("amount") or 0)
            interest_rate = float(row_dict.get("interest_rate") or 0)
            annual_interest = amount * interest_rate
            monthly_interest = annual_interest / 12
            
            cash_positions_list.append(CashPositionDetail(
                id=row_dict["id"],
                account_id=row_dict["account_id"],
                cash_type=row_dict["cash_type"],
                name=row_dict["name"],
                amount=amount,
                interest_rate=interest_rate,
                interest_period=row_dict.get("interest_period"),
                maturity_date=row_dict.get("maturity_date"),
                notes=row_dict.get("notes"),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                account_name=row_dict["account_name"],
                monthly_interest=monthly_interest,
                annual_interest=annual_interest
            ))

        logger.info(f"Returning {len(cash_positions_list)} detailed cash positions for user_id: {user_id}")
        return CashPositionsDetailedResponse(cash_positions=cash_positions_list)

    except Exception as e:
        logger.error(f"Error in get_all_detailed_cash_positions for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detailed cash positions: {str(e)}"
        )

# ----- PRICING MANAGEMENT  -----
# INCLUDES UPDATES OF SECURITIES AND EXCHANGE RATES - RELATES TO SECURITIES TABLE AND FX_PRICES
# Get full list of securities / fx for price update or specific info from securities table or FX prices
@app.get("/securities/all")
async def get_all_securities(current_user: dict = Depends(get_current_user)):
    """Retrieve all securities from the database for debugging purposes."""
    try:
        logger.info("Fetching all securities from the database")
        query = "SELECT * FROM security_usage ORDER BY last_updated ASC"
        results = await database.fetch_all(query)
        result_count = len(results) if results else 0
        logger.info(f"Fetched {result_count} securities from the database")
        return {"securities": [dict(row) for row in results]}
    except Exception as e:
        logger.error(f"Error fetching all securities: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch securities: {str(e)}"
        )   

@app.get("/securities")
async def get_securities(current_user: dict = Depends(get_current_user)):
    """
    Fetch securities data for the user with robust type handling
    """
    try:
        # Fetch securities with smart filtering and type conversion
        query = """
            SELECT 
                ticker, 
                company_name, 
                sector, 
                industry, 
                COALESCE(
                    CASE 
                        WHEN current_price IS NULL OR current_price = 'NaN' THEN 0.0 
                        ELSE CAST(current_price AS NUMERIC) 
                    END, 
                    0.0
                ) as price,
                market_cap,
                pe_ratio,
                volume,
                dividend_yield,
                dividend_rate,
                eps,
                last_metrics_update,
                last_updated, 
                on_yfinance as available_on_yfinance,
                (
                    CASE 
                        WHEN last_updated IS NULL THEN 'Never'
                        WHEN last_updated < NOW() - INTERVAL '1 hour' THEN 
                            CONCAT(EXTRACT(HOURS FROM (NOW() - last_updated)), ' hours ago')
                        WHEN last_updated < NOW() - INTERVAL '1 day' THEN 
                            CONCAT(EXTRACT(DAYS FROM (NOW() - last_updated)), ' days ago')
                        ELSE 'Recently'
                    END
                ) as time_ago
            FROM securities 
            WHERE on_yfinance = true 
            ORDER BY last_updated DESC NULLS LAST
            """
        
        results = await database.fetch_all(query)
        
        # Explicitly convert to dictionary with robust type conversion
        securities_list = []
        for row in results:
            sec_dict = dict(row)
            
            # Robust price conversion
            try:
                price = float(sec_dict.get('price', 0.0))
                # Replace NaN or infinite values with 0
                if math.isnan(price) or math.isinf(price):
                    price = 0.0
            except (TypeError, ValueError):
                price = 0.0
            
            sec_dict['price'] = price
            
            # Convert last_updated to ISO format if it exists
            if sec_dict.get('last_updated'):
                sec_dict['last_updated'] = sec_dict['last_updated'].isoformat()
            
            # Convert last_metrics_update to ISO format if it exists
            if sec_dict.get('last_metrics_update'):
                sec_dict['last_metrics_update'] = sec_dict['last_metrics_update'].isoformat()
            
            securities_list.append(sec_dict)
        
        return {
            "securities": securities_list,
            "total_count": len(securities_list),
            "last_updated": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error fetching securities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch securities data: {str(e)}"
        )
        
@app.get("/securities/{ticker}/details")
async def get_security_details(ticker: str, current_user: dict = Depends(get_current_user)):
    """Get detailed statistics for a security"""
    try:
        # Get security basic info
        query = """
        SELECT 
            ticker, 
            last_metrics_update,
            COALESCE((
                SELECT COUNT(*) 
                FROM price_history 
                WHERE price_history.ticker = securities.ticker
            ), 0) as days_of_history
        FROM securities
        WHERE ticker = :ticker
        """
        security = await database.fetch_one(query, {"ticker": ticker.upper()})
        
        if not security:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security {ticker.upper()} not found"
            )
        
        # Format security details
        result = dict(security)
        
        # Get price statistics
        stats_query = """
        SELECT 
            MIN(close_price) as low_price,
            MAX(close_price) as high_price,
            AVG(close_price) as avg_price,
            COUNT(*) as count
        FROM price_history
        WHERE ticker = :ticker
        """
        stats = await database.fetch_one(stats_query, {"ticker": ticker.upper()})
        
        if stats and stats["count"] > 0:
            result["low_price"] = float(stats["low_price"]) if stats["low_price"] is not None else None
            result["high_price"] = float(stats["high_price"]) if stats["high_price"] is not None else None
            result["avg_price"] = float(stats["avg_price"]) if stats["avg_price"] is not None else None
        else:
            result["low_price"] = None
            result["high_price"] = None
            result["avg_price"] = None
        
        # Format last_metrics_update to ISO format if it exists
        if result.get("last_metrics_update"):
            result["last_metrics_update"] = result["last_metrics_update"].isoformat()
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching security details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch security details: {str(e)}"
        )

# Search methods for adding positions for drop down
@app.get("/securities/search")
async def search_securities(query: str, current_user: dict = Depends(get_current_user)):
    """Search securities from the database."""
    try:
        logger.info(f"Securities search request received: query='{query}'")
        
        if not query or len(query.strip()) < 1:
            return {"results": []}

        search_pattern = f"%{query.strip().lower()}%"
        params = {
            "search_pattern": search_pattern
        }
        logger.info(f"Executing search with params: {params}")

        # Query matching the schema
        search_query = """
        SELECT 
            ticker,
            asset_type,
            company_name AS name,
            COALESCE(current_price, 0) AS price,
            sector,
            industry,
            market_cap
        FROM securities
            WHERE 
                TRIM(LOWER(ticker)) LIKE :search_pattern OR
                TRIM(LOWER(company_name)) LIKE :search_pattern OR
                TRIM(LOWER(COALESCE(sector, ''))) LIKE :search_pattern OR
                TRIM(LOWER(COALESCE(industry, ''))) LIKE :search_pattern

        ORDER BY ticker ASC
        LIMIT 20
        """

        results = await database.fetch_all(search_query, params)
        result_count = len(results) if results else 0
        logger.info(f"Search for '{query}' found {result_count} results")

        formatted_results = [dict(row) for row in results]
        return {"results": formatted_results}

    except Exception as e:
        logger.error(f"Error in securities search: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search securities: {str(e)}"
        )

# Edit FX / Securities tables to add or edit existing in-scope securities
@app.post("/securities", status_code=status.HTTP_201_CREATED)
async def add_security(security: SecurityCreate, current_user: dict = Depends(get_current_user)):
    """Add a new security to track"""
    try:
        # Check if security already exists
        query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(query, {"ticker": security.ticker.upper()})
        
        if existing:
            return {"message": f"Security {security.ticker.upper()} already exists in the database"}
        
        # Insert new security
        query = """
        INSERT INTO securities (ticker) 
        VALUES (:ticker)
        """
        await database.execute(
            query, 
            {
                "ticker": security.ticker.upper(),
            }
        )
        
        # Immediately try to fetch basic data for the security using the DirectYahooFinanceClient
        # Initialize DirectYahooFinanceClient
        client = DirectYahooFinanceClient()
        
        try:
            # Get current price data
            logger.info(f"Fetching current price for {security.ticker.upper()} using DirectYahooFinanceClient")
            price_data = await client.get_current_price(security.ticker.upper())
            
            if price_data:
                # Update securities table with price data
                update_query = """
                UPDATE securities
                SET 
                    current_price = :price,
                    day_open = :day_open,
                    day_high = :day_high,
                    day_low = :day_low,
                    volume = :volume,
                    last_updated = :updated_at,
                    price_timestamp = :price_timestamp
                WHERE ticker = :ticker
                """
                
                update_values = {
                    "ticker": security.ticker.upper(),
                    "price": price_data.get("price"),
                    "day_open": price_data.get("day_open"),
                    "day_high": price_data.get("day_high"),
                    "day_low": price_data.get("day_low"),
                    "volume": price_data.get("volume"),
                    "last_updated": datetime.now(),
                    "price_timestamp": price_data.get("price_timestamp")
                }
                
                await database.execute(update_query, update_values)
                logger.info(f"Updated price data for {security.ticker.upper()}")
        
        except Exception as e:
            # Log the error but don't fail the entire operation
            logger.error(f"Error fetching initial price data for {security.ticker.upper()}: {str(e)}")
        
        return {"message": f"Security {security.ticker.upper()} added successfully"}
    
    except Exception as e:
        logger.error(f"Error adding security: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add security: {str(e)}"
        )

@app.post("/securities/{ticker}/update")
async def update_specific_security(
    ticker: str, 
    update_data: SecurityUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a specific security based on the update type"""
    try:
        # Check if security exists
        query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(query, {"ticker": ticker.upper()})
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security {ticker.upper()} not found"
            )
        
        # Create event record for tracking
        event_id = await record_system_event(
            database,
            f"security_update_{update_data.update_type}",
            "started",
            {"ticker": ticker.upper()}
        )
        
        result = None
        
        # Perform update based on type
        if update_data.update_type == "metrics":
            # Use directly or import if needed
            updater = PriceUpdaterV2()
            result = await updater.update_company_metrics([ticker.upper()])
            message = "Metrics updated successfully"
            
        elif update_data.update_type == "current_price":
            # Use directly without reimporting
            updater = PriceUpdaterV2()
            result = await updater.update_security_prices([ticker.upper()])
            message = "Current price updated successfully"
            
        elif update_data.update_type == "history":
            # Use directly without reimporting
            updater = PriceUpdaterV2()
            days = update_data.days if update_data.days else 30  # Default to 30 days
            result = await updater.update_historical_prices([ticker.upper()], days=days)
            message = f"Price history updated successfully (last {days} days)"
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid update type: {update_data.update_type}"
            )
        
        # Record completion of event
        await update_system_event(
            database,
            event_id,
            "completed",
            {
                "ticker": ticker.upper(),
                "update_type": update_data.update_type,
                "result": result
            }
        )
        
        return {
            "message": message, 
            "ticker": ticker.upper(),
            "details": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        # Record failure if event was created
        if 'event_id' in locals() and event_id:
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": str(e)},
                str(e)
            )
        
        logger.error(f"Error updating security: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security: {str(e)}"
        )
        
# --- NEW SIMPLIFIED PRICE UPDATER LOGIC
# - YAHOO QUERY CLIENT
# Update Company Metrics for use of single ticker
@app.post("/market/update-ticker-metrics/{ticker}")
async def update_ticker_metrics(
    ticker: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update company metrics for a single ticker using YahooQuery client.
    
    This endpoint:
    1. Validates the ticker
    2. Creates a YahooQueryClient
    3. Fetches the company metrics data
    4. Updates the securities database table
    5. Returns results and status
    """
    try:
        # Validate request
        if not ticker:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticker must be provided"
            )
            
        # Standardize ticker (uppercase)
        ticker = ticker.strip().upper()
        
        # Check if ticker exists in database
        check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(check_query, {"ticker": ticker})
        
        if not existing:
            # Ticker doesn't exist, insert it first
            insert_query = """
            INSERT INTO securities (ticker, active, on_yfinance, created_at) 
            VALUES (:ticker, true, true, :now)
            """
            await database.execute(
                insert_query, 
                {
                    "ticker": ticker,
                    "now": datetime.utcnow()
                }
            )
            logger.info(f"Created new security record for ticker: {ticker}")
            
        # Create event record for tracking
        event_id = await record_system_event(
            database,
            "yahoo_ticker_metrics_update",
            "started",
            {"ticker": ticker}
        )
        
        # Initialize YahooQueryClient
        client = YahooQueryClient()
        
        try:
            # Get company metrics data
            logger.info(f"Fetching company metrics for {ticker}")
            metrics = await client.get_company_metrics(ticker)
            
            if not metrics or metrics.get("not_found"):
                error_msg = f"No metrics data returned for {ticker}"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "ticker": ticker
                }
            
            # Update securities table with company metrics
            update_query = """
            UPDATE securities
            SET 
                company_name = :company_name,
                current_price = :current_price,
                sector = :sector,
                industry = :industry,
                market_cap = :market_cap,
                pe_ratio = :pe_ratio,
                forward_pe = :forward_pe,
                dividend_rate = :dividend_rate,
                dividend_yield = :dividend_yield,
                beta = :beta,
                fifty_two_week_low = :fifty_two_week_low,
                fifty_two_week_high = :fifty_two_week_high,
                fifty_two_week_range = :fifty_two_week_range,
                eps = :eps,
                forward_eps = :forward_eps,
                last_metrics_update = :updated_at,
                last_updated = :updated_at
            WHERE ticker = :ticker
            """
            
            # Prepare values for update
            fifty_two_week_range = None
            if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                fifty_two_week_range = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
            
            update_values = {
                "ticker": ticker,
                "company_name": metrics.get("company_name"),
                "current_price": metrics.get("current_price"),
                "sector": metrics.get("sector"),
                "industry": metrics.get("industry"),
                "market_cap": metrics.get("market_cap"),
                "pe_ratio": metrics.get("pe_ratio"),
                "forward_pe": metrics.get("forward_pe"),
                "dividend_rate": metrics.get("dividend_rate"),
                "dividend_yield": metrics.get("dividend_yield"),
                "beta": metrics.get("beta"),
                "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                "fifty_two_week_range": fifty_two_week_range,
                "eps": metrics.get("eps"),
                "forward_eps": metrics.get("forward_eps"),
                "updated_at": datetime.now()
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_metrics = {k: v for k, v in metrics.items() if v is not None}
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {"ticker": ticker, "fields_updated": len(filtered_metrics)}
            )
            
            return {
                "success": True,
                "message": f"Successfully updated metrics for {ticker}",
                "ticker": ticker,
                "fields_updated": len(filtered_metrics),
                "metrics": filtered_metrics
            }
            
        except Exception as e:
            error_message = f"Error updating metrics for {ticker}: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "ticker": ticker
            }
            
    except Exception as e:
        error_message = f"Error in ticker metrics update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker metrics: {str(e)}"
        )

@app.post("/market/update-tickers-metrics/{tickers}")
async def update_multiple_ticker_metrics(
    tickers: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update company metrics for multiple tickers using YahooQuery client.
    
    Tickers should be comma-separated in the URL, e.g.:
    /market/update-tickers-metrics/AAPL,MSFT,GOOG,AMZN
    """
    # Parse tickers from the URL path parameter
    ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
    
    if not ticker_list:
        return {
            "success": False,
            "message": "No valid tickers provided",
            "results": []
        }
    
    # Create event record for the batch
    event_id = await record_system_event(
        database,
        "yahoo_tickers_metrics_batch_update",
        "started",
        {"tickers_count": len(ticker_list), "first_ticker": ticker_list[0]}
    )
    
    # Initialize results
    results = []
    success_count = 0
    failed_count = 0
    
    # Initialize YahooQueryClient
    client = YahooQueryClient()
    
    # Process each ticker
    for ticker in ticker_list:
        try:
            # Check if ticker exists in database
            check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
            existing = await database.fetch_one(check_query, {"ticker": ticker})
            
            if not existing:
                # Ticker doesn't exist, insert it first
                insert_query = """
                INSERT INTO securities (ticker, active, on_yfinance) 
                VALUES (:ticker, true, true)
                """
                await database.execute(
                    insert_query, 
                    {
                        "ticker": ticker
                    }
                )
                logger.info(f"Created new security record for ticker: {ticker}")
            
            # Get company metrics data
            logger.info(f"Fetching company metrics for {ticker}")
            metrics = await client.get_company_metrics(ticker)
            
            if isinstance(metrics, str):
                error_msg = f"Invalid metrics format (received string): {metrics}"
                logger.error(error_msg)
                
                results.append({
                    "ticker": ticker,
                    "success": False,
                    "message": error_msg
                })
                failed_count += 1
                continue
            
            if not metrics or metrics.get("not_found"):
                error_msg = f"No metrics data returned for {ticker}"
                logger.error(error_msg)
                
                results.append({
                    "ticker": ticker,
                    "success": False,
                    "message": error_msg
                })
                failed_count += 1
                continue
            
            # Update securities table with company metrics
            update_query = """
            UPDATE securities
            SET 
                company_name = :company_name,
                current_price = :current_price,
                sector = :sector,
                industry = :industry,
                market_cap = :market_cap,
                pe_ratio = :pe_ratio,
                forward_pe = :forward_pe,
                dividend_rate = :dividend_rate,
                dividend_yield = :dividend_yield,
                beta = :beta,
                fifty_two_week_low = :fifty_two_week_low,
                fifty_two_week_high = :fifty_two_week_high,
                fifty_two_week_range = :fifty_two_week_range,
                eps = :eps,
                forward_eps = :forward_eps,
                last_metrics_update = :updated_at,
                last_updated = :updated_at
            WHERE ticker = :ticker
            """
            
            # Prepare values for update
            fifty_two_week_range = None
            if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                fifty_two_week_range = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
            
            update_values = {
                "ticker": ticker,
                "company_name": metrics.get("company_name"),
                "current_price": metrics.get("current_price"),
                "sector": metrics.get("sector"),
                "industry": metrics.get("industry"),
                "market_cap": metrics.get("market_cap"),
                "pe_ratio": metrics.get("pe_ratio"),
                "forward_pe": metrics.get("forward_pe"),
                "dividend_rate": metrics.get("dividend_rate"),
                "dividend_yield": metrics.get("dividend_yield"),
                "beta": metrics.get("beta"),
                "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                "fifty_two_week_range": fifty_two_week_range,
                "eps": metrics.get("eps"),
                "forward_eps": metrics.get("forward_eps"),
                "updated_at": datetime.now()
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_metrics = {k: v for k, v in metrics.items() if v is not None}
            
            results.append({
                "ticker": ticker,
                "success": True,
                "message": f"Successfully updated metrics for {ticker}",
                "fields_updated": len(filtered_metrics)
            })
            success_count += 1
            
        except Exception as e:
            error_message = f"Error updating metrics for {ticker}: {str(e)}"
            logger.error(error_message)
            
            results.append({
                "ticker": ticker,
                "success": False,
                "message": error_message
            })
            failed_count += 1
    
    # Update event as completed
    await update_system_event(
        database,
        event_id,
        "completed",
        {
            "tickers_count": len(ticker_list),
            "success_count": success_count,
            "failed_count": failed_count
        }
    )
    
    return {
        "success": success_count > 0,
        "message": f"Updated metrics for {success_count}/{len(ticker_list)} tickers ({failed_count} failed)",
        "total_tickers": len(ticker_list),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }

# Update just price for a single ticker
@app.post("/market/update-ticker-price/{ticker}")
async def update_ticker_price(
    ticker: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current price data for a single ticker using YahooQuery client.
    """
    try:
        # Standardize ticker (uppercase)
        ticker = ticker.strip().upper()
        
        # Check if ticker exists in database
        check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(check_query, {"ticker": ticker})
        
        if not existing:
            # Ticker doesn't exist, insert it first
            insert_query = """
            INSERT INTO securities (ticker, active, on_yfinance, created_at) 
            VALUES (:ticker, true, true, :now)
            """
            await database.execute(
                insert_query, 
                {
                    "ticker": ticker,
                    "now": datetime.utcnow()
                }
            )
            logger.info(f"Created new security record for ticker: {ticker}")
            
        # Create event record for tracking
        event_id = await record_system_event(
            database,
            "yahoo_ticker_price_update",
            "started",
            {"ticker": ticker}
        )
        
        # Initialize YahooQueryClient
        client = YahooQueryClient()
        
        try:
            # Get current price data
            logger.info(f"Fetching current price for {ticker}")
            price_data = await client.get_current_price(ticker)
            
            if not price_data:
                error_msg = f"No price data returned for {ticker}"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "ticker": ticker
                }
            
            # Update securities table with price data
            update_query = """
            UPDATE securities
            SET 
                current_price = :price,
                day_open = :day_open,
                day_high = :day_high,
                day_low = :day_low,
                volume = :volume,
                last_updated = :updated_at,
                price_timestamp = :price_timestamp
            WHERE ticker = :ticker
            """
            
            update_values = {
                "ticker": ticker,
                "price": price_data.get("price"),
                "day_open": price_data.get("day_open"),
                "day_high": price_data.get("day_high"),
                "day_low": price_data.get("day_low"),
                "volume": price_data.get("volume"),
                "updated_at": datetime.now(),
                "price_timestamp": price_data.get("price_timestamp")
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_price_data = {k: v for k, v in price_data.items() if v is not None}
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {"ticker": ticker, "fields_updated": len(filtered_price_data)}
            )
            
            return {
                "success": True,
                "message": f"Successfully updated price for {ticker}",
                "ticker": ticker,
                "current_price": price_data.get("price"),
                "updated_at": datetime.now().isoformat(),
                "data": filtered_price_data
            }
            
        except Exception as e:
            error_message = f"Error updating price for {ticker}: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "ticker": ticker
            }
            
    except Exception as e:
        error_message = f"Error in ticker price update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker price: {str(e)}"
        )

@app.post("/market/update-tickers-price/{tickers}")
async def update_multiple_ticker_prices(
    tickers: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current price data for multiple tickers using YahooQuery client.
    
    Tickers should be comma-separated in the URL, e.g.:
    /market/update-tickers-price/AAPL,MSFT,GOOG,AMZN
    """
    try:
        # Parse tickers from the URL path parameter
        ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
        
        if not ticker_list:
            return {
                "success": False,
                "message": "No valid tickers provided",
                "results": []
            }
        
        # Create event record for the batch update
        event_id = await record_system_event(
            database,
            "yahoo_tickers_batch_price_update",
            "started",
            {"tickers_count": len(ticker_list), "first_ticker": ticker_list[0]}
        )
        
        # Check for missing tickers and add them to the database
        for ticker in ticker_list:
            check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
            existing = await database.fetch_one(check_query, {"ticker": ticker})
            
            if not existing:
                # Ticker doesn't exist, insert it first
                insert_query = """
                INSERT INTO securities (ticker, active, on_yfinance, created_at) 
                VALUES (:ticker, true, true, :now)
                """
                await database.execute(
                    insert_query, 
                    {
                        "ticker": ticker,
                        "now": datetime.utcnow()
                    }
                )
                logger.info(f"Created new security record for ticker: {ticker}")
        
        # Initialize YahooQueryClient
        client = YahooQueryClient()
        
        try:
            # Get batch price data
            logger.info(f"Fetching prices for batch of {len(ticker_list)} tickers")
            batch_price_data = await client.get_batch_prices(ticker_list)
            
            if not batch_price_data:
                error_msg = "No price data returned for any tickers"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "tickers": ticker_list
                }
            
            # Process results for each ticker
            results = []
            updated_count = 0
            failed_tickers = []
            
            for ticker in ticker_list:
                if ticker not in batch_price_data:
                    # No data returned for this ticker
                    failed_tickers.append(ticker)
                    results.append({
                        "ticker": ticker,
                        "success": False,
                        "message": "No price data returned"
                    })
                    continue
                    
                price_data = batch_price_data[ticker]
                
                try:
                    # Update securities table with price data
                    update_query = """
                    UPDATE securities
                    SET 
                        current_price = :price,
                        day_open = :day_open,
                        day_high = :day_high,
                        day_low = :day_low,
                        volume = :volume,
                        last_updated = :updated_at,
                        price_timestamp = :price_timestamp
                    WHERE ticker = :ticker
                    """
                    
                    update_values = {
                        "ticker": ticker,
                        "price": price_data.get("price"),
                        "day_open": price_data.get("day_open"),
                        "day_high": price_data.get("day_high"),
                        "day_low": price_data.get("day_low"),
                        "volume": price_data.get("volume"),
                        "updated_at": datetime.now(),
                        "price_timestamp": price_data.get("price_timestamp")
                    }
                    
                    await database.execute(update_query, update_values)
                    updated_count += 1
                    
                    # Filter out empty values for response
                    filtered_price_data = {k: v for k, v in price_data.items() if v is not None}
                    
                    results.append({
                        "ticker": ticker,
                        "success": True,
                        "message": f"Successfully updated price",
                        "current_price": price_data.get("price"),
                        "fields_updated": len(filtered_price_data)
                    })
                    
                except Exception as ticker_error:
                    error_message = f"Error updating price for {ticker}: {str(ticker_error)}"
                    logger.error(error_message)
                    failed_tickers.append(ticker)
                    
                    results.append({
                        "ticker": ticker,
                        "success": False,
                        "message": error_message
                    })
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {
                    "tickers_count": len(ticker_list),
                    "updated_count": updated_count,
                    "failed_count": len(failed_tickers)
                }
            )
            
            return {
                "success": updated_count > 0,
                "message": f"Updated prices for {updated_count}/{len(ticker_list)} tickers",
                "total_tickers": len(ticker_list),
                "updated_count": updated_count,
                "failed_count": len(failed_tickers),
                "failed_tickers": failed_tickers if failed_tickers else None,
                "results": results
            }
            
        except Exception as e:
            error_message = f"Error in batch price update: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "tickers": ticker_list
            }
            
    except Exception as e:
        error_message = f"Error in batch ticker price update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker prices: {str(e)}"
        )

# - DIRECT YAHOO CLIENT
@app.post("/market/direct-update-ticker-price/{ticker}")
async def direct_update_ticker_price(
    ticker: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current price data for a single ticker using DirectYahooFinanceClient.
    """
    try:
        # Standardize ticker (uppercase)
        ticker = ticker.strip().upper()
        
        # Check if ticker exists in database
        check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(check_query, {"ticker": ticker})
        
        if not existing:
            # Ticker doesn't exist, insert it first
            insert_query = """
            INSERT INTO securities (ticker, active, on_yfinance, created_at) 
            VALUES (:ticker, true, true, :now)
            """
            await database.execute(
                insert_query, 
                {
                    "ticker": ticker,
                    "now": datetime.utcnow()
                }
            )
            logger.info(f"Created new security record for ticker: {ticker}")
            
        # Create event record for tracking
        event_id = await record_system_event(
            database,
            "direct_yahoo_ticker_price_update",
            "started",
            {"ticker": ticker}
        )
        
        # Initialize DirectYahooFinanceClient
        client = DirectYahooFinanceClient()
        
        try:
            # Get current price data
            logger.info(f"Fetching current price for {ticker} using DirectYahooFinanceClient")
            price_data = await client.get_current_price(ticker)
            
            if not price_data:
                error_msg = f"No price data returned for {ticker}"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "ticker": ticker
                }
            
            # Update securities table with price data
            update_query = """
            UPDATE securities
            SET 
                current_price = :price,
                day_open = :day_open,
                day_high = :day_high,
                day_low = :day_low,
                volume = :volume,
                last_updated = :updated_at,
                price_timestamp = :price_timestamp
            WHERE ticker = :ticker
            """
            
            update_values = {
                "ticker": ticker,
                "price": price_data.get("price"),
                "day_open": price_data.get("day_open"),
                "day_high": price_data.get("day_high"),
                "day_low": price_data.get("day_low"),
                "volume": price_data.get("volume"),
                "updated_at": datetime.now(),
                "price_timestamp": price_data.get("price_timestamp")
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_price_data = {k: v for k, v in price_data.items() if v is not None}
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {"ticker": ticker, "fields_updated": len(filtered_price_data)}
            )
            
            return {
                "success": True,
                "message": f"Successfully updated price for {ticker}",
                "ticker": ticker,
                "current_price": price_data.get("price"),
                "updated_at": datetime.now().isoformat(),
                "data": filtered_price_data
            }
            
        except Exception as e:
            error_message = f"Error updating price for {ticker}: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "ticker": ticker
            }
            
    except Exception as e:
        error_message = f"Error in direct ticker price update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker price: {str(e)}"
        )

@app.post("/market/direct-update-tickers-price/{tickers}")
async def direct_update_multiple_ticker_prices(
    tickers: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current price data for multiple tickers using DirectYahooFinanceClient.
    
    Tickers should be comma-separated in the URL, e.g.:
    /market/direct-update-tickers-price/AAPL,MSFT,GOOG,AMZN
    """
    try:
        # Parse tickers from the URL path parameter
        ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
        
        if not ticker_list:
            return {
                "success": False,
                "message": "No valid tickers provided",
                "results": []
            }
        
        # Create event record for the batch update
        event_id = await record_system_event(
            database,
            "direct_yahoo_tickers_batch_price_update",
            "started",
            {"tickers_count": len(ticker_list), "first_ticker": ticker_list[0]}
        )
        
        # Check for missing tickers and add them to the database
        for ticker in ticker_list:
            check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
            existing = await database.fetch_one(check_query, {"ticker": ticker})
            
            if not existing:
                # Ticker doesn't exist, insert it first
                insert_query = """
                INSERT INTO securities (ticker, active, on_yfinance, created_at) 
                VALUES (:ticker, true, true, :now)
                """
                await database.execute(
                    insert_query, 
                    {
                        "ticker": ticker,
                        "now": datetime.utcnow()
                    }
                )
                logger.info(f"Created new security record for ticker: {ticker}")
        
        # Initialize DirectYahooFinanceClient
        client = DirectYahooFinanceClient()
        
        try:
            # Get batch price data
            logger.info(f"Fetching prices for batch of {len(ticker_list)} tickers using DirectYahooFinanceClient")
            batch_price_data = await client.get_batch_prices(ticker_list)
            
            if not batch_price_data:
                error_msg = "No price data returned for any tickers"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "tickers": ticker_list
                }
            
            # Process results for each ticker
            results = []
            updated_count = 0
            failed_tickers = []
            
            for ticker in ticker_list:
                if ticker not in batch_price_data:
                    # No data returned for this ticker
                    failed_tickers.append(ticker)
                    results.append({
                        "ticker": ticker,
                        "success": False,
                        "message": "No price data returned"
                    })
                    continue
                    
                price_data = batch_price_data[ticker]
                
                try:
                    # Update securities table with price data
                    update_query = """
                    UPDATE securities
                    SET 
                        current_price = :price,
                        day_open = :day_open,
                        day_high = :day_high,
                        day_low = :day_low,
                        volume = :volume,
                        last_updated = :updated_at,
                        price_timestamp = :price_timestamp
                    WHERE ticker = :ticker
                    """
                    
                    update_values = {
                        "ticker": ticker,
                        "price": price_data.get("price"),
                        "day_open": price_data.get("day_open"),
                        "day_high": price_data.get("day_high"),
                        "day_low": price_data.get("day_low"),
                        "volume": price_data.get("volume"),
                        "updated_at": datetime.now(),
                        "price_timestamp": price_data.get("price_timestamp")
                    }
                    
                    await database.execute(update_query, update_values)
                    updated_count += 1
                    
                    # Filter out empty values for response
                    filtered_price_data = {k: v for k, v in price_data.items() if v is not None}
                    
                    results.append({
                        "ticker": ticker,
                        "success": True,
                        "message": f"Successfully updated price",
                        "current_price": price_data.get("price"),
                        "fields_updated": len(filtered_price_data)
                    })
                    
                except Exception as ticker_error:
                    error_message = f"Error updating price for {ticker}: {str(ticker_error)}"
                    logger.error(error_message)
                    failed_tickers.append(ticker)
                    
                    results.append({
                        "ticker": ticker,
                        "success": False,
                        "message": error_message
                    })
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {
                    "tickers_count": len(ticker_list),
                    "updated_count": updated_count,
                    "failed_count": len(failed_tickers)
                }
            )
            
            return {
                "success": updated_count > 0,
                "message": f"Updated prices for {updated_count}/{len(ticker_list)} tickers",
                "total_tickers": len(ticker_list),
                "updated_count": updated_count,
                "failed_count": len(failed_tickers),
                "failed_tickers": failed_tickers if failed_tickers else None,
                "results": results
            }
            
        except Exception as e:
            error_message = f"Error in batch price update: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "tickers": ticker_list
            }
            
    except Exception as e:
        error_message = f"Error in batch ticker price update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker prices: {str(e)}"
        )

@app.post("/market/direct-update-ticker-metrics/{ticker}")
async def direct_update_ticker_metrics(
    ticker: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update company metrics for a single ticker using DirectYahooFinanceClient.
    """
    try:
        # Validate request
        if not ticker:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticker must be provided"
            )
            
        # Standardize ticker (uppercase)
        ticker = ticker.strip().upper()
        
        # Check if ticker exists in database
        check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
        existing = await database.fetch_one(check_query, {"ticker": ticker})
        
        if not existing:
            # Ticker doesn't exist, insert it first
            insert_query = """
            INSERT INTO securities (ticker, active, on_yfinance, created_at) 
            VALUES (:ticker, true, true, :now)
            """
            await database.execute(
                insert_query, 
                {
                    "ticker": ticker,
                    "now": datetime.utcnow()
                }
            )
            logger.info(f"Created new security record for ticker: {ticker}")
            
        # Create event record for tracking
        event_id = await record_system_event(
            database,
            "direct_yahoo_ticker_metrics_update",
            "started",
            {"ticker": ticker}
        )
        
        # Initialize DirectYahooFinanceClient
        client = DirectYahooFinanceClient()
        
        try:
            # Get company metrics data
            logger.info(f"Fetching company metrics for {ticker} using DirectYahooFinanceClient")
            metrics = await client.get_company_metrics(ticker)
            
            if not metrics or metrics.get("not_found"):
                error_msg = f"No metrics data returned for {ticker}"
                logger.error(error_msg)
                
                # Update event as failed
                await update_system_event(
                    database,
                    event_id,
                    "failed",
                    {"error": error_msg}
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "ticker": ticker
                }
            
            # Update securities table with company metrics
            update_query = """
            UPDATE securities
            SET 
                company_name = :company_name,
                current_price = :current_price,
                sector = :sector,
                industry = :industry,
                market_cap = :market_cap,
                pe_ratio = :pe_ratio,
                forward_pe = :forward_pe,
                dividend_rate = :dividend_rate,
                dividend_yield = :dividend_yield,
                beta = :beta,
                fifty_two_week_low = :fifty_two_week_low,
                fifty_two_week_high = :fifty_two_week_high,
                fifty_two_week_range = :fifty_two_week_range,
                eps = :eps,
                forward_eps = :forward_eps,
                last_metrics_update = :updated_at,
                last_updated = :updated_at
            WHERE ticker = :ticker
            """
            
            # Prepare values for update
            fifty_two_week_range = None
            if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                fifty_two_week_range = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
            
            update_values = {
                "ticker": ticker,
                "company_name": metrics.get("company_name"),
                "current_price": metrics.get("current_price"),
                "sector": metrics.get("sector"),
                "industry": metrics.get("industry"),
                "market_cap": metrics.get("market_cap"),
                "pe_ratio": metrics.get("pe_ratio"),
                "forward_pe": metrics.get("forward_pe"),
                "dividend_rate": metrics.get("dividend_rate"),
                "dividend_yield": metrics.get("dividend_yield"),
                "beta": metrics.get("beta"),
                "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                "fifty_two_week_range": fifty_two_week_range,
                "eps": metrics.get("eps"),
                "forward_eps": metrics.get("forward_eps"),
                "updated_at": datetime.now()
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_metrics = {k: v for k, v in metrics.items() if v is not None}
            
            # Update event as completed
            await update_system_event(
                database,
                event_id,
                "completed",
                {"ticker": ticker, "fields_updated": len(filtered_metrics)}
            )
            
            return {
                "success": True,
                "message": f"Successfully updated metrics for {ticker}",
                "ticker": ticker,
                "fields_updated": len(filtered_metrics),
                "metrics": filtered_metrics
            }
            
        except Exception as e:
            error_message = f"Error updating metrics for {ticker}: {str(e)}"
            logger.error(error_message)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
            return {
                "success": False,
                "message": error_message,
                "ticker": ticker
            }
            
    except Exception as e:
        error_message = f"Error in direct ticker metrics update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ticker metrics: {str(e)}"
        )

@app.post("/market/direct-update-tickers-metrics/{tickers}")
async def direct_update_multiple_ticker_metrics(
    tickers: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update company metrics for multiple tickers using DirectYahooFinanceClient.
    
    Tickers should be comma-separated in the URL, e.g.:
    /market/direct-update-tickers-metrics/AAPL,MSFT,GOOG,AMZN
    """
    # Parse tickers from the URL path parameter
    ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
    
    if not ticker_list:
        return {
            "success": False,
            "message": "No valid tickers provided",
            "results": []
        }
    
    # Create event record for the batch
    event_id = await record_system_event(
        database,
        "direct_yahoo_tickers_metrics_batch_update",
        "started",
        {"tickers_count": len(ticker_list), "first_ticker": ticker_list[0]}
    )
    
    # Initialize results
    results = []
    success_count = 0
    failed_count = 0
    
    # Initialize DirectYahooFinanceClient
    client = DirectYahooFinanceClient()
    
    # Process each ticker
    for ticker in ticker_list:
        try:
            # Check if ticker exists in database
            check_query = "SELECT ticker FROM securities WHERE ticker = :ticker"
            existing = await database.fetch_one(check_query, {"ticker": ticker})
            
            if not existing:
                # Ticker doesn't exist, insert it first
                insert_query = """
                INSERT INTO securities (ticker, active, on_yfinance) 
                VALUES (:ticker, true, true)
                """
                await database.execute(
                    insert_query, 
                    {
                        "ticker": ticker
                    }
                )
                logger.info(f"Created new security record for ticker: {ticker}")
            
            # Get company metrics data
            logger.info(f"Fetching company metrics for {ticker} using DirectYahooFinanceClient")
            metrics = await client.get_company_metrics(ticker)
            
            if isinstance(metrics, str):
                error_msg = f"Invalid metrics format (received string): {metrics}"
                logger.error(error_msg)
                
                results.append({
                    "ticker": ticker,
                    "success": False,
                    "message": error_msg
                })
                failed_count += 1
                continue
            
            if not metrics or metrics.get("not_found"):
                error_msg = f"No metrics data returned for {ticker}"
                logger.error(error_msg)
                
                results.append({
                    "ticker": ticker,
                    "success": False,
                    "message": error_msg
                })
                failed_count += 1
                continue
            
            # Update securities table with company metrics
            update_query = """
            UPDATE securities
            SET 
                company_name = :company_name,
                current_price = :current_price,
                sector = :sector,
                industry = :industry,
                market_cap = :market_cap,
                pe_ratio = :pe_ratio,
                forward_pe = :forward_pe,
                dividend_rate = :dividend_rate,
                dividend_yield = :dividend_yield,
                beta = :beta,
                fifty_two_week_low = :fifty_two_week_low,
                fifty_two_week_high = :fifty_two_week_high,
                fifty_two_week_range = :fifty_two_week_range,
                eps = :eps,
                forward_eps = :forward_eps,
                last_metrics_update = :updated_at,
                last_updated = :updated_at
            WHERE ticker = :ticker
            """
            
            # Prepare values for update
            fifty_two_week_range = None
            if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                fifty_two_week_range = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
            
            update_values = {
                "ticker": ticker,
                "company_name": metrics.get("company_name"),
                "current_price": metrics.get("current_price"),
                "sector": metrics.get("sector"),
                "industry": metrics.get("industry"),
                "market_cap": metrics.get("market_cap"),
                "pe_ratio": metrics.get("pe_ratio"),
                "forward_pe": metrics.get("forward_pe"),
                "dividend_rate": metrics.get("dividend_rate"),
                "dividend_yield": metrics.get("dividend_yield"),
                "beta": metrics.get("beta"),
                "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                "fifty_two_week_range": fifty_two_week_range,
                "eps": metrics.get("eps"),
                "forward_eps": metrics.get("forward_eps"),
                "updated_at": datetime.now()
            }
            
            await database.execute(update_query, update_values)
            
            # Filter out empty values for response
            filtered_metrics = {k: v for k, v in metrics.items() if v is not None}
            
            results.append({
                "ticker": ticker,
                "success": True,
                "message": f"Successfully updated metrics for {ticker}",
                "fields_updated": len(filtered_metrics)
            })
            success_count += 1
            
        except Exception as e:
            error_message = f"Error updating metrics for {ticker}: {str(e)}"
            logger.error(error_message)
            
            results.append({
                "ticker": ticker,
                "success": False,
                "message": error_message
            })
            failed_count += 1
    
    # Update event as completed
    await update_system_event(
        database,
        event_id,
        "completed",
        {
            "tickers_count": len(ticker_list),
            "success_count": success_count,
            "failed_count": failed_count
        }
    )
    
    return {
        "success": success_count > 0,
        "message": f"Updated metrics for {success_count}/{len(ticker_list)} tickers ({failed_count} failed)",
        "total_tickers": len(ticker_list),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }

# -- SCHEDULED AUTO RUNS 
@app.post("/market/update-all-securities-prices")
async def update_all_securities_prices():
    """
    Update current price data for all active tickers in the securities table
    using DirectYahooFinanceClient.
    
    This endpoint returns immediately with the count of securities to be updated,
    while the actual update process continues in the background.
    """
    try:
        # Create event record for the batch update
        event_id = await record_system_event(
            database,
            "direct_yahoo_all_securities_price_update",
            "started",
            {"description": "Starting price update for active securities"}
        )
        
        # Fetch all tickers from the securities table
        logger.info("Fetching active securities from the database")
        query = "SELECT ticker FROM security_usage WHERE status = 'Active' AND price_status = 'Requires Updating' ORDER BY last_updated ASC"
        results = await database.fetch_all(query)
        
        if not results:
            message = "No active securities found in the database"
            logger.info(message)
            
            # Update event as completed with no tickers
            await update_system_event(
                database,
                event_id,
                "completed",
                {"message": message, "tickers_count": 0}
            )
            
            return {
                "success": True,
                "message": message,
                "updated_count": 0
            }
        
        # Extract tickers from results
        ticker_list = [row['ticker'] for row in results]
        ticker_count = len(ticker_list)
        logger.info(f"Found {ticker_count} active securities to update")
        
        # Create the background task to handle the actual updates
        asyncio.create_task(process_price_updates(ticker_list, event_id))
        
        # Return immediately with the initial response
        return {
            "success": True,
            "message": f"Price Update Request received, {ticker_count} tickers identified for updating",
            "status": "processing",
            "ticker_count": ticker_count,
            "event_id": str(event_id)  # Convert to string if event_id is not JSON serializable
        }
            
    except Exception as e:
        error_message = f"Error in securities price update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security prices: {str(e)}"
        )

# Define the background task function that will run asynchronously
async def process_price_updates(ticker_list: list, event_id):
    """Process price updates for the given tickers in the background."""
    ticker_count = len(ticker_list)
    
    try:
        # Initialize DirectYahooFinanceClient
        client = DirectYahooFinanceClient()
        
        # Get batch price data
        logger.info(f"Fetching prices for all {ticker_count} active tickers using DirectYahooFinanceClient")
        batch_price_data = await client.get_batch_prices(ticker_list)
        
        if not batch_price_data:
            error_msg = "No price data returned for any tickers"
            logger.error(error_msg)
            
            # Update event as failed
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_msg}
            )
            return
        
        # Process results for each ticker
        updated_count = 0
        failed_tickers = []
        
        for ticker in ticker_list:
            if ticker not in batch_price_data:
                # No data returned for this ticker
                failed_tickers.append(ticker)
                continue
                
            price_data = batch_price_data[ticker]
            
            try:
                # Update securities table with price data
                update_query = """
                UPDATE securities
                SET 
                    current_price = :price,
                    day_open = :day_open,
                    day_high = :day_high,
                    day_low = :day_low,
                    volume = :volume,
                    last_updated = :updated_at,
                    price_timestamp = :price_timestamp
                WHERE ticker = :ticker
                """
                
                update_values = {
                    "ticker": ticker,
                    "price": price_data.get("price"),
                    "day_open": price_data.get("day_open"),
                    "day_high": price_data.get("day_high"),
                    "day_low": price_data.get("day_low"),
                    "volume": price_data.get("volume"),
                    "updated_at": datetime.now(),
                    "price_timestamp": price_data.get("price_timestamp")
                }
                
                await database.execute(update_query, update_values)
                updated_count += 1
                
            except Exception as ticker_error:
                error_message = f"Error updating price for {ticker}: {str(ticker_error)}"
                logger.error(error_message)
                failed_tickers.append(ticker)
        
        # Update event as completed
        await update_system_event(
            database,
            event_id,
            "completed",
            {
                "tickers_count": ticker_count,
                "updated_count": updated_count,
                "failed_count": len(failed_tickers)
            }
        )
        
        logger.info(f"Background price update completed: {updated_count}/{ticker_count} tickers updated")
        
    except Exception as e:
        error_message = f"Error in batch price update: {str(e)}"
        logger.error(error_message)
        
        # Update event as failed
        await update_system_event(
            database,
            event_id,
            "failed",
            {"error": error_message}
        )
        
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())

@app.post("/market/update-all-securities-metrics")
async def update_all_securities_metrics():
    """
    Update company metrics for all active securities in the database
    using YahooQueryClient.
    
    This endpoint returns immediately with the count of securities to be updated,
    while the actual metrics update process continues in the background.
    """
    try:
        # Create event record for the batch update
        event_id = await record_system_event(
            database,
            "yahoo_all_securities_metrics_update",
            "started",
            {"description": "Starting company metrics update for active securities"}
        )
        
        # Fetch all tickers from the securities table
        logger.info("Fetching active securities from the database")
        query = "SELECT ticker FROM security_usage WHERE metrics_status = 'Requires Updating' ORDER BY last_updated ASC"
        results = await database.fetch_all(query)
        
        if not results:
            message = "No active securities found that require metrics updates"
            logger.info(message)
            
            # Update event as completed with no tickers
            await update_system_event(
                database,
                event_id,
                "completed",
                {"message": message, "tickers_count": 0}
            )
            
            return {
                "success": True,
                "message": message,
                "updated_count": 0
            }
        
        # Extract tickers from results
        ticker_list = [row['ticker'] for row in results]
        ticker_count = len(ticker_list)
        logger.info(f"Found {ticker_count} active securities to update metrics")
        
        # Create the background task to handle the actual metrics updates
        asyncio.create_task(process_metrics_updates(ticker_list, event_id))
        
        # Return immediately with the initial response
        return {
            "success": True,
            "message": f"Metrics Update Request received, {ticker_count} tickers identified for updating",
            "status": "processing",
            "ticker_count": ticker_count,
            "event_id": str(event_id)  # Convert to string if event_id is not JSON serializable
        }
            
    except Exception as e:
        error_message = f"Error in securities metrics update: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security metrics: {str(e)}"
        )

# Define the background task function for metrics updates
async def process_metrics_updates(ticker_list: list, event_id):
    """Process company metrics updates for the given tickers in the background."""
    ticker_count = len(ticker_list)
    success_count = 0
    failed_count = 0
    
    try:
        # Initialize YahooQueryClient
        client = YahooQueryClient()
        
        # Process each ticker
        for ticker in ticker_list:
            try:
                # Get company metrics data
                logger.info(f"Fetching company metrics for {ticker}")
                metrics = await client.get_company_metrics(ticker)
                
                if isinstance(metrics, str):
                    error_msg = f"Invalid metrics format (received string): {metrics}"
                    logger.error(error_msg)
                    failed_count += 1
                    continue
                
                if not metrics or metrics.get("not_found"):
                    error_msg = f"No metrics data returned for {ticker}"
                    logger.error(error_msg)
                    failed_count += 1
                    continue
                
                # Update securities table with company metrics
                update_query = """
                UPDATE securities
                SET 
                    company_name = :company_name,
                    current_price = :current_price,
                    sector = :sector,
                    industry = :industry,
                    market_cap = :market_cap,
                    pe_ratio = :pe_ratio,
                    forward_pe = :forward_pe,
                    dividend_rate = :dividend_rate,
                    dividend_yield = :dividend_yield,
                    beta = :beta,
                    fifty_two_week_low = :fifty_two_week_low,
                    fifty_two_week_high = :fifty_two_week_high,
                    fifty_two_week_range = :fifty_two_week_range,
                    eps = :eps,
                    forward_eps = :forward_eps,
                    last_metrics_update = :updated_at,
                    last_updated = :updated_at
                WHERE ticker = :ticker
                """
                
                # Prepare values for update
                fifty_two_week_range = None
                if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                    fifty_two_week_range = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
                
                update_values = {
                    "ticker": ticker,
                    "company_name": metrics.get("company_name"),
                    "current_price": metrics.get("current_price"),
                    "sector": metrics.get("sector"),
                    "industry": metrics.get("industry"),
                    "market_cap": metrics.get("market_cap"),
                    "pe_ratio": metrics.get("pe_ratio"),
                    "forward_pe": metrics.get("forward_pe"),
                    "dividend_rate": metrics.get("dividend_rate"),
                    "dividend_yield": metrics.get("dividend_yield"),
                    "beta": metrics.get("beta"),
                    "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                    "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                    "fifty_two_week_range": fifty_two_week_range,
                    "eps": metrics.get("eps"),
                    "forward_eps": metrics.get("forward_eps"),
                    "updated_at": datetime.now()
                }
                
                await database.execute(update_query, update_values)
                success_count += 1
                
            except Exception as e:
                error_message = f"Error updating metrics for {ticker}: {str(e)}"
                logger.error(error_message)
                failed_count += 1
        
        # Update event as completed
        await update_system_event(
            database,
            event_id,
            "completed",
            {
                "tickers_count": ticker_count,
                "success_count": success_count,
                "failed_count": failed_count
            }
        )
        
        logger.info(f"Background metrics update completed: {success_count}/{ticker_count} tickers updated")
        
    except Exception as e:
        error_message = f"Error in batch metrics update: {str(e)}"
        logger.error(error_message)
        
        # Update event as failed
        await update_system_event(
            database,
            event_id,
            "failed",
            {"error": error_message}
        )
        
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())

@app.get("/system/warmup")
async def warmup_system():
    """
    Endpoint to wake up the Render service before scheduled tasks.
    This ensures the service is fully initialized when cron jobs run.
    """
    try:
        # Perform minimal database operation to ensure connections are ready
        query = "SELECT 1 as health_check"
        result = await database.fetch_one(query)
        
        # Return success response
        return {
            "success": True,
            "message": "System warmed up successfully",
            "timestamp": datetime.now().isoformat(),
            "health_check": result["health_check"] if result else None
        }
    except Exception as e:
        logger.error(f"Error during system warmup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warm up system: {str(e)}"
        )

# ----- POSITION MANAGEMENT  -----
# INCLUDES POSTIONS, CASH, METALS, CRYPTO, REAL ESTATE
# Security positions

@app.get("/positions/{account_id}")
async def get_positions(account_id: int, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Get positions for the account
        positions_query = positions.select().where(positions.c.account_id == account_id)
        result = await database.fetch_all(positions_query)
        
        positions_list = []
        for row in result:
            # Calculate value
            value = row["shares"] * row["price"]
            
            position_data = {
                "id": row["id"],
                "account_id": row["account_id"],
                "ticker": row["ticker"],
                "shares": row["shares"],
                "price": row["price"],
                "value": value,
                "date": row["date"].isoformat() if row["date"] else None
            }
            
            # Add cost_basis and purchase_date if they exist
            if "cost_basis" in row and row["cost_basis"] is not None:
                position_data["cost_basis"] = row["cost_basis"]
            
            if "purchase_date" in row and row["purchase_date"] is not None:
                position_data["purchase_date"] = row["purchase_date"].isoformat()
                
            positions_list.append(position_data)
        
        return {"positions": positions_list}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch positions: {str(e)}")

@app.post("/positions/{account_id}", status_code=status.HTTP_201_CREATED)
async def add_position(
    account_id: int, 
    position: PositionCreate, 
    current_user: dict = Depends(get_current_user)
):
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Add position
        query = positions.insert().values(
            account_id=account_id,
            ticker=position.ticker.upper(),
            shares=position.shares,
            price=position.price,
            cost_basis=position.cost_basis,
            purchase_date=datetime.strptime(position.purchase_date, "%Y-%m-%d").date(),
            date=datetime.utcnow()
        )
        position_id = await database.execute(query)
        
        # Calculate position value (but don't update account balance)
        position_value = position.shares * position.price
        
        return {
            "message": "Position added successfully", 
            "position_id": position_id,
            "position_value": position_value
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.put("/positions/{position_id}")
async def update_position(position_id: int, position: PositionCreate, current_user: dict = Depends(get_current_user)):
    try:
        # Get position and check if it belongs to the user
        position_query = select([positions, accounts.c.user_id, accounts.c.id.label("account_id")]).select_from(
            positions.join(accounts, positions.c.account_id == accounts.c.id)
        ).where(positions.c.id == position_id)
        
        position_data = await database.fetch_one(position_query)
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Update position
        update_query = positions.update().where(
            positions.c.id == position_id
        ).values(
            ticker=position.ticker.upper(),
            shares=position.shares,
            price=position.price,
            cost_basis=position.cost_basis,
            purchase_date=datetime.strptime(position.purchase_date, "%Y-%m-%d").date(),
            date=datetime.utcnow()
        )
        await database.execute(update_query)
        
        # Calculate old and new values for informational purposes only
        old_value = position_data["shares"] * position_data["price"]
        new_value = position.shares * position.price
        value_difference = new_value - old_value
        
        return {
            "message": "Position updated successfully",
            "previous_value": old_value,
            "new_value": new_value,
            "value_change": value_difference
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.delete("/positions/{position_id}")
async def delete_position(position_id: int, current_user: dict = Depends(get_current_user)):
    try:
        # Get position and check if it belongs to the user
        position_query = select([positions, accounts.c.user_id, accounts.c.id.label("account_id")]).select_from(
            positions.join(accounts, positions.c.account_id == accounts.c.id)
        ).where(positions.c.id == position_id)
        
        position_data = await database.fetch_one(position_query)
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Calculate value for informational purposes
        position_value = position_data["shares"] * position_data["price"]
        
        # Delete position
        delete_query = positions.delete().where(positions.c.id == position_id)
        await database.execute(delete_query)
        
        return {
            "message": "Position deleted successfully",
            "removed_value": position_value
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")
        
# Cash positions
@app.get("/cash/{account_id}")
async def get_cash_positions(account_id: int, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Get cash positions for the account
        query = """
        SELECT * FROM cash_positions 
        WHERE account_id = :account_id
        ORDER BY name ASC
        """
        result = await database.fetch_all(query=query, values={"account_id": account_id})
        
        cash_positions = []
        for row in dict(row):
            position = dict(row)
            
            # Calculate interest metrics
            amount = float(position.get("amount", 0))
            interest_rate = float(position.get("interest_rate") or 0)
            annual_interest = amount * interest_rate
            monthly_interest = annual_interest / 12
            
            position["annual_interest"] = annual_interest
            position["monthly_interest"] = monthly_interest
            
            # Format dates as ISO strings
            if "maturity_date" in position and position["maturity_date"]:
                position["maturity_date"] = position["maturity_date"].isoformat()
            if "created_at" in position and position["created_at"]:
                position["created_at"] = position["created_at"].isoformat()
            if "updated_at" in position and position["updated_at"]:
                position["updated_at"] = position["updated_at"].isoformat()
                
            cash_positions.append(position)
            
        return {"cash_positions": cash_positions}
    except Exception as e:
        logger.error(f"Error fetching cash positions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch cash positions: {str(e)}")

@app.post("/cash/{account_id}", status_code=status.HTTP_201_CREATED)
async def add_cash_position(account_id: int, position: CashPositionCreate, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Add cash position
        query = """
        INSERT INTO cash_positions (
            account_id, cash_type, name, amount, interest_rate, interest_period, 
            maturity_date, notes
        ) VALUES (
            :account_id, :cash_type, :name, :amount, :interest_rate, :interest_period,
            :maturity_date, :notes
        ) RETURNING id
        """
        values = {
            "account_id": account_id,
            "cash_type": position.cash_type,
            "name": position.name,
            "amount": position.amount,
            "interest_rate": position.interest_rate,
            "interest_period": position.interest_period,
            "maturity_date": datetime.strptime(position.maturity_date, "%Y-%m-%d").date() if position.maturity_date else None,
            "notes": position.notes
        }
        
        result = await database.fetch_one(query=query, values=values)
        position_id = result["id"]
        
        return {
            "message": "Cash position added successfully",
            "position_id": position_id,
            "position_value": position.amount
        }
    except Exception as e:
        logger.error(f"Error adding cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add cash position: {str(e)}")

@app.put("/cash/{position_id}")
async def update_cash_position(position_id: int, position: CashPositionUpdate, current_user: dict = Depends(get_current_user)):
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT cp.*, a.user_id, a.balance, a.id as account_id
        FROM cash_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Build update dictionary with only provided fields
        update_values = {}
        for key, value in position.dict(exclude_unset=True).items():
            if key == 'maturity_date' and value is not None:
                update_values[key] = datetime.strptime(value, "%Y-%m-%d").date()
            else:
                update_values[key] = value
        
        # Only update if there are values to update
        if update_values:
            # Construct dynamic query with only the fields that need updating
            set_clause = ", ".join([f"{key} = :{key}" for key in update_values.keys()])
            query = f"""
            UPDATE cash_positions 
            SET {set_clause}, updated_at = :updated_at
            WHERE id = :position_id
            RETURNING id
            """
            
            # Add position_id and timestamp to values
            update_values["position_id"] = position_id
            update_values["updated_at"] = datetime.utcnow()
            
            await database.execute(query=query, values=update_values)
            
        return {"message": "Cash position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update cash position: {str(e)}")

@app.delete("/cash/{position_id}")
async def delete_cash_position(position_id: int, current_user: dict = Depends(get_current_user)):
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT cp.*, a.user_id, a.id as account_id
        FROM cash_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Delete the position
        delete_query = """
        DELETE FROM cash_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {"message": "Cash position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete cash position: {str(e)}")

# ----- Cryptocurrency Endpoints -----
@app.get("/crypto/{account_id}")
async def get_crypto_positions(account_id: int, current_user: dict = Depends(get_current_user)):
    """Get all cryptocurrency positions for a specific account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Get crypto positions for the account
        query = """
        SELECT * FROM crypto_positions 
        WHERE account_id = :account_id
        ORDER BY coin_type ASC
        """
        result = await database.fetch_all(query=query, values={"account_id": account_id})
        
        crypto_positions = [dict(row) for row in result]
        
        # Calculate additional values for frontend display
        for position in crypto_positions:
            position["total_value"] = position["quantity"] * position["current_price"]
            position["gain_loss"] = position["total_value"] - (position["quantity"] * position["purchase_price"])
            position["gain_loss_percent"] = ((position["current_price"] / position["purchase_price"]) - 1) * 100 if position["purchase_price"] > 0 else 0
            
            # Convert tags from array to list if needed
            if position.get("tags") and isinstance(position["tags"], str):
                position["tags"] = eval(position["tags"])  # Safely convert string representation to list
                
            # Format dates as ISO strings
            if "purchase_date" in position and position["purchase_date"]:
                position["purchase_date"] = position["purchase_date"].isoformat() if hasattr(position["purchase_date"], "isoformat") else position["purchase_date"]
            if "created_at" in position and position["created_at"]:
                position["created_at"] = position["created_at"].isoformat() if hasattr(position["created_at"], "isoformat") else position["created_at"]
            if "updated_at" in position and position["updated_at"]:
                position["updated_at"] = position["updated_at"].isoformat() if hasattr(position["updated_at"], "isoformat") else position["updated_at"]
                
        return {"crypto_positions": crypto_positions}
    except Exception as e:
        logger.error(f"Error fetching crypto positions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch crypto positions: {str(e)}")

@app.post("/crypto/{account_id}", status_code=status.HTTP_201_CREATED)
async def add_crypto_position(account_id: int, position: CryptoPositionCreate, current_user: dict = Depends(get_current_user)):
    """Add a new cryptocurrency position to an account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Prepare tags for storage
        tags_value = position.tags if position.tags else []
        
        # Add crypto position
        query = """
        INSERT INTO crypto_positions (
            account_id, coin_type, coin_symbol, quantity, purchase_price, purchase_date, storage_type, notes, tags, is_favorite
        ) VALUES (
            :account_id, :coin_type, :coin_symbol, :quantity, :purchase_price,
            :purchase_date, :storage_type, :notes, :tags, :is_favorite
        ) RETURNING id
        """
        values = {
            "account_id": account_id,
            "coin_type": position.coin_type,
            "coin_symbol": position.coin_symbol,
            "quantity": position.quantity,
            "purchase_price": position.purchase_price,
            "purchase_date": datetime.strptime(position.purchase_date, "%Y-%m-%d").date() if position.purchase_date else None,
            "storage_type": position.storage_type,
            "notes": position.notes,
            "tags": tags_value,
            "is_favorite": position.is_favorite
        }
        
        result = await database.fetch_one(query=query, values=values)
        position_id = result["id"]
        
        position_value = position.quantity * position.current_price
        
        return {
            "message": "Crypto position added successfully",
            "position_id": position_id,
            "position_value": position_value
        }
    except Exception as e:
        logger.error(f"Error adding crypto position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add crypto position: {str(e)}")

@app.put("/crypto/{position_id}")
async def update_crypto_position(position_id: int, position: CryptoPositionUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing cryptocurrency position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT cp.*, a.user_id, a.id as account_id
        FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Build update dictionary with only provided fields
        update_values = {}
        for key, value in position.dict(exclude_unset=True).items():
            if key == 'purchase_date' and value is not None:
                update_values[key] = datetime.strptime(value, "%Y-%m-%d").date()
            elif key == 'tags' and value is not None:
                update_values[key] = value  # Store as array
            else:
                update_values[key] = value
        
        # Only update if there are values to update
        if update_values:
            # Construct dynamic query with only the fields that need updating
            set_clause = ", ".join([f"{key} = :{key}" for key in update_values.keys()])
            query = f"""
            UPDATE crypto_positions 
            SET {set_clause} 
            WHERE id = :position_id
            RETURNING id
            """
            
            # Add position_id to values
            update_values["position_id"] = position_id
            
            await database.execute(query=query, values=update_values)
            
            # Account balance updates are now handled by enriched_accounts table
            # No need to update account balance here
        
        return {"message": "Crypto position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating crypto position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update crypto position: {str(e)}")

@app.delete("/crypto/{position_id}")
async def delete_crypto_position(position_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a cryptocurrency position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT cp.*, a.user_id, a.id as account_id
        FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Delete the position
        delete_query = """
        DELETE FROM crypto_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {"message": "Crypto position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting crypto position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete crypto position: {str(e)}")

# ----- Precious Metals Endpoints -----
@app.get("/metals/{account_id}")
async def get_metal_positions(account_id: int, current_user: dict = Depends(get_current_user)):
    """Get all precious metal positions for a specific account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Get metal positions for the account
        query = """
        SELECT * FROM metal_positions 
        WHERE account_id = :account_id
        ORDER BY metal_type ASC
        """
        result = await database.fetch_all(query=query, values={"account_id": account_id})
        
        metal_positions = [dict(row) for row in result]
        
        # Calculate additional values and format dates
        for position in metal_positions:
            # Use the cost_basis if provided, otherwise use purchase_price
            cost_basis = position.get("cost_basis") or position["purchase_price"]
            
            # Calculate value based on current price (would need to be fetched from metals price table)
            # For now, using purchase price as placeholder
            current_price = position["purchase_price"]  # Replace with actual current price
            
            position["value"] = position["quantity"] * current_price
            position["gain_loss"] = position["value"] - (position["quantity"] * cost_basis)
            position["gain_loss_percent"] = ((current_price / cost_basis) - 1) * 100 if cost_basis > 0 else 0
            
            # Format dates as ISO strings
            if "purchase_date" in position and position["purchase_date"]:
                position["purchase_date"] = position["purchase_date"].isoformat() if hasattr(position["purchase_date"], "isoformat") else position["purchase_date"]
            if "created_at" in position and position["created_at"]:
                position["created_at"] = position["created_at"].isoformat() if hasattr(position["created_at"], "isoformat") else position["created_at"]
            if "updated_at" in position and position["updated_at"]:
                position["updated_at"] = position["updated_at"].isoformat() if hasattr(position["updated_at"], "isoformat") else position["updated_at"]
                
        return {"metal_positions": metal_positions}
    except Exception as e:
        logger.error(f"Error fetching metal positions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch metal positions: {str(e)}")

@app.post("/metals/{account_id}", status_code=status.HTTP_201_CREATED)
async def add_metal_position(account_id: int, position: MetalPositionCreate, current_user: dict = Depends(get_current_user)):
    """Add a new precious metal position to an account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Use the provided cost_basis or default to purchase_price
        cost_basis = position.cost_basis if position.cost_basis is not None else position.purchase_price
        
        # Add metal position
        query = """
        INSERT INTO metal_positions (
            account_id, metal_type, quantity, unit, purity, purchase_price, 
            cost_basis, purchase_date, storage_location, description
        ) VALUES (
            :account_id, :metal_type, :quantity, :unit, :purity, :purchase_price,
            :cost_basis, :purchase_date, :storage_location, :description
        ) RETURNING id
        """
        values = {
            "account_id": account_id,
            "metal_type": position.metal_type,
            "quantity": position.quantity,
            "unit": position.unit,
            "purity": position.purity,
            "purchase_price": position.purchase_price,
            "cost_basis": cost_basis,
            "purchase_date": datetime.strptime(position.purchase_date, "%Y-%m-%d").date() if position.purchase_date else None,
            "storage_location": position.storage_location,
            "description": position.description
        }
        
        result = await database.fetch_one(query=query, values=values)
        position_id = result["id"]
        
        # Calculate position value for response
        position_value = position.quantity * position.purchase_price
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {
            "message": "Metal position added successfully",
            "position_id": position_id,
            "position_value": position_value
        }
    except Exception as e:
        logger.error(f"Error adding metal position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add metal position: {str(e)}")

@app.put("/metals/{position_id}")
async def update_metal_position(position_id: int, position: MetalPositionUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing precious metal position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT mp.*, a.user_id, a.id as account_id
        FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id
        WHERE mp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Build update dictionary with only provided fields
        update_values = {}
        for key, value in position.dict(exclude_unset=True).items():
            if key == 'purchase_date' and value is not None:
                update_values[key] = datetime.strptime(value, "%Y-%m-%d").date()
            else:
                update_values[key] = value
        
        # Only update if there are values to update
        if update_values:
            # Construct dynamic query with only the fields that need updating
            set_clause = ", ".join([f"{key} = :{key}" for key in update_values.keys()])
            query = f"""
            UPDATE metal_positions 
            SET {set_clause} 
            WHERE id = :position_id
            RETURNING id
            """
            
            # Add position_id to values
            update_values["position_id"] = position_id
            
            await database.execute(query=query, values=update_values)
            
            # Account balance updates are now handled by enriched_accounts table
            # No need to update account balance here
        
        return {"message": "Metal position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating metal position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update metal position: {str(e)}")

@app.delete("/metals/{position_id}")
async def delete_metal_position(position_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a precious metal position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT mp.*, a.user_id, a.id as account_id
        FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id
        WHERE mp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Delete the position
        delete_query = """
        DELETE FROM metal_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {"message": "Metal position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting metal position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete metal position: {str(e)}")

# ---- Real Estate Endpoints ------ 
@app.get("/realestate/{account_id}")
async def get_real_estate_positions(account_id: int, current_user: dict = Depends(get_current_user)):
    """Get all real estate positions for a specific account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Get real estate positions for the account
        query = """
        SELECT * FROM real_estate_positions 
        WHERE account_id = :account_id
        ORDER BY property_name ASC, address ASC
        """
        result = await database.fetch_all(query=query, values={"account_id": account_id})
        
        real_estate_positions = [dict(row) for row in result]
        
        # Calculate additional values and format dates
        for position in real_estate_positions:
            # Calculate gain/loss and percentages
            position["gain_loss"] = position["current_value"] - position["purchase_price"]
            position["gain_loss_percent"] = ((position["current_value"] / position["purchase_price"]) - 1) * 100 if position["purchase_price"] > 0 else 0
            
            # Calculate annual return (annualized) if purchase date is available
            if position.get("purchase_date"):
                purchase_date = position["purchase_date"]
                if isinstance(purchase_date, str):
                    purchase_date = datetime.strptime(purchase_date, "%Y-%m-%d").date()
                
                days_owned = (datetime.now().date() - purchase_date).days
                years_owned = days_owned / 365.25  # Account for leap years
                
                if years_owned > 0:
                    # Calculate annualized return
                    annualized_return = ((position["current_value"] / position["purchase_price"]) ** (1 / years_owned)) - 1
                    position["annualized_return_percent"] = annualized_return * 100
                else:
                    position["annualized_return_percent"] = 0
            else:
                position["annualized_return_percent"] = 0
            
            # Format dates as ISO strings
            if "purchase_date" in position and position["purchase_date"]:
                position["purchase_date"] = position["purchase_date"].isoformat() if hasattr(position["purchase_date"], "isoformat") else position["purchase_date"]
            
            if "last_zestimate_date" in position and position["last_zestimate_date"]:
                position["last_zestimate_date"] = position["last_zestimate_date"].isoformat() if hasattr(position["last_zestimate_date"], "isoformat") else position["last_zestimate_date"]
                
            if "created_at" in position and position["created_at"]:
                position["created_at"] = position["created_at"].isoformat() if hasattr(position["created_at"], "isoformat") else position["created_at"]
                
            if "updated_at" in position and position["updated_at"]:
                position["updated_at"] = position["updated_at"].isoformat() if hasattr(position["updated_at"], "isoformat") else position["updated_at"]
                
        return {"real_estate_positions": real_estate_positions}
    except Exception as e:
        logger.error(f"Error fetching real estate positions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch real estate positions: {str(e)}")

@app.post("/realestate/{account_id}", status_code=status.HTTP_201_CREATED)
async def add_real_estate_position(account_id: int, position: RealEstatePositionCreate, current_user: dict = Depends(get_current_user)):
    """Add a new real estate position to an account"""
    try:
        # Check if the account belongs to the user
        account_query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        account = await database.fetch_one(account_query)
        
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Add real estate position
        query = """
        INSERT INTO real_estate_positions (
            account_id, property_name, address, city, state, zip_code,
            property_type, purchase_price, current_value, purchase_date, 
            square_footage, bedrooms, bathrooms, lot_size_sqft, 
            year_built, property_taxes, zillow_id, last_zestimate_date, notes
        ) VALUES (
            :account_id, :property_name, :address, :city, :state, :zip_code,
            :property_type, :purchase_price, :current_value, :purchase_date, 
            :square_footage, :bedrooms, :bathrooms, :lot_size_sqft, 
            :year_built, :property_taxes, :zillow_id, :last_zestimate_date, :notes
        ) RETURNING id
        """
        values = {
            "account_id": account_id,
            "property_name": position.property_name,
            "address": position.address,
            "city": position.city,
            "state": position.state,
            "zip_code": position.zip_code,
            "property_type": position.property_type,
            "purchase_price": position.purchase_price,
            "current_value": position.current_value,
            "purchase_date": datetime.strptime(position.purchase_date, "%Y-%m-%d").date() if position.purchase_date else None,
            "square_footage": position.square_footage,
            "bedrooms": position.bedrooms,
            "bathrooms": position.bathrooms,
            "lot_size_sqft": position.lot_size_sqft,
            "year_built": position.year_built,
            "property_taxes": position.property_taxes,
            "zillow_id": position.zillow_id,
            "last_zestimate_date": datetime.strptime(position.last_zestimate_date, "%Y-%m-%d").date() if position.last_zestimate_date else None,
            "notes": position.notes
        }
        
        result = await database.fetch_one(query=query, values=values)
        position_id = result["id"]
        
        # Calculate position value for response
        position_value = position.current_value
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {
            "message": "Real estate position added successfully",
            "position_id": position_id,
            "position_value": position_value
        }
    except Exception as e:
        logger.error(f"Error adding real estate position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add real estate position: {str(e)}")

@app.put("/realestate/{position_id}")
async def update_real_estate_position(position_id: int, position: RealEstatePositionUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing real estate position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT rep.*, a.user_id, a.id as account_id
        FROM real_estate_positions rep
        JOIN accounts a ON rep.account_id = a.id
        WHERE rep.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Build update dictionary with only provided fields
        update_values = {}
        for key, value in position.dict(exclude_unset=True).items():
            if key == 'purchase_date' and value is not None:
                update_values[key] = datetime.strptime(value, "%Y-%m-%d").date()
            elif key == 'last_zestimate_date' and value is not None:
                update_values[key] = datetime.strptime(value, "%Y-%m-%d").date()
            else:
                update_values[key] = value
        
        # Only update if there are values to update
        if update_values:
            # Construct dynamic query with only the fields that need updating
            set_clause = ", ".join([f"{key} = :{key}" for key in update_values.keys()])
            query = f"""
            UPDATE real_estate_positions 
            SET {set_clause}, updated_at = :updated_at
            WHERE id = :position_id
            RETURNING id
            """
            
            # Add position_id and timestamp to values
            update_values["position_id"] = position_id
            update_values["updated_at"] = datetime.utcnow()
            
            await database.execute(query=query, values=update_values)
            
            # Account balance updates are now handled by enriched_accounts table
            # No need to update account balance here
        
        return {"message": "Real estate position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating real estate position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update real estate position: {str(e)}")

@app.delete("/realestate/{position_id}")
async def delete_real_estate_position(position_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a real estate position"""
    try:
        # Get position and check if it belongs to the user
        check_query = """
        SELECT rep.*, a.user_id, a.id as account_id
        FROM real_estate_positions rep
        JOIN accounts a ON rep.account_id = a.id
        WHERE rep.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Delete the position
        delete_query = """
        DELETE FROM real_estate_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Account balance updates are now handled by enriched_accounts table
        # No need to update account balance here
        
        return {"message": "Real estate position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting real estate position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete real estate position: {str(e)}")



#----RECONCILIATION WORKFLOW FOR ACCOUNTS




@app.get("/market/security-statistics")
async def get_security_statistics():
    """
    Get statistics about securities in the database, including price update information,
    asset counts, and metrics age information.
    """
    try:
        # Create event record
        event_id = await record_system_event(
            database,
            "security_statistics_generation",
            "started",
            {"description": "Generating security statistics"}
        )

        # Query for all securities from security_usage table
        query = "SELECT * FROM security_usage"
        results = await database.fetch_all(query)
        
        if not results:
            message = "No securities found in the database"
            logger.info(message)
            
            # Update event as completed with no securities
            await update_system_event(
                database,
                event_id,
                "completed",
                {"message": message, "securities_count": 0}
            )
            
            return {
                "success": True,
                "message": message,
                "statistics": {}
            }

        # Convert to list of dictionaries
        securities = [dict(row) for row in results]
        
        # Calculate statistics
        total_count = len(securities)
        
        # Count by asset type
        asset_type_counts = {}
        for security in securities:
            asset_type = security.get('asset_type')
            if asset_type:
                asset_type_counts[asset_type] = asset_type_counts.get(asset_type, 0) + 1
                
        # Active securities
        active_securities = [s for s in securities if s.get('status') == 'Active']
        active_count = len(active_securities)
        
        # Price update information
        all_last_updated = [s.get('last_updated') for s in securities if s.get('last_updated')]
        most_recent_update = max(all_last_updated) if all_last_updated else None
        
        # Active securities price range
        active_last_updated = [s.get('last_updated') for s in active_securities if s.get('last_updated')]
        active_price_min = min(active_last_updated) if active_last_updated else None
        active_price_max = max(active_last_updated) if active_last_updated else None
        
        # Active price age information
        active_price_age_minutes = [s.get('price_age_minutes') for s in active_securities if s.get('price_age_minutes') is not None]
        min_active_price_age = min(active_price_age_minutes) if active_price_age_minutes else None
        max_active_price_age = max(active_price_age_minutes) if active_price_age_minutes else None
        avg_active_price_age = sum(active_price_age_minutes) / len(active_price_age_minutes) if active_price_age_minutes else None
        
        # Metrics age information for active securities
        active_metrics_age = [s.get('metrics_age_minutes') for s in active_securities if s.get('metrics_age_minutes') is not None]
        min_metrics_age = min(active_metrics_age) if active_metrics_age else None
        max_metrics_age = max(active_metrics_age) if active_metrics_age else None
        avg_metrics_age = sum(active_metrics_age) / len(active_metrics_age) if active_metrics_age else None
        
        # Status counts
        price_status_counts = {}
        metrics_status_counts = {}
        for security in securities:
            price_status = security.get('price_status')
            if price_status:
                price_status_counts[price_status] = price_status_counts.get(price_status, 0) + 1
                
            metrics_status = security.get('metrics_status')
            if metrics_status:
                metrics_status_counts[metrics_status] = metrics_status_counts.get(metrics_status, 0) + 1
        
        # Position counts
        securities_with_positions = sum(1 for s in securities if s.get('total_positions', 0) > 0)
        active_with_positions = sum(1 for s in active_securities if s.get('total_positions', 0) > 0)
        
        # Format timestamps for readability
        formatted_most_recent = most_recent_update.strftime("%Y-%m-%d %H:%M:%S") if most_recent_update else None
        formatted_active_min = active_price_min.strftime("%Y-%m-%d %H:%M:%S") if active_price_min else None
        formatted_active_max = active_price_max.strftime("%Y-%m-%d %H:%M:%S") if active_price_max else None
        
        # Construct statistics response
        statistics = {
            "total_securities": total_count,
            "by_asset_type": asset_type_counts,
            "active_securities": active_count,
            "prices_last_updated": formatted_most_recent,
            "active_price_update_range": {
                "min": formatted_active_min,
                "max": formatted_active_max,
            },
            "active_price_age_minutes": {
                "min": round(min_active_price_age, 2) if min_active_price_age is not None else None,
                "max": round(max_active_price_age, 2) if max_active_price_age is not None else None,
                "avg": round(avg_active_price_age, 2) if avg_active_price_age is not None else None
            },
            "active_metrics_age_minutes": {
                "min": round(min_metrics_age, 2) if min_metrics_age is not None else None,
                "max": round(max_metrics_age, 2) if max_metrics_age is not None else None,
                "avg": round(avg_metrics_age, 2) if avg_metrics_age is not None else None
            },
            "price_status_counts": price_status_counts,
            "metrics_status_counts": metrics_status_counts,
            "securities_with_positions": securities_with_positions,
            "active_with_positions": active_with_positions,
            "price_needs_update": price_status_counts.get("Requires Updating", 0),
            "metrics_needs_update": metrics_status_counts.get("Requires Updating", 0)
        }
        
        # Update event as completed
        await update_system_event(
            database,
            event_id,
            "completed",
            {"message": "Successfully generated security statistics", "securities_count": total_count}
        )
        
        return {
            "success": True,
            "message": "Security statistics generated successfully",
            "statistics": statistics,
            "timestamp": datetime.now().isoformat()
        }
            
    except Exception as e:
        error_message = f"Error generating security statistics: {str(e)}"
        logger.error(error_message)
        
        # Update event status if we have an event_id
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": error_message}
            )
            
        # Log detailed error for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate security statistics: {str(e)}"
        )

@app.get("/portfolio/snapshots")
async def get_portfolio_snapshots(
    timeframe: str = Query("1m", description="Time period for snapshots: 1d, 1w, 1m, 3m, 6m, 1y, all"),
    group_by: str = Query("day", description="Group results by: day, week, month"),
    include_cost_basis: bool = Query(True, description="Include cost basis data"),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve portfolio snapshots with trend analysis and aggregated values.
    Used for the dashboard homepage and historical performance tracking.
    """
    try:
        user_id = current_user["id"]
        
        # Calculate date range based on timeframe
        end_date = datetime.now().date()
        if timeframe == "1d":
            start_date = end_date - timedelta(days=1)
        elif timeframe == "1w":
            start_date = end_date - timedelta(weeks=1)
        elif timeframe == "1m":
            start_date = end_date - timedelta(days=30)
        elif timeframe == "3m":
            start_date = end_date - timedelta(days=90)
        elif timeframe == "6m":
            start_date = end_date - timedelta(days=180)
        elif timeframe == "1y":
            start_date = end_date - timedelta(days=365)
        elif timeframe == "ytd":
            start_date = datetime(end_date.year, 1, 1).date()
        else:  # "all"
            # Get earliest snapshot date for user
            earliest_query = """
            SELECT MIN(snapshot_date) FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
            """
            earliest_result = await database.fetch_one(earliest_query, {"user_id": user_id})
            start_date = earliest_result[0] if earliest_result and earliest_result[0] else end_date - timedelta(days=365)
        
        # Get the most recent snapshot date (might not be today)
        latest_query = """
        SELECT MAX(snapshot_date) FROM portfolio_daily_snapshots
        WHERE user_id = :user_id
        """
        latest_result = await database.fetch_one(latest_query, {"user_id": user_id})
        latest_date = latest_result[0] if latest_result and latest_result[0] else end_date
        
        # Get daily snapshots data
        daily_snapshots_query = """
        WITH grouped_snapshots AS (
            SELECT 
                snapshot_date,
                SUM(current_value) as total_value,
                SUM(total_cost_basis) as total_cost_basis,
                SUM(current_value - total_cost_basis) as unrealized_gain,
                SUM(position_income) as position_income,
                ARRAY_AGG(DISTINCT asset_type) as asset_types
            FROM portfolio_daily_snapshots
            WHERE 
                user_id = :user_id AND
                snapshot_date BETWEEN :start_date AND :end_date AND
                current_value IS NOT NULL
            GROUP BY snapshot_date
            ORDER BY snapshot_date ASC
        )
        SELECT * FROM grouped_snapshots
        """
        
        daily_snapshots = await database.fetch_all(
            daily_snapshots_query, 
            {
                "user_id": user_id,
                "start_date": start_date,
                "end_date": latest_date
            }
        )
        
        # Get the latest snapshot for current values
        latest_snapshot_query = """
        WITH latest_values AS (
            SELECT 
                MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        ),
        snapshot_totals AS (
            SELECT 
                SUM(current_value) as total_value,
                SUM(total_cost_basis) as total_cost_basis,
                SUM(current_value - total_cost_basis) as unrealized_gain,
                SUM(position_income) as position_income
            FROM portfolio_daily_snapshots pds
            JOIN latest_values lv ON pds.snapshot_date = lv.max_date
            WHERE 
                user_id = :user_id AND
                current_value IS NOT NULL
        )
        SELECT * FROM snapshot_totals
        """
        
        current_values = await database.fetch_one(latest_snapshot_query, {"user_id": user_id})
        
        # Get asset allocation breakdown from the latest snapshot
        asset_allocation_query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        )
        SELECT 
            asset_type,
            SUM(current_value) as value,
            SUM(current_value) / (
                SELECT SUM(current_value) FROM portfolio_daily_snapshots
                WHERE user_id = :user_id AND snapshot_date = (SELECT max_date FROM latest_date)
                AND current_value IS NOT NULL
            ) as percentage
        FROM portfolio_daily_snapshots
        WHERE 
            user_id = :user_id AND 
            snapshot_date = (SELECT max_date FROM latest_date) AND
            current_value IS NOT NULL
        GROUP BY asset_type
        ORDER BY value DESC
        """
        
        asset_allocation = await database.fetch_all(asset_allocation_query, {"user_id": user_id})
        
        # Get sector allocation for securities
        sector_allocation_query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        ),
        total_securities_value AS (
            SELECT SUM(current_value) as total
            FROM portfolio_daily_snapshots
            WHERE 
                user_id = :user_id AND 
                snapshot_date = (SELECT max_date FROM latest_date) AND
                asset_type = 'security' AND
                current_value IS NOT NULL
        )
        SELECT 
            COALESCE(sector, 'Unknown') as sector,
            SUM(current_value) as value,
            SUM(current_value) / (SELECT total FROM total_securities_value) as percentage
        FROM portfolio_daily_snapshots
        WHERE 
            user_id = :user_id AND 
            snapshot_date = (SELECT max_date FROM latest_date) AND
            asset_type = 'security' AND
            current_value IS NOT NULL
        GROUP BY sector
        ORDER BY value DESC
        """
        
        sector_allocation = await database.fetch_all(sector_allocation_query, {"user_id": user_id})
        
        # Get account allocation
        account_allocation_query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        ),
        total_value AS (
            SELECT SUM(current_value) as total
            FROM portfolio_daily_snapshots
            WHERE 
                user_id = :user_id AND 
                snapshot_date = (SELECT max_date FROM latest_date) AND
                current_value IS NOT NULL
        )
        SELECT 
            account_name,
            institution,
            type as account_type,
            SUM(current_value) as value,
            SUM(current_value) / (SELECT total FROM total_value) as percentage
        FROM portfolio_daily_snapshots
        WHERE 
            user_id = :user_id AND 
            snapshot_date = (SELECT max_date FROM latest_date) AND
            current_value IS NOT NULL
        GROUP BY account_name, institution, type
        ORDER BY value DESC
        """
        
        account_allocation = await database.fetch_all(account_allocation_query, {"user_id": user_id})
        
        # Get top positions by value
        top_positions_query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        )
        SELECT 
            identifier as ticker,
            name,
            asset_type,
            account_name,
            current_value,
            current_price_per_unit as price,
            quantity,
            gain_loss_pct as gain_loss_percent,
            total_cost_basis as cost_basis
        FROM portfolio_daily_snapshots
        WHERE 
            user_id = :user_id AND 
            snapshot_date = (SELECT max_date FROM latest_date) AND
            current_value IS NOT NULL
        ORDER BY current_value DESC
        LIMIT 10
        """
        
        top_positions = await database.fetch_all(top_positions_query, {"user_id": user_id})
        
        # Calculate period changes
        period_changes = {}
        if daily_snapshots:
            # Sort snapshots by date to ensure correct calculations
            sorted_snapshots = sorted(daily_snapshots, key=lambda x: x['snapshot_date'])
            
            # Get the latest values
            latest_value = sorted_snapshots[-1]['total_value'] if sorted_snapshots else 0
            
            # 1d change
            if len(sorted_snapshots) >= 2:
                prev_day = sorted_snapshots[-2]['total_value']
                value_change_1d = latest_value - prev_day
                percent_change_1d = (value_change_1d / prev_day) * 100 if prev_day else 0
                period_changes["1d"] = {
                    "value_change": value_change_1d,
                    "percent_change": percent_change_1d
                }
            
            # 1w change
            week_ago_index = next((i for i, snap in enumerate(sorted_snapshots) 
                                if (sorted_snapshots[-1]['snapshot_date'] - snap['snapshot_date']).days >= 7), None)
            if week_ago_index is not None:
                week_ago_value = sorted_snapshots[week_ago_index]['total_value']
                value_change_1w = latest_value - week_ago_value
                percent_change_1w = (value_change_1w / week_ago_value) * 100 if week_ago_value else 0
                period_changes["1w"] = {
                    "value_change": value_change_1w,
                    "percent_change": percent_change_1w
                }
            
            # 1m change
            month_ago_index = next((i for i, snap in enumerate(sorted_snapshots) 
                                  if (sorted_snapshots[-1]['snapshot_date'] - snap['snapshot_date']).days >= 30), None)
            if month_ago_index is not None:
                month_ago_value = sorted_snapshots[month_ago_index]['total_value']
                value_change_1m = latest_value - month_ago_value
                percent_change_1m = (value_change_1m / month_ago_value) * 100 if month_ago_value else 0
                period_changes["1m"] = {
                    "value_change": value_change_1m,
                    "percent_change": percent_change_1m
                }
            
            # YTD change
            ytd_index = next((i for i, snap in enumerate(sorted_snapshots) 
                             if snap['snapshot_date'].year == sorted_snapshots[-1]['snapshot_date'].year 
                             and snap['snapshot_date'].month == 1 and snap['snapshot_date'].day <= 5), None)
            if ytd_index is not None:
                ytd_value = sorted_snapshots[ytd_index]['total_value']
                value_change_ytd = latest_value - ytd_value
                percent_change_ytd = (value_change_ytd / ytd_value) * 100 if ytd_value else 0
                period_changes["ytd"] = {
                    "value_change": value_change_ytd,
                    "percent_change": percent_change_ytd
                }
        
        # Calculate total portfolio income
        total_income_query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM portfolio_daily_snapshots
            WHERE user_id = :user_id
        )
        SELECT 
            SUM(position_income) as annual_income,
            SUM(position_income) / NULLIF(SUM(current_value), 0) * 100 as yield_percentage
        FROM portfolio_daily_snapshots
        WHERE 
            user_id = :user_id AND 
            snapshot_date = (SELECT max_date FROM latest_date) AND
            position_income IS NOT NULL AND 
            current_value IS NOT NULL
        """
        
        income_data = await database.fetch_one(total_income_query, {"user_id": user_id})
        
        # Format the results into a clean response structure
        result = {
            "current_value": current_values['total_value'] if current_values else 0,
            "total_cost_basis": current_values['total_cost_basis'] if current_values and include_cost_basis else None,
            "unrealized_gain": current_values['unrealized_gain'] if current_values and include_cost_basis else None,
            "unrealized_gain_percent": (current_values['unrealized_gain'] / current_values['total_cost_basis'] * 100) 
                                   if current_values and current_values['total_cost_basis'] and include_cost_basis else None,
            "annual_income": income_data['annual_income'] if income_data else 0,
            "yield_percentage": income_data['yield_percentage'] if income_data else 0,
            "period_changes": period_changes,
            "last_updated": latest_date,
            
            # Allocation breakdowns
            "asset_allocation": {item['asset_type']: {
                "value": item['value'],
                "percentage": item['percentage']
            } for item in asset_allocation},
            
            "sector_allocation": {item['sector']: {
                "value": item['value'],
                "percentage": item['percentage']
            } for item in sector_allocation},
            
            "account_allocation": [{
                "account_name": item['account_name'],
                "institution": item['institution'],
                "account_type": item['account_type'],
                "value": item['value'],
                "percentage": item['percentage']
            } for item in account_allocation],
            
            # Top positions
            "top_positions": [{
                "ticker": item['ticker'],
                "name": item['name'],
                "asset_type": item['asset_type'],
                "account": item['account_name'],
                "value": item['current_value'],
                "price": item['price'],
                "quantity": item['quantity'],
                "gain_loss_percent": item['gain_loss_percent'],
                "cost_basis": item['cost_basis'] if include_cost_basis else None
            } for item in top_positions],
            
            # Performance data
            "performance": {
                "daily": [{
                    "date": snapshot['snapshot_date'].strftime("%Y-%m-%d"),
                    "value": snapshot['total_value'],
                    "cost_basis": snapshot['total_cost_basis'] if include_cost_basis else None
                } for snapshot in daily_snapshots]
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching portfolio snapshots: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch portfolio snapshots: {str(e)}"
        )

# ----- Potentially Delete -----






@app.get("/system/database-status")
async def get_database_status(current_user: dict = Depends(get_current_user)):
    """Get database health and statistics"""
    try:
        # Get securities stats
        securities_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN current_price IS NOT NULL AND price_updated_at > NOW() - INTERVAL '24 HOURS' THEN 1 END) as with_current_prices,
            COUNT(CASE WHEN current_price IS NULL OR price_updated_at < NOW() - INTERVAL '24 HOURS' THEN 1 END) as with_outdated_prices,
            AVG(EXTRACT(EPOCH FROM (NOW() - price_updated_at)) / 3600) as average_price_age_hours
        FROM securities
        """
        securities_stats = await database.fetch_one(securities_query)
        
        # Get user metrics
        user_query = """
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '7 DAYS') as active_users,
            (SELECT COUNT(*) FROM portfolios) as total_portfolios,
            (SELECT COUNT(*) FROM accounts) as total_accounts,
            (SELECT COUNT(*) FROM positions) as total_positions
        """
        user_stats = await database.fetch_one(user_query)
        
        return {
            "securities": {
                "total": securities_stats["total"] or 0,
                "withCurrentPrices": securities_stats["with_current_prices"] or 0,
                "withOutdatedPrices": securities_stats["with_outdated_prices"] or 0,
                "averagePriceAge": securities_stats["average_price_age_hours"] or 0
            },
            "userMetrics": {
                "totalUsers": user_stats["total_users"] or 0,
                "activeUsers": user_stats["active_users"] or 0,
                "totalPortfolios": user_stats["total_portfolios"] or 0,
                "totalAccounts": user_stats["total_accounts"] or 0,
                "totalPositions": user_stats["total_positions"] or 0
            }
        }
    except Exception as e:
        logger.error(f"Error getting database status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get database status: {str(e)}"
        )

# Portfolio Summary

# Get system events endpoint
@app.get("/system/events")
async def get_system_events(limit: int = 20, current_user: dict = Depends(get_current_user)):
    """Get recent system events"""
    try:
        query = """
            SELECT 
                id, 
                event_type, 
                status, 
                started_at, 
                completed_at, 
                details, 
                error_message
            FROM system_events
            ORDER BY started_at DESC
            LIMIT :limit
        """
        
        events = await database.fetch_all(query, {"limit": limit})
        
        # Format events for API response
        formatted_events = []
        for event in events:
            formatted_event = dict(event)
            
            # Format timestamps
            if "started_at" in formatted_event and formatted_event["started_at"]:
                formatted_event["started_at"] = formatted_event["started_at"].isoformat()
            if "completed_at" in formatted_event and formatted_event["completed_at"]:
                formatted_event["completed_at"] = formatted_event["completed_at"].isoformat()
                
            formatted_events.append(formatted_event)
                
        return {"events": formatted_events}
    except Exception as e:
        logger.error(f"Failed to get system events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to get system events: {str(e)}"
        )
        
@app.get("/admin/tables")
async def get_table_stats(current_user: dict = Depends(get_current_user)):
    """Get statistics for all database tables"""
    try:
        # Initialize the tables dictionary
        tables = {
            "users": {},
            "accounts": {},
            "positions": {},
            "securities": {},
            "price_history": {},
            "portfolio_history": {},
            "system_events": {}
        }
        
        # Get users count
        users_query = users.select()
        users_result = await database.fetch_all(users_query)
        users_count = len(users_result)
        users_last_updated = None
        if users_count > 0 and "id" in users_result[0]:
            users_last_updated = datetime.utcnow()  # Using current time since we can't get actual timestamp
        
        tables["users"] = {
            "count": users_count,
            "last_updated": users_last_updated.isoformat() if users_last_updated else None
        }
        
        # Get accounts count
        accounts_query = accounts.select()
        accounts_result = await database.fetch_all(accounts_query)
        accounts_count = len(accounts_result)
        accounts_last_updated = None
        if accounts_count > 0 and "updated_at" in accounts_result[0]:
            accounts_last_updated = max(acct["updated_at"] for acct in accounts_result if acct["updated_at"])
        
        tables["accounts"] = {
            "count": accounts_count,
            "last_updated": accounts_last_updated.isoformat() if accounts_last_updated else None
        }
        
        # Get positions count
        positions_query = positions.select()
        positions_result = await database.fetch_all(positions_query)
        positions_count = len(positions_result)
        positions_last_updated = None
        if positions_count > 0 and "date" in positions_result[0]:
            positions_last_updated = max(pos["date"] for pos in positions_result if pos["date"])
        
        tables["positions"] = {
            "count": positions_count,
            "last_updated": positions_last_updated.isoformat() if positions_last_updated else None
        }
        
        # Get securities count
        securities_query = sqlalchemy.text("SELECT COUNT(*) as count, MAX(last_updated) as last_updated FROM securities")
        securities_result = await database.fetch_one(securities_query)
        
        tables["securities"] = {
            "count": securities_result["count"] if securities_result else 0,
            "last_updated": securities_result["last_updated"].isoformat() if securities_result and securities_result["last_updated"] else None
        }
        
        # Get price_history count
        price_history_query = sqlalchemy.text("SELECT COUNT(*) as count, MAX(timestamp) as last_updated FROM price_history")
        price_history_result = await database.fetch_one(price_history_query)
        
        tables["price_history"] = {
            "count": price_history_result["count"] if price_history_result else 0,
            "last_updated": price_history_result["last_updated"].isoformat() if price_history_result and price_history_result["last_updated"] else None
        }
        
        # Get portfolio_history count
        portfolio_history_query = sqlalchemy.text("SELECT COUNT(*) as count, MAX(date) as last_updated FROM portfolio_history")
        portfolio_history_result = await database.fetch_one(portfolio_history_query)
        
        tables["portfolio_history"] = {
            "count": portfolio_history_result["count"] if portfolio_history_result else 0,
            "last_updated": portfolio_history_result["last_updated"].isoformat() if portfolio_history_result and portfolio_history_result["last_updated"] else None
        }
        
        # Get system_events count
        system_events_query = sqlalchemy.text("SELECT COUNT(*) as count, MAX(started_at) as last_updated FROM system_events")
        system_events_result = await database.fetch_one(system_events_query)
        
        tables["system_events"] = {
            "count": system_events_result["count"] if system_events_result else 0,
            "last_updated": system_events_result["last_updated"].isoformat() if system_events_result and system_events_result["last_updated"] else None
        }
        
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error fetching table statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch table statistics: {str(e)}"
        )
        
@app.get("/admin/health")
async def get_system_health(current_user: dict = Depends(get_current_user)):
    """Get system health status"""
    try:
        # Check database connection
        db_status = "online"
        try:
            # Simple query to test database connection
            await database.fetch_one("SELECT 1 as test")
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            db_status = "offline"
        
        # Overall system status
        system_status = "online" if db_status == "online" else "degraded"
        
        return {
            "status": system_status,
            "lastCheck": datetime.utcnow().isoformat(),
            "components": {
                "database": {
                    "status": db_status
                },
                "api": {
                    "status": "online"
                }
            }
        }
    except Exception as e:
        logger.error(f"Error checking system health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check system health: {str(e)}"
        )

@app.post("/admin/generate-test-data")
async def generate_test_data(current_user: dict = Depends(get_current_user)):
    """Generate some test data for development purposes"""
    try:
        # First check if test user already exists
        test_user_query = "SELECT * FROM users WHERE email = :email"
        test_user = await database.fetch_one(test_user_query, {"email": "test@example.com"})
        
        user_id = None
        if not test_user:
            # Create a new test user
            user_id = str(uuid.uuid4())
            password_hash = hash_password("test123")
            
            # Use plain SQL to avoid issues with SQLAlchemy models
            insert_user_query = """
            INSERT INTO users (id, email, password_hash) 
            VALUES (:id, :email, :password_hash)
            """
            
            await database.execute(
                insert_user_query, 
                {
                    "id": user_id, 
                    "email": "test@example.com", 
                    "password_hash": password_hash
                }
            )
            
            logger.info(f"Created test user with ID: {user_id}")
        else:
            # Use existing user
            user_id = test_user["id"]
            logger.info(f"Using existing test user with ID: {user_id}")
            
        # Create test account if user doesn't already have one
        existing_account_query = """
        SELECT id FROM accounts WHERE user_id = :user_id AND account_name = 'Test Account'
        """
        existing_account = await database.fetch_one(existing_account_query, {"user_id": user_id})
        
        account_id = None
        if not existing_account:
            # Insert new account
            account_query = """
            INSERT INTO accounts (user_id, account_name, institution, type, balance)
            VALUES (:user_id, 'Test Account', 'Test Bank', 'Brokerage', 10000.0)
            RETURNING id
            """
            account_result = await database.fetch_one(account_query, {"user_id": user_id})
            account_id = account_result["id"]
            logger.info(f"Created test account with ID: {account_id}")
        else:
            account_id = existing_account["id"]
            logger.info(f"Using existing account with ID: {account_id}")
            
        # Add sample tickers
        test_tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
        
        # Add test securities and positions
        for ticker in test_tickers:
            # Check if security exists
            security_check = "SELECT ticker FROM securities WHERE ticker = :ticker"
            existing = await database.fetch_one(security_check, {"ticker": ticker})
            
            if not existing:
                security_query = """
                INSERT INTO securities (ticker, company_name, current_price, last_updated)
                VALUES (:ticker, :company_name, :price, :updated)
                """
                await database.execute(
                    security_query,
                    {
                        "ticker": ticker,
                        "company_name": f"{ticker} Inc.",
                        "price": 150.0,
                        "updated": datetime.utcnow()
                    }
                )
                logger.info(f"Created security: {ticker}")
            else:
                logger.info(f"Security {ticker} already exists")
            
            # Add position - make sure we're only using columns that exist in the table
            current_date = datetime.utcnow().date()
            purchase_date = current_date - timedelta(days=30)  # 30 days ago
            
            position_query = """
            INSERT INTO positions 
            (account_id, ticker, shares, price, date, cost_basis, purchase_date) 
            VALUES 
            (:account_id, :ticker, :shares, :price, :date, :cost_basis, :purchase_date)
            """
            
            try:
                await database.execute(
                    position_query, 
                    {
                        "account_id": account_id,
                        "ticker": ticker,
                        "shares": 10,
                        "price": 150.0,
                        "date": current_date,
                        "cost_basis": 140.0,  # Lower than current price to show gain
                        "purchase_date": purchase_date
                    }
                )
                logger.info(f"Added position for {ticker}")
            except Exception as pos_error:
                logger.error(f"Error adding position for {ticker}: {str(pos_error)}")
                
                # Try simplified query if the first one fails
                simplified_query = """
                INSERT INTO positions (account_id, ticker, shares, price, date)
                VALUES (:account_id, :ticker, :shares, :price, :date)
                """
                
                await database.execute(
                    simplified_query,
                    {
                        "account_id": account_id,
                        "ticker": ticker,
                        "shares": 10,
                        "price": 150.0,
                        "date": current_date
                    }
                )
                logger.info(f"Added position for {ticker} with simplified query")
        
        # Create test system event
        event_query = """
        INSERT INTO system_events (event_type, status, started_at, completed_at, details)
        VALUES (:event_type, :status, :started_at, :completed_at, :details)
        """
        
        await database.execute(
            event_query,
            {
                "event_type": "test_event",
                "status": "completed",
                "started_at": datetime.utcnow() - timedelta(minutes=5),
                "completed_at": datetime.utcnow(),
                "details": json.dumps({"test": True})
            }
        )
        
        logger.info("Test data generation completed successfully")
        return {"message": "Test data generated successfully"}
    except Exception as e:
        logger.error(f"Error generating test data: {str(e)}")
        # Return more detailed error information for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate test data: {str(e)}"
        )
        
@app.get("/admin/table-details/{table_name}")
async def get_table_details(table_name: str, limit: int = 10, current_user: dict = Depends(get_current_user)):
    """Get detailed information about a specific table"""
    try:
        if table_name not in ["users", "accounts", "positions", "securities", "price_history", "portfolio_history", "system_events"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table {table_name} is not available for details view"
            )
        
        # Get column information
        columns_query = f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        """
        columns = await database.fetch_all(columns_query)
        
        # Get sample rows
        sample_query = f"""
        SELECT *
        FROM {table_name}
        LIMIT {limit}
        """
        rows = await database.fetch_all(sample_query)
        
        # Format the results
        formatted_columns = [{"name": col["column_name"], "type": col["data_type"]} for col in columns]
        formatted_rows = [dict(row) for row in rows]
        
        # For special tables, add additional metrics
        metrics = {}
        if table_name == "securities":
            # Get statistics for securities table
            metrics_query = """
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN current_price IS NOT NULL THEN 1 ELSE 0 END) as with_price,                
                SUM(CASE WHEN on_yfinance = true THEN 1 ELSE 0 END) as on_yfinance,
                AVG(CASE WHEN current_price IS NOT NULL THEN current_price ELSE 0 END) as avg_price
            FROM securities
            """
            metrics_result = await database.fetch_one(metrics_query)
            if metrics_result:
                metrics = {
                    "total_count": metrics_result["total_count"],
                    "with_price": metrics_result["with_price"],
                    "on_yfinance": metrics_result["on_yfinance"],
                    "avg_price": float(metrics_result["avg_price"]) if metrics_result["avg_price"] else 0
                }
        
        elif table_name == "price_history":
            # Get statistics for price history
            metrics_query = """
            SELECT 
                COUNT(DISTINCT ticker) as unique_tickers,
                MIN(date) as oldest_date,
                MAX(date) as newest_date,
                COUNT(*) / COUNT(DISTINCT ticker) as avg_points_per_ticker
            FROM price_history
            """
            metrics_result = await database.fetch_one(metrics_query)
            if metrics_result:
                metrics = {
                    "unique_tickers": metrics_result["unique_tickers"],
                    "oldest_date": metrics_result["oldest_date"].isoformat() if metrics_result["oldest_date"] else None,
                    "newest_date": metrics_result["newest_date"].isoformat() if metrics_result["newest_date"] else None,
                    "avg_points_per_ticker": float(metrics_result["avg_points_per_ticker"]) if metrics_result["avg_points_per_ticker"] else 0
                }
        
        elif table_name == "system_events":
            # Get statistics for system events
            metrics_query = """
            SELECT 
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
                COUNT(CASE WHEN status = 'started' THEN 1 END) as started_count,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
            FROM system_events
            WHERE completed_at IS NOT NULL
            """
            metrics_result = await database.fetch_one(metrics_query)
            if metrics_result:
                metrics = {
                    "completed_count": metrics_result["completed_count"] or 0,
                    "failed_count": metrics_result["failed_count"] or 0,
                    "started_count": metrics_result["started_count"] or 0,
                    "avg_duration_seconds": float(metrics_result["avg_duration_seconds"]) if metrics_result["avg_duration_seconds"] else 0
                }
        
        return {
            "table_name": table_name,
            "columns": formatted_columns,
            "rows": formatted_rows,
            "metrics": metrics,
            "total_rows": len(formatted_rows),
            "has_more": len(formatted_rows) == limit
        }
    except Exception as e:
        logger.error(f"Error fetching table details for {table_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch table details: {str(e)}"
        )

@app.get("/system/update-status")
async def get_update_status(current_user: dict = Depends(get_current_user)):
    """Get status of all update types including staleness"""
    query = """
    SELECT 
        update_type, 
        last_updated, 
        threshold_minutes, 
        in_progress,
        lock_acquired_at,
        lock_acquired_by,
        success_count,
        failure_count,
        last_success_details,
        last_failure_details,
        last_failure_at,
        EXTRACT(EPOCH FROM (NOW() - last_updated))/60 as minutes_since_update
    FROM update_tracking
    """
    results = await database.fetch_all(query)
    
    return {
        row["update_type"]: {
            "last_updated": row["last_updated"],
            "threshold_minutes": row["threshold_minutes"],
            "in_progress": row["in_progress"],
            "lock_acquired_at": row["lock_acquired_at"],
            "lock_acquired_by": row["lock_acquired_by"],
            "success_count": row["success_count"],
            "failure_count": row["failure_count"],
            "last_success_details": row["last_success_details"],
            "last_failure_details": row["last_failure_details"],
            "last_failure_at": row["last_failure_at"],
            "minutes_since_update": row["minutes_since_update"],
            "is_stale": row["minutes_since_update"] > row["threshold_minutes"]
        }
        for row in results
    }

@app.post("/system/acquire-update-lock")
async def acquire_update_lock(
    request: UpdateLockRequest,
    current_user: dict = Depends(get_current_user)
):
    """Try to acquire lock for an update type"""
    query = """
    SELECT try_acquire_update_lock($1, $2) as lock_acquired
    """
    result = await database.fetch_one(
        query, 
        request.update_type, 
        str(current_user.id)
    )
    
    return {"lock_acquired": result["lock_acquired"]}

@app.post("/system/release-update-lock")
async def release_update_lock(
    request: ReleaseLockRequest,
    current_user: dict = Depends(get_current_user)
):
    """Release an update lock after completion or failure"""
    query = """
    SELECT release_update_lock($1, $2, $3, $4)
    """
    await database.execute(
        query, 
        request.update_type, 
        request.success,
        request.details,
        request.history_id
    )
    
    return {"success": True}

@app.get("/system/update-history")
async def get_update_history(
    update_type: str = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get history of update operations"""
    query = """
    SELECT * FROM update_history
    WHERE ($1 IS NULL OR update_type = $1)
    ORDER BY triggered_at DESC
    LIMIT $2
    """
    results = await database.fetch_all(query, update_type, limit)
    
    return {
        "history": [dict(row) for row in results]
    }

@app.get("/admin/update-thresholds")
async def get_update_thresholds(
    current_user: dict = Depends(get_current_user_admin)
):
    """Get current update thresholds"""
    query = """
    SELECT update_type, threshold_minutes FROM update_tracking
    """
    results = await database.fetch_all(query)
    
    return {
        row["update_type"]: row["threshold_minutes"]
        for row in results
    }

@app.post("/admin/update-thresholds")
async def set_update_thresholds(
    thresholds: UpdateThresholds,
    current_user: dict = Depends(get_current_user_admin)
):
    """Update threshold configuration"""
    # Update each threshold
    for update_type, minutes in thresholds.dict().items():
        await database.execute(
            """
            UPDATE update_tracking 
            SET threshold_minutes = :minutes
            WHERE update_type = :update_type
            """,
            {
                "update_type": update_type,
                "minutes": minutes
            }
        )
    
    return {"success": True}

    """Attempt to automatically fix common data consistency issues"""
    try:
        monitor = DataConsistencyMonitor()
        fix_results = await monitor.fix_common_issues()
        return {
            "message": "Data consistency fixes completed",
            "fixed_count": fix_results["total_fixed"],
            "unfixable_count": len(fix_results["unfixable_issues"]),
            "results": fix_results
        }
    except Exception as e:
        logger.error(f"Error fixing data consistency issues: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fix data consistency issues: {str(e)}"
        )