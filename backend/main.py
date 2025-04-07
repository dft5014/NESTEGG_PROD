# Standard library imports
import json
import logging
import math
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
from datetime import date
from typing import Dict, Optional
from uuid import UUID

# Third-party imports
import bcrypt
import databases
import jwt
import sqlalchemy
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import select
from sqlalchemy import func, case, literal_column
from sqlalchemy.sql import select, join, text # Ensure text is imported

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
    sqlalchemy.Column("balance", sqlalchemy.Float, default=0.0),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
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
    sqlalchemy.Column("current_price", sqlalchemy.Float),
    sqlalchemy.Column("purchase_date", sqlalchemy.Date),
    sqlalchemy.Column("storage_type", sqlalchemy.String),
    sqlalchemy.Column("exchange_name", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("wallet_address", sqlalchemy.String, nullable=True),
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

# Connect & Disconnect from Database
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Pydantic Models
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
    balance: float = 0.0

class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    institution: Optional[str] = None
    type: Optional[str] = None

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
    exchange_name: Optional[str] = None
    wallet_address: Optional[str] = None
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
    exchange_name: Optional[str] = None
    wallet_address: Optional[str] = None
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
    exchange_name: Optional[str] = None
    wallet_address: Optional[str] = None
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

class RealEstatePositionDetail(BaseModel):
    id: int
    account_id: int
    address: Optional[str] = None # Example field
    property_type: Optional[str] = None # Example field (e.g., Residential, Commercial)
    purchase_price: Optional[float] = None
    estimated_value: Optional[float] = None # Current estimated market value
    purchase_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Added fields
    account_name: str
    gain_loss: Optional[float] = None # Calculated
    gain_loss_percent: Optional[float] = None # Calculated

class RealEstatePositionsDetailedResponse(BaseModel):
    real_estate_positions: List[RealEstatePositionDetail]

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
    exchange_name: Optional[str] = None
    wallet_address: Optional[str] = None
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
                storage_type=row_dict.get("storage_type"), exchange_name=row_dict.get("exchange_name"),
                wallet_address=row_dict.get("wallet_address"), notes=row_dict.get("notes"), tags=tags_list,
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

# API Endpoints
@app.get("/")
async def read_root():
    return {"message": "Welcome to NestEgg API!", "version": "1.0.0"}

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

# User Management
@app.get("/users")
async def get_users():
    query = users.select()
    result = await database.fetch_all(query)
    return {"users": result}

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

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    emailUpdates: bool = True
    marketAlerts: bool = True
    performanceReports: bool = True
    securityAlerts: bool = True
    newsletterUpdates: bool = False

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
                "balance": row["balance"] or 0.0,
            }
            
            # Safely handle datetime fields
            if "created_at" in row and row["created_at"]:
                account_data["created_at"] = row["created_at"].isoformat()
            else:
                account_data["created_at"] = None
                
            if "updated_at" in row and row["updated_at"]:
                account_data["updated_at"] = row["updated_at"].isoformat()
            else:
                account_data["updated_at"] = None
                
            accounts_list.append(account_data)
        
        return {"accounts": accounts_list}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch accounts: {str(e)}")

@app.post("/accounts", status_code=status.HTTP_201_CREATED)
async def add_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    try:
        query = accounts.insert().values(
            user_id=current_user["id"],
            account_name=account.account_name,
            institution=account.institution,
            type=account.type,
            balance=account.balance
        )
        
        account_id = await database.execute(query)
        return {
            "message": "Account added successfully!",
            "account_id": account_id
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

@app.put("/accounts/{account_id}")
async def update_account(account_id: int, account: AccountUpdate, current_user: dict = Depends(get_current_user)):
    try:
        # Check if the account exists and belongs to the user
        query = accounts.select().where(
            (accounts.c.id == account_id) & 
            (accounts.c.user_id == current_user["id"])
        )
        existing_account = await database.fetch_one(query)
        
        if not existing_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found or access denied")
        
        # Update account
        update_values = {k: v for k, v in account.dict().items() if v is not None}
        if update_values:
            update_query = accounts.update().where(
                accounts.c.id == account_id
            ).values(**update_values, updated_at=datetime.utcnow())
            await database.execute(update_query)
        
        return {"message": "Account updated successfully"}
    except Exception as e:
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

# Position Management
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
            cp.storage_type, cp.exchange_name, cp.wallet_address, cp.notes,
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
                exchange_name=row_dict.get("exchange_name"),
                wallet_address=row_dict.get("wallet_address"),
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
        
        # Update account balance
        position_value = position.shares * position.price
        update_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] + position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_query)
        
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
        
        # Calculate old and new values for account balance
        old_value = position_data["shares"] * position_data["price"]
        new_value = position.shares * position.price
        value_difference = new_value - old_value
        
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
        
        # Update account balance
        account_id = position_data["account_id"]
        account_query = accounts.select().where(accounts.c.id == account_id)
        account = await database.fetch_one(account_query)
        
        update_account_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] + value_difference,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_account_query)
        
        return {"message": "Position updated successfully"}
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
        
        # Calculate value for account balance adjustment
        position_value = position_data["shares"] * position_data["price"]
        
        # Delete position
        delete_query = positions.delete().where(positions.c.id == position_id)
        await database.execute(delete_query)
        
        # Update account balance
        account_id = position_data["account_id"]
        account_query = accounts.select().where(accounts.c.id == account_id)
        account = await database.fetch_one(account_query)
        
        update_account_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] - position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_account_query)
        
        return {"message": "Position deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Server error: {str(e)}")

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

@app.get("/securities/all")
async def get_all_securities(current_user: dict = Depends(get_current_user)):
    """Retrieve all securities from the database for debugging purposes."""
    try:
        logger.info("Fetching all securities from the database")
        query = "SELECT ticker FROM securities ORDER BY ticker ASC LIMIT 50"
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

# Portfolio Summary
@app.get("/portfolio/summary/all", response_model=PortfolioSummaryAllResponse)
async def get_portfolio_summary_all(current_user: dict = Depends(get_current_user)):
    """Get a summary across all asset types for the user."""
    try:
        user_id = current_user["id"]
        total_value = 0.0
        total_cost_basis = 0.0
        total_positions = 0
        # Asset specific summaries for breakdown (optional)
        asset_summaries = []

        # --- 1. Securities ---
        sec_query = """
        SELECT COALESCE(SUM(p.shares * p.price), 0) as value,
               COALESCE(SUM(p.shares * COALESCE(p.cost_basis, p.price)), 0) as cost,
               COUNT(p.id) as count
        FROM positions p JOIN accounts a ON p.account_id = a.id
        WHERE a.user_id = :user_id
        """
        sec_res = await database.fetch_one(sec_query, {"user_id": user_id})
        if sec_res:
            total_value += float(sec_res["value"])
            total_cost_basis += float(sec_res["cost"])
            total_positions += sec_res["count"]
            asset_summaries.append(PortfolioAssetSummary(asset_type="Securities", total_value=float(sec_res["value"]), total_cost_basis=float(sec_res["cost"]), count=sec_res["count"]))


        # --- 2. Crypto ---
        cry_query = """
        SELECT COALESCE(SUM(cp.quantity * cp.current_price), 0) as value,
               COALESCE(SUM(cp.quantity * cp.purchase_price), 0) as cost,
               COUNT(cp.id) as count
        FROM crypto_positions cp JOIN accounts a ON cp.account_id = a.id
        WHERE a.user_id = :user_id
        """
        cry_res = await database.fetch_one(cry_query, {"user_id": user_id})
        if cry_res:
             total_value += float(cry_res["value"])
             total_cost_basis += float(cry_res["cost"])
             total_positions += cry_res["count"]
             asset_summaries.append(PortfolioAssetSummary(asset_type="Crypto", total_value=float(cry_res["value"]), total_cost_basis=float(cry_res["cost"]), count=cry_res["count"]))

        # --- 3. Metals ---
        # Note: Requires accurate current_price_per_unit logic for metals
        met_query = """
        SELECT COALESCE(SUM(mp.quantity * mp.purchase_price), 0) as value, -- Requires current_price_per_unit
               COALESCE(SUM(mp.quantity * COALESCE(mp.cost_basis, mp.purchase_price)), 0) as cost,
               COUNT(mp.id) as count
        FROM metal_positions mp JOIN accounts a ON mp.account_id = a.id
        WHERE a.user_id = :user_id
        """
        # Need to fetch/update mp.current_price_per_unit before this query or join with a prices table
        met_res = await database.fetch_one(met_query, {"user_id": user_id})
        if met_res:
            total_value += float(met_res["value"])
            total_cost_basis += float(met_res["cost"])
            total_positions += met_res["count"]
            asset_summaries.append(PortfolioAssetSummary(asset_type="Metals", total_value=float(met_res["value"]), total_cost_basis=float(met_res["cost"]), count=met_res["count"]))


        # --- 4. Real Estate ---
        re_query = """
        SELECT COALESCE(SUM(re.purchase_price), 0) as value,
               COALESCE(SUM(re.purchase_price), 0) as cost,
               COUNT(re.id) as count
        FROM real_estate_positions re JOIN accounts a ON re.account_id = a.id
        WHERE a.user_id = :user_id
        """
        re_res = await database.fetch_one(re_query, {"user_id": user_id})
        if re_res:
            total_value += float(re_res["value"])
            total_cost_basis += float(re_res["cost"])
            total_positions += re_res["count"]
            asset_summaries.append(PortfolioAssetSummary(asset_type="Real Estate", total_value=float(re_res["value"]), total_cost_basis=float(re_res["cost"]), count=re_res["count"]))

        # --- Calculate Final Metrics ---
        total_gain_loss = total_value - total_cost_basis
        total_gain_loss_percent = (total_gain_loss / total_cost_basis) * 100 if total_cost_basis > 0 else 0

        # Count distinct accounts involved
        acc_query = """SELECT COUNT(DISTINCT a.id) as count FROM accounts a WHERE a.user_id = :user_id"""
        acc_res = await database.fetch_one(acc_query, {"user_id": user_id})
        total_accounts = acc_res["count"] if acc_res else 0

        return PortfolioSummaryAllResponse(
            total_value=total_value,
            total_cost_basis=total_cost_basis,
            total_gain_loss=total_gain_loss,
            total_gain_loss_percent=total_gain_loss_percent,
            total_positions=total_positions,
            total_accounts=total_accounts,
            breakdown=asset_summaries
        )

    except Exception as e:
        logger.error(f"Error generating portfolio summary all for user {user_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to generate portfolio summary")

@app.get("/portfolio/summary")
async def get_portfolio_summary(current_user: dict = Depends(get_current_user)):
    try:
        # Get all accounts for the user
        accounts_query = accounts.select().where(accounts.c.user_id == current_user["id"])
        user_accounts = await database.fetch_all(accounts_query)
        
        if not user_accounts:
            return {
                "net_worth": 0,
                "accounts_count": 0,
                "positions_count": 0,
                "top_holdings": []
            }
        
        # Calculate total net worth from account balances
        net_worth = sum(account["balance"] for account in user_accounts)
        accounts_count = len(user_accounts)
        
        # Get all positions for all accounts
        account_ids = [account["id"] for account in user_accounts]
        positions_query = positions.select().where(positions.c.account_id.in_(account_ids))
        user_positions = await database.fetch_all(positions_query)
        
        positions_count = len(user_positions)
        
        # Calculate top holdings
        holdings = {}
        for position in user_positions:
            ticker = position["ticker"]
            value = position["shares"] * position["price"]
            cost_basis = position["cost_basis"] * position["shares"] if "cost_basis" in position else 0
            
            if ticker in holdings:
                holdings[ticker]["shares"] += position["shares"]
                holdings[ticker]["value"] += value
                holdings[ticker]["cost_basis"] += cost_basis
            else:
                holdings[ticker] = {
                    "ticker": ticker,
                    "shares": position["shares"],
                    "value": value,
                    "cost_basis": cost_basis,
                    "percentage": 0  # Will calculate after totaling
                }
        
        # Calculate percentage of portfolio and gain/loss for each holding
        for ticker in holdings:
            if net_worth > 0:
                holdings[ticker]["percentage"] = (holdings[ticker]["value"] / net_worth) * 100
                
            # Calculate gain/loss
            if holdings[ticker]["cost_basis"] > 0:
                gain_loss_amount = holdings[ticker]["value"] - holdings[ticker]["cost_basis"]
                gain_loss_percentage = (gain_loss_amount / holdings[ticker]["cost_basis"]) * 100
                
                holdings[ticker]["gain_loss"] = gain_loss_percentage
                holdings[ticker]["gain_loss_amount"] = gain_loss_amount
            else:
                holdings[ticker]["gain_loss"] = 0
                holdings[ticker]["gain_loss_amount"] = 0
        
        # Sort by value (descending) and get top 5
        top_holdings = sorted(
            list(holdings.values()), 
            key=lambda x: x["value"], 
            reverse=True
        )[:5]
        
        # Also calculate overall portfolio gain/loss
        total_cost_basis = sum(holding["cost_basis"] for holding in holdings.values())
        daily_change = 2.5  # Placeholder for daily change percentage
        
        if total_cost_basis > 0:
            overall_gain_loss_amount = net_worth - total_cost_basis
            overall_gain_loss_percentage = (overall_gain_loss_amount / total_cost_basis) * 100
        else:
            overall_gain_loss_percentage = 0
            overall_gain_loss_amount = 0
        
        # Fetch the most recent price update timestamp
        last_price_update_query = """
            SELECT MAX(timestamp) as last_update 
            FROM price_history
        """
        last_update_result = await database.fetch_one(last_price_update_query)
        last_price_update = last_update_result['last_update'] if last_update_result and last_update_result['last_update'] else None

        
        return {
            "net_worth": net_worth,
            "accounts_count": accounts_count,
            "positions_count": positions_count,
            "top_holdings": top_holdings,
            "daily_change": daily_change,
            "yearly_change": overall_gain_loss_percentage,
            "overall_gain_loss": overall_gain_loss_percentage,
            "overall_gain_loss_amount": overall_gain_loss_amount,
            "last_price_update": last_price_update.isoformat() if last_price_update else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch portfolio summary: {str(e)}"
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
        INSERT INTO securities (ticker, active, on_yfinance, created_at) 
        VALUES (:ticker, true, true, :now)
        """
        await database.execute(
            query, 
            {
                "ticker": security.ticker.upper(),
                "now": datetime.utcnow()
            }
        )
        
        # Immediately try to fetch basic data for the security
        updater = PriceUpdaterV2()
        await updater.update_company_metrics([security.ticker.upper()])
        
        return {"message": f"Security {security.ticker.upper()} added successfully"}
    
    except Exception as e:
        logger.error(f"Error adding security: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add security: {str(e)}"
        )

# GET endpoint - Get all cash positions for an account
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

# POST endpoint - Add new cash position
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
        
        # Update account balance if needed
        update_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] + position.amount,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_query)
        
        return {
            "message": "Cash position added successfully",
            "position_id": position_id,
            "position_value": position.amount
        }
    except Exception as e:
        logger.error(f"Error adding cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add cash position: {str(e)}")

# PUT endpoint - Update cash position
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
        
        # Calculate old and new values for account balance update
        old_value = position_data["amount"]
        new_value = position.amount if position.amount is not None else old_value
        value_difference = new_value - old_value
        
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
            
            # Update account balance if amount changed
            if value_difference != 0:
                account_id = position_data["account_id"]
                account_balance = position_data["balance"]
                
                update_account_query = accounts.update().where(
                    accounts.c.id == account_id
                ).values(
                    balance=account_balance + value_difference,
                    updated_at=datetime.utcnow()
                )
                await database.execute(update_account_query)
        
        return {"message": "Cash position updated successfully"}
    except Exception as e:
        logger.error(f"Error updating cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update cash position: {str(e)}")

# DELETE endpoint - Delete cash position
@app.delete("/cash/{position_id}")
async def delete_cash_position(position_id: int, current_user: dict = Depends(get_current_user)):
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
        
        # Calculate value for account balance adjustment
        position_value = position_data["amount"]
        
        # Delete the position
        delete_query = """
        DELETE FROM cash_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Update account balance
        account_id = position_data["account_id"]
        account_balance = position_data["balance"]
        
        update_account_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account_balance - position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_account_query)
        
        return {"message": "Cash position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting cash position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete cash position: {str(e)}")

# GET all detailed cash positions 
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

@app.get("/portfolio/history")
async def get_portfolio_history(period: str = "1m", current_user: dict = Depends(get_current_user)):
    """Get historical portfolio value data"""
    try:
        # Calculate date range based on period
        end_date = datetime.now().date()
        
        if period == "1w":
            start_date = end_date - timedelta(days=7)
        elif period == "1m":
            start_date = end_date - timedelta(days=30)
        elif period == "6m":
            start_date = end_date - timedelta(days=180)
        elif period == "ytd":
            start_date = datetime(end_date.year, 1, 1).date()
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        elif period == "5y":
            start_date = end_date - timedelta(days=365*5)
        elif period == "max":
            start_date = datetime(2000, 1, 1).date()  # Arbitrary old date
        else:
            # Default to 1 month
            start_date = end_date - timedelta(days=30)
        
        # Fetch portfolio history
        query = """
        SELECT 
            date,
            value
        FROM portfolio_history
        WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
        ORDER BY date ASC
        """
        
        history = await database.fetch_all(
            query, 
            {
                "user_id": current_user["id"],
                "start_date": start_date,
                "end_date": end_date
            }
        )
        
        # Format results
        formatted_history = []
        for row in history:
            formatted_history.append({
                "date": row["date"].isoformat() if row["date"] else None,
                "value": float(row["value"]) if row["value"] is not None else 0
            })
        
        return {"history": formatted_history}
    
    except Exception as e:
        logger.error(f"Error fetching portfolio history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch portfolio history: {str(e)}"
        )

@app.get("/securities/{ticker}/history")
async def get_security_history(ticker: str, current_user: dict = Depends(get_current_user)):
    """Get historical price data for a security"""
    try:
        # Get price history
        query = """
        SELECT 
            ticker, 
            date,
            close_price,
            day_open,
            day_high,
            day_low,
            volume
        FROM price_history
        WHERE ticker = :ticker
        ORDER BY date ASC
        """
        history = await database.fetch_all(query, {"ticker": ticker.upper()})
        
        if not history:
            return {"history": []}
        
        # Format results
        formatted_history = []
        for row in history:
            formatted_history.append({
                "ticker": row["ticker"],
                "date": row["date"].isoformat() if row["date"] else None,
                "close_price": float(row["close_price"]) if row["close_price"] is not None else None,
                "open_price": float(row["day_open"]) if row["day_open"] is not None else None,
                "high_price": float(row["day_high"]) if row["day_high"] is not None else None,
                "low_price": float(row["day_low"]) if row["day_low"] is not None else None,
                "volume": int(row["volume"]) if row["volume"] is not None else None
            })
        
        return {"history": formatted_history}
    
    except Exception as e:
        logger.error(f"Error fetching security history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch security history: {str(e)}"
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
        
# New endpoints for price updates
@app.post("/market/update-prices-v2")
async def trigger_price_update_v2(current_user: dict = Depends(get_current_user)):
    """Enhanced price update process using multiple data sources"""
    try:
        updater = PriceUpdaterV2()
        result = await updater.update_security_prices()
        return {"message": "Price update completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to update prices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update prices: {str(e)}"
        )

@app.post("/market/update-metrics")
async def trigger_metrics_update(current_user: dict = Depends(get_current_user)):
    """Update company metrics for all securities"""
    try:
        updater = PriceUpdaterV2()
        result = await updater.update_company_metrics()
        return {"message": "Metrics update completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to update metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update metrics: {str(e)}"
        )

@app.post("/market/update-history")
async def trigger_history_update(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Update historical prices for all securities"""
    try:
        updater = PriceUpdaterV2()
        result = await updater.update_historical_prices(days=days)
        return {"message": "Historical price update completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to update historical prices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update historical prices: {str(e)}"
        )

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

# New endpoints for portfolio calculations
@app.post("/portfolios/calculate")
async def trigger_portfolio_calculation(current_user: dict = Depends(get_current_user)):
    """Calculate all portfolio values based on current prices"""
    try:
        calculator = PortfolioCalculator()
        result = await calculator.calculate_all_portfolios()
        return {"message": "Portfolio calculation completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to calculate portfolios: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to calculate portfolios: {str(e)}"
        )

@app.post("/portfolios/calculate/user")
async def trigger_user_portfolio_calculation(current_user: dict = Depends(get_current_user)):
    """Calculate portfolio values for the current user"""
    try:
        calculator = PortfolioCalculator()
        result = await calculator.calculate_user_portfolio(current_user["id"])
        return {"message": "Portfolio calculation completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to calculate user portfolio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to calculate user portfolio: {str(e)}"
        )

@app.post("/portfolios/snapshot")
async def trigger_portfolio_snapshot(current_user: dict = Depends(get_current_user)):
    """Take a snapshot of all portfolio values for historical tracking"""
    try:
        calculator = PortfolioCalculator()
        result = await calculator.snapshot_portfolio_values()
        return {"message": "Portfolio snapshot completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to take portfolio snapshot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to take portfolio snapshot: {str(e)}"
        )

# Combined endpoint for updating prices and calculating portfolios
@app.post("/market/update-and-calculate")
async def trigger_update_and_calculate(current_user: dict = Depends(get_current_user)):
    """Update prices and then calculate portfolio values"""
    try:
        # First update prices
        updater = PriceUpdaterV2()
        price_result = await updater.update_security_prices()
        
        # Then calculate portfolios
        calculator = PortfolioCalculator()
        portfolio_result = await calculator.calculate_all_portfolios()
        
        return {
            "message": "Update and calculation completed successfully",
            "price_update": price_result,
            "portfolio_calculation": portfolio_result
        }
    except Exception as e:
        logger.error(f"Failed to update and calculate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update and calculate: {str(e)}"
        )

@app.post("/market/update-stale")
async def trigger_stale_update(
    metrics_days: int = 7, 
    price_days: int = 1, 
    max_metrics: int = 50, 
    max_prices: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Update securities based on staleness of data"""
    try:
        updater = PriceUpdaterV2()
        result = await updater.update_stale_securities(
            metrics_days_threshold=metrics_days,
            price_days_threshold=price_days,
            max_metrics_tickers=max_metrics,
            max_prices_tickers=max_prices
        )
        return {"message": "Stale data update completed successfully", "details": result}
    except Exception as e:
        logger.error(f"Failed to update stale data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update stale data: {str(e)}"
        )

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

@app.get("/debug/direct-yahoo-test")
async def test_direct_yahoo():
    """
    Test the DirectYahooFinanceClient standalone
    """
    from backend.api_clients.direct_yahoo_client import DirectYahooFinanceClient
    import time
    
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Initialize the client
    client = DirectYahooFinanceClient()
    
    # Test tickers to check
    test_tickers = ["AAPL", "MSFT", "GOOG", "MKTX", "SPY"]
    
    # Test 1: Current Price for individual tickers
    for ticker in test_tickers:
        test_id = f"current_price_{ticker}"
        results["tests"][test_id] = {"status": "running"}
        
        try:
            start_time = time.time()
            price_data = await client.get_current_price(ticker)
            elapsed = time.time() - start_time
            
            if price_data:
                results["tests"][test_id].update({
                    "status": "success",
                    "elapsed_seconds": round(elapsed, 2),
                    "price": price_data.get("price"),
                    "day_open": price_data.get("day_open"),
                    "day_high": price_data.get("day_high"),
                    "day_low": price_data.get("day_low"),
                    "volume": price_data.get("volume"),
                    "timestamp": price_data.get("price_timestamp_str")
                })
            else:
                results["tests"][test_id].update({
                    "status": "no_data",
                    "elapsed_seconds": round(elapsed, 2)
                })
        except Exception as e:
            results["tests"][test_id].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__
            })
    
    # Test 2: Batch Prices
    test_id = "batch_prices"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        start_time = time.time()
        batch_data = await client.get_batch_prices(test_tickers)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "success",
            "elapsed_seconds": round(elapsed, 2),
            "tickers_returned": list(batch_data.keys()),
            "count": len(batch_data)
        })
        
        # Include sample data from one ticker if available
        if "AAPL" in batch_data:
            results["tests"][test_id]["sample_data"] = {
                "price": batch_data["AAPL"].get("price"),
                "timestamp": batch_data["AAPL"].get("price_timestamp_str")
            }
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        })
    
    # Test 3: Company Metrics
    test_id = "company_metrics"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        start_time = time.time()
        metrics = await client.get_company_metrics("AAPL")
        elapsed = time.time() - start_time
        
        if metrics and not metrics.get("not_found"):
            results["tests"][test_id].update({
                "status": "success",
                "elapsed_seconds": round(elapsed, 2),
                "company_name": metrics.get("company_name"),
                "sector": metrics.get("sector"),
                "pe_ratio": metrics.get("pe_ratio"),
                "metric_keys_count": len(metrics)
            })
        else:
            results["tests"][test_id].update({
                "status": "no_data",
                "elapsed_seconds": round(elapsed, 2)
            })
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        })
    
    # Test 4: Historical Prices
    test_id = "historical_prices"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        start_time = time.time()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        history = await client.get_historical_prices("AAPL", start_date, end_date)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "success",
            "elapsed_seconds": round(elapsed, 2),
            "data_points": len(history),
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d")
            }
        })
        
        # Include the first and last data point if available
        if history:
            results["tests"][test_id]["first_point"] = {
                "date": history[0].get("date").strftime("%Y-%m-%d") if history[0].get("date") else None,
                "close": history[0].get("close_price")
            }
            results["tests"][test_id]["last_point"] = {
                "date": history[-1].get("date").strftime("%Y-%m-%d") if history[-1].get("date") else None,
                "close": history[-1].get("close_price")
            }
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        })
    
    # Test 5: Batch Historical Prices
    test_id = "batch_historical"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        start_time = time.time()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)  # Just 7 days to keep it quick
        
        batch_history = await client.get_batch_historical_prices(["AAPL", "MSFT"], start_date, end_date)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "success",
            "elapsed_seconds": round(elapsed, 2),
            "tickers_returned": list(batch_history.keys()),
            "data_points": {ticker: len(data) for ticker, data in batch_history.items()}
        })
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        })
    
    return results

@app.get("/debug/test-yahoo-company-metrics")
async def test_yahoo_company_metrics():
    """
    Focused test for company metrics data from Yahoo Finance using multiple approaches
    """
    import requests
    import time
    import json
    import traceback
    from datetime import datetime
    
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Browser-like headers to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    # Test ticker
    test_ticker = "AAPL"
    
    # Test 1: Try the direct quoteSummary API endpoint (most reliable)
    test_id = "quote_summary_api"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{test_ticker}?modules=summaryProfile,summaryDetail,defaultKeyStatistics,assetProfile,price"
        
        start_time = time.time()
        response = requests.get(url, headers=headers, timeout=15)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", ""),
            "response_size": len(response.content)
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if we got valid data
                if "quoteSummary" in data and "result" in data["quoteSummary"]:
                    if data["quoteSummary"]["result"]:
                        # Success, we have data!
                        result_obj = data["quoteSummary"]["result"][0]
                        
                        # Log just enough data to understand structure without overwhelming
                        extracted_data = {
                            "modules_present": [],
                            "sample_fields": {}
                        }
                        
                        # Check which modules are present
                        if "summaryProfile" in result_obj:
                            extracted_data["modules_present"].append("summaryProfile")
                            profile = result_obj["summaryProfile"]
                            extracted_data["sample_fields"]["company_name"] = profile.get("shortName") or profile.get("longName")
                            extracted_data["sample_fields"]["sector"] = profile.get("sector")
                            extracted_data["sample_fields"]["industry"] = profile.get("industry")
                        
                        if "price" in result_obj:
                            extracted_data["modules_present"].append("price")
                            price = result_obj["price"]
                            extracted_data["sample_fields"]["current_price"] = price.get("regularMarketPrice", {}).get("raw") if isinstance(price.get("regularMarketPrice"), dict) else price.get("regularMarketPrice")
                        
                        if "summaryDetail" in result_obj:
                            extracted_data["modules_present"].append("summaryDetail")
                            details = result_obj["summaryDetail"]
                            extracted_data["sample_fields"]["pe_ratio"] = details.get("trailingPE", {}).get("raw") if isinstance(details.get("trailingPE"), dict) else details.get("trailingPE")
                        
                        if "defaultKeyStatistics" in result_obj:
                            extracted_data["modules_present"].append("defaultKeyStatistics")
                            stats = result_obj["defaultKeyStatistics"]
                            extracted_data["sample_fields"]["beta"] = stats.get("beta", {}).get("raw") if isinstance(stats.get("beta"), dict) else stats.get("beta")
                        
                        results["tests"][test_id]["extracted_data"] = extracted_data
                        results["tests"][test_id]["data_structure"] = "valid"
                    else:
                        # Empty result list
                        results["tests"][test_id]["data_structure"] = "empty_result_list"
                else:
                    # Missing expected structure
                    results["tests"][test_id]["data_structure"] = "invalid_structure"
                    results["tests"][test_id]["response_sample"] = str(data)[:500] + "..."
            except json.JSONDecodeError:
                # Not a valid JSON response
                results["tests"][test_id]["data_structure"] = "invalid_json"
                results["tests"][test_id]["response_sample"] = response.text[:500] + "..."
        else:
            # Non-200 status code
            results["tests"][test_id]["status"] = "failed"
            results["tests"][test_id]["error"] = f"HTTP {response.status_code}: {response.text[:200]}"
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 2: Try the yahooquery package
    test_id = "yahooquery_metrics"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        import yahooquery as yq
        
        start_time = time.time()
        ticker = yq.Ticker(test_ticker)
        
        # Try to get different data modules
        modules_results = {}
        try:
            asset_profile = ticker.asset_profile
            modules_results["asset_profile"] = {
                "success": True,
                "sample": str(asset_profile)[:100] + "..." if asset_profile else "No data"
            }
        except Exception as e:
            modules_results["asset_profile"] = {"success": False, "error": str(e)}
        
        try:
            financial_data = ticker.financial_data
            modules_results["financial_data"] = {
                "success": True,
                "sample": str(financial_data)[:100] + "..." if financial_data else "No data"
            }
        except Exception as e:
            modules_results["financial_data"] = {"success": False, "error": str(e)}
        
        try:
            key_stats = ticker.key_stats
            modules_results["key_stats"] = {
                "success": True,
                "sample": str(key_stats)[:100] + "..." if key_stats else "No data"
            }
        except Exception as e:
            modules_results["key_stats"] = {"success": False, "error": str(e)}
        
        try:
            summary_detail = ticker.summary_detail
            modules_results["summary_detail"] = {
                "success": True,
                "sample": str(summary_detail)[:100] + "..." if summary_detail else "No data"
            }
        except Exception as e:
            modules_results["summary_detail"] = {"success": False, "error": str(e)}
        
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "modules_results": modules_results,
            "overall_success": any(module["success"] for module in modules_results.values())
        })
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 3: Try yfinance package
    test_id = "yfinance_metrics"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        import yfinance as yf
        
        start_time = time.time()
        ticker = yf.Ticker(test_ticker)
        info = ticker.info
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "info_keys_count": len(info) if info else 0
        })
        
        # Include a sample of the info
        if info:
            sample_keys = ["shortName", "longName", "sector", "industry", 
                          "currentPrice", "marketCap", "trailingPE"]
            sample_info = {k: info.get(k) for k in sample_keys if k in info}
            results["tests"][test_id]["sample_info"] = sample_info
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 4: Try alternative HTTP-only approach with different parameters
    test_id = "alternative_api_approach"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        # Try a different URL format
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={test_ticker}"
        
        start_time = time.time()
        response = requests.get(url, headers=headers, timeout=15)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", ""),
            "response_size": len(response.content)
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if we got valid data
                if "quoteResponse" in data and "result" in data["quoteResponse"]:
                    if data["quoteResponse"]["result"]:
                        # Success, we have data!
                        quote = data["quoteResponse"]["result"][0]
                        
                        # Extract basic fields
                        extracted_data = {
                            "displayName": quote.get("displayName"),
                            "shortName": quote.get("shortName"),
                            "longName": quote.get("longName"),
                            "regularMarketPrice": quote.get("regularMarketPrice"),
                            "regularMarketChange": quote.get("regularMarketChange"),
                            "regularMarketChangePercent": quote.get("regularMarketChangePercent"),
                            "marketCap": quote.get("marketCap")
                        }
                        
                        results["tests"][test_id]["extracted_data"] = extracted_data
                        results["tests"][test_id]["fields_count"] = len(quote)
                    else:
                        # Empty result list
                        results["tests"][test_id]["data_structure"] = "empty_result_list"
                else:
                    # Missing expected structure
                    results["tests"][test_id]["data_structure"] = "invalid_structure"
                    results["tests"][test_id]["response_sample"] = str(data)[:500] + "..."
            except json.JSONDecodeError:
                # Not a valid JSON response
                results["tests"][test_id]["data_structure"] = "invalid_json"
                results["tests"][test_id]["response_sample"] = response.text[:500] + "..."
        else:
            # Non-200 status code
            results["tests"][test_id]["status"] = "failed"
            results["tests"][test_id]["error"] = f"HTTP {response.status_code}: {response.text[:200]}"
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Summary of findings
    results["summary"] = {
        "total_tests": len(results["tests"]),
        "successful_tests": sum(1 for test in results["tests"].values() if test.get("status") == "completed"),
        "best_approach": None
    }
    
    # Determine best approach
    best_elapsed = float('inf')
    for test_id, test in results["tests"].items():
        if test.get("status") == "completed" and test.get("elapsed_seconds", float('inf')) < best_elapsed:
            if ("extracted_data" in test or "sample_info" in test or 
                ("modules_results" in test and test.get("overall_success", False))):
                best_elapsed = test.get("elapsed_seconds", float('inf'))
                results["summary"]["best_approach"] = test_id
    
    # Recommendations
    results["recommendations"] = []
    
    # Check if we had any success
    if results["summary"]["successful_tests"] > 0:
        if results["summary"]["best_approach"]:
            results["recommendations"].append(f"Use the {results['summary']['best_approach']} approach for best results")
    else:
        results["recommendations"].append("All approaches failed - possible rate limiting or network issues")
        
    # Check for specific issues
    if any("rate" in test.get("error", "").lower() for test in results["tests"].values()):
        results["recommendations"].append("Evidence of rate limiting - implement exponential backoff and caching")
    
    if any(test.get("status_code", 0) == 403 for test in results["tests"].values()):
        results["recommendations"].append("HTTP 403 errors indicate IP blocking - consider proxies or VPN")
    
    return results

@app.get("/debug/test-yahoo-metrics")
async def test_yahoo_company_metrics():
    """
    Focused test for company metrics data from Yahoo Finance using multiple approaches
    """
    import requests
    import time
    import json
    import traceback
    from datetime import datetime
    
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Browser-like headers to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    # Test ticker
    test_ticker = "AAPL"
    
    # Test 1: Try the direct quoteSummary API endpoint (most reliable)
    test_id = "quote_summary_api"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{test_ticker}?modules=summaryProfile,summaryDetail,defaultKeyStatistics,assetProfile,price"
        
        start_time = time.time()
        response = requests.get(url, headers=headers, timeout=15)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", ""),
            "response_size": len(response.content)
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if we got valid data
                if "quoteSummary" in data and "result" in data["quoteSummary"]:
                    if data["quoteSummary"]["result"]:
                        # Success, we have data!
                        result_obj = data["quoteSummary"]["result"][0]
                        
                        # Log just enough data to understand structure without overwhelming
                        extracted_data = {
                            "modules_present": [],
                            "sample_fields": {}
                        }
                        
                        # Check which modules are present
                        if "summaryProfile" in result_obj:
                            extracted_data["modules_present"].append("summaryProfile")
                            profile = result_obj["summaryProfile"]
                            extracted_data["sample_fields"]["company_name"] = profile.get("shortName") or profile.get("longName")
                            extracted_data["sample_fields"]["sector"] = profile.get("sector")
                            extracted_data["sample_fields"]["industry"] = profile.get("industry")
                        
                        if "price" in result_obj:
                            extracted_data["modules_present"].append("price")
                            price = result_obj["price"]
                            extracted_data["sample_fields"]["current_price"] = price.get("regularMarketPrice", {}).get("raw") if isinstance(price.get("regularMarketPrice"), dict) else price.get("regularMarketPrice")
                        
                        if "summaryDetail" in result_obj:
                            extracted_data["modules_present"].append("summaryDetail")
                            details = result_obj["summaryDetail"]
                            extracted_data["sample_fields"]["pe_ratio"] = details.get("trailingPE", {}).get("raw") if isinstance(details.get("trailingPE"), dict) else details.get("trailingPE")
                        
                        if "defaultKeyStatistics" in result_obj:
                            extracted_data["modules_present"].append("defaultKeyStatistics")
                            stats = result_obj["defaultKeyStatistics"]
                            extracted_data["sample_fields"]["beta"] = stats.get("beta", {}).get("raw") if isinstance(stats.get("beta"), dict) else stats.get("beta")
                        
                        results["tests"][test_id]["extracted_data"] = extracted_data
                        results["tests"][test_id]["data_structure"] = "valid"
                    else:
                        # Empty result list
                        results["tests"][test_id]["data_structure"] = "empty_result_list"
                else:
                    # Missing expected structure
                    results["tests"][test_id]["data_structure"] = "invalid_structure"
                    results["tests"][test_id]["response_sample"] = str(data)[:500] + "..."
            except json.JSONDecodeError:
                # Not a valid JSON response
                results["tests"][test_id]["data_structure"] = "invalid_json"
                results["tests"][test_id]["response_sample"] = response.text[:500] + "..."
        else:
            # Non-200 status code
            results["tests"][test_id]["status"] = "failed"
            results["tests"][test_id]["error"] = f"HTTP {response.status_code}: {response.text[:200]}"
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 2: Try the yahooquery package
    test_id = "yahooquery_metrics"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        import yahooquery as yq
        
        start_time = time.time()
        ticker = yq.Ticker(test_ticker)
        
        # Try to get different data modules
        modules_results = {}
        try:
            asset_profile = ticker.asset_profile
            modules_results["asset_profile"] = {
                "success": True,
                "sample": str(asset_profile)[:100] + "..." if asset_profile else "No data"
            }
        except Exception as e:
            modules_results["asset_profile"] = {"success": False, "error": str(e)}
        
        try:
            financial_data = ticker.financial_data
            modules_results["financial_data"] = {
                "success": True,
                "sample": str(financial_data)[:100] + "..." if financial_data else "No data"
            }
        except Exception as e:
            modules_results["financial_data"] = {"success": False, "error": str(e)}
        
        try:
            key_stats = ticker.key_stats
            modules_results["key_stats"] = {
                "success": True,
                "sample": str(key_stats)[:100] + "..." if key_stats else "No data"
            }
        except Exception as e:
            modules_results["key_stats"] = {"success": False, "error": str(e)}
        
        try:
            summary_detail = ticker.summary_detail
            modules_results["summary_detail"] = {
                "success": True,
                "sample": str(summary_detail)[:100] + "..." if summary_detail else "No data"
            }
        except Exception as e:
            modules_results["summary_detail"] = {"success": False, "error": str(e)}
        
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "modules_results": modules_results,
            "overall_success": any(module["success"] for module in modules_results.values())
        })
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 3: Try yfinance package
    test_id = "yfinance_metrics"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        import yfinance as yf
        
        start_time = time.time()
        ticker = yf.Ticker(test_ticker)
        info = ticker.info
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "info_keys_count": len(info) if info else 0
        })
        
        # Include a sample of the info
        if info:
            sample_keys = ["shortName", "longName", "sector", "industry", 
                          "currentPrice", "marketCap", "trailingPE"]
            sample_info = {k: info.get(k) for k in sample_keys if k in info}
            results["tests"][test_id]["sample_info"] = sample_info
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Test 4: Try alternative HTTP-only approach with different parameters
    test_id = "alternative_api_approach"
    results["tests"][test_id] = {"status": "running"}
    
    try:
        # Try a different URL format
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={test_ticker}"
        
        start_time = time.time()
        response = requests.get(url, headers=headers, timeout=15)
        elapsed = time.time() - start_time
        
        results["tests"][test_id].update({
            "status": "completed",
            "elapsed_seconds": round(elapsed, 2),
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", ""),
            "response_size": len(response.content)
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if we got valid data
                if "quoteResponse" in data and "result" in data["quoteResponse"]:
                    if data["quoteResponse"]["result"]:
                        # Success, we have data!
                        quote = data["quoteResponse"]["result"][0]
                        
                        # Extract basic fields
                        extracted_data = {
                            "displayName": quote.get("displayName"),
                            "shortName": quote.get("shortName"),
                            "longName": quote.get("longName"),
                            "regularMarketPrice": quote.get("regularMarketPrice"),
                            "regularMarketChange": quote.get("regularMarketChange"),
                            "regularMarketChangePercent": quote.get("regularMarketChangePercent"),
                            "marketCap": quote.get("marketCap")
                        }
                        
                        results["tests"][test_id]["extracted_data"] = extracted_data
                        results["tests"][test_id]["fields_count"] = len(quote)
                    else:
                        # Empty result list
                        results["tests"][test_id]["data_structure"] = "empty_result_list"
                else:
                    # Missing expected structure
                    results["tests"][test_id]["data_structure"] = "invalid_structure"
                    results["tests"][test_id]["response_sample"] = str(data)[:500] + "..."
            except json.JSONDecodeError:
                # Not a valid JSON response
                results["tests"][test_id]["data_structure"] = "invalid_json"
                results["tests"][test_id]["response_sample"] = response.text[:500] + "..."
        else:
            # Non-200 status code
            results["tests"][test_id]["status"] = "failed"
            results["tests"][test_id]["error"] = f"HTTP {response.status_code}: {response.text[:200]}"
    except Exception as e:
        results["tests"][test_id].update({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
    
    # Summary of findings
    results["summary"] = {
        "total_tests": len(results["tests"]),
        "successful_tests": sum(1 for test in results["tests"].values() if test.get("status") == "completed"),
        "best_approach": None
    }
    
    # Determine best approach
    best_elapsed = float('inf')
    for test_id, test in results["tests"].items():
        if test.get("status") == "completed" and test.get("elapsed_seconds", float('inf')) < best_elapsed:
            if ("extracted_data" in test or "sample_info" in test or 
                ("modules_results" in test and test.get("overall_success", False))):
                best_elapsed = test.get("elapsed_seconds", float('inf'))
                results["summary"]["best_approach"] = test_id
    
    # Recommendations
    results["recommendations"] = []
    
    # Check if we had any success
    if results["summary"]["successful_tests"] > 0:
        if results["summary"]["best_approach"]:
            results["recommendations"].append(f"Use the {results['summary']['best_approach']} approach for best results")
    else:
        results["recommendations"].append("All approaches failed - possible rate limiting or network issues")
        
    # Check for specific issues
    if any("rate" in test.get("error", "").lower() for test in results["tests"].values()):
        results["recommendations"].append("Evidence of rate limiting - implement exponential backoff and caching")
    
    if any(test.get("status_code", 0) == 403 for test in results["tests"].values()):
        results["recommendations"].append("HTTP 403 errors indicate IP blocking - consider proxies or VPN")
    
    return results

@app.get("/debug/yahooquery-test")
async def test_yahooquery():
    """
    Test the YahooQueryClient standalone
    """
    try:
        from backend.api_clients.yahooquery_client import YahooQueryClient
        import time
        import pandas as pd
        import traceback
        
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {}
        }
        
        # Initialize the client
        try:
            client = YahooQueryClient()
            results["client_initialization"] = "success"
        except Exception as e:
            results["client_initialization"] = {
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            }
            return results  # Early return if we can't even create the client
        
        # Test tickers to check
        test_tickers = ["AAPL", "MSFT", "GOOG", "MKTX", "SPY"]
        
        # Test 1: Current Price for individual tickers
        for ticker in test_tickers[:2]:  # Limit to 2 tickers for quick testing
            test_id = f"current_price_{ticker}"
            results["tests"][test_id] = {"status": "running"}
            
            try:
                start_time = time.time()
                price_data = await client.get_current_price(ticker)
                elapsed = time.time() - start_time
                
                if price_data:
                    results["tests"][test_id].update({
                        "status": "success",
                        "elapsed_seconds": round(elapsed, 2),
                        "price": price_data.get("price"),
                        "day_open": price_data.get("day_open"),
                        "day_high": price_data.get("day_high"),
                        "day_low": price_data.get("day_low"),
                        "volume": price_data.get("volume"),
                        "timestamp": price_data.get("price_timestamp_str")
                    })
                else:
                    results["tests"][test_id].update({
                        "status": "no_data",
                        "elapsed_seconds": round(elapsed, 2)
                    })
            except Exception as e:
                results["tests"][test_id].update({
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "traceback": traceback.format_exc()
                })
        
        # Test 2: Batch Prices
        test_id = "batch_prices"
        results["tests"][test_id] = {"status": "running"}
        
        try:
            start_time = time.time()
            batch_data = await client.get_batch_prices(test_tickers[:3])  # Limit to 3 tickers
            elapsed = time.time() - start_time
            
            results["tests"][test_id].update({
                "status": "success",
                "elapsed_seconds": round(elapsed, 2),
                "tickers_returned": list(batch_data.keys()),
                "count": len(batch_data)
            })
            
            # Include sample data from one ticker if available
            if "AAPL" in batch_data:
                results["tests"][test_id]["sample_data"] = {
                    "price": batch_data["AAPL"].get("price"),
                    "timestamp": batch_data["AAPL"].get("price_timestamp_str")
                }
        except Exception as e:
            results["tests"][test_id].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            })
        
        # Test 3: Company Metrics
        test_id = "company_metrics"
        results["tests"][test_id] = {"status": "running"}
        
        try:
            start_time = time.time()
            metrics = await client.get_company_metrics("AAPL")
            elapsed = time.time() - start_time
            
            if metrics and not metrics.get("not_found"):
                results["tests"][test_id].update({
                    "status": "success",
                    "elapsed_seconds": round(elapsed, 2),
                    "company_name": metrics.get("company_name"),
                    "sector": metrics.get("sector"),
                    "pe_ratio": metrics.get("pe_ratio"),
                    "metric_keys_count": len(metrics)
                })
            else:
                results["tests"][test_id].update({
                    "status": "no_data",
                    "elapsed_seconds": round(elapsed, 2)
                })
        except Exception as e:
            results["tests"][test_id].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            })
        
        # Test 4: Historical Prices
        test_id = "historical_prices"
        results["tests"][test_id] = {"status": "running"}
        
        try:
            start_time = time.time()
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)  # Just 7 days to keep it quick
            
            history = await client.get_historical_prices("AAPL", start_date, end_date)
            elapsed = time.time() - start_time
            
            results["tests"][test_id].update({
                "status": "success",
                "elapsed_seconds": round(elapsed, 2),
                "data_points": len(history),
                "date_range": {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d")
                }
            })
            
            # Include the first and last data point if available
            if history:
                results["tests"][test_id]["first_point"] = {
                    "date": history[0].get("date").strftime("%Y-%m-%d") if history[0].get("date") else None,
                    "close": history[0].get("close_price")
                }
                results["tests"][test_id]["last_point"] = {
                    "date": history[-1].get("date").strftime("%Y-%m-%d") if history[-1].get("date") else None,
                    "close": history[-1].get("close_price")
                }
        except Exception as e:
            results["tests"][test_id].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            })
        
        # Test 5: Batch Historical Prices
        test_id = "batch_historical"
        results["tests"][test_id] = {"status": "running"}
        
        try:
            start_time = time.time()
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)  # Just 7 days to keep it quick
            
            batch_history = await client.get_batch_historical_prices(["AAPL", "MSFT"], start_date, end_date)
            elapsed = time.time() - start_time
            
            results["tests"][test_id].update({
                "status": "success",
                "elapsed_seconds": round(elapsed, 2),
                "tickers_returned": list(batch_history.keys()),
                "data_points": {ticker: len(data) for ticker, data in batch_history.items()}
            })
        except Exception as e:
            results["tests"][test_id].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            })
        
        return results
    
    except Exception as e:
        # Outer try/catch to capture any unexpected issues
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

@app.get("/debug/yahoo-client-performance-test")
async def test_yahoo_clients_performance():
    """
    Comprehensive performance test comparing all Yahoo Finance client implementations
    across different data retrieval methods.
    """
    try:
        from backend.api_clients.yahoo_finance_client import YahooFinanceClient
        from backend.api_clients.direct_yahoo_client import DirectYahooFinanceClient
        from backend.api_clients.yahooquery_client import YahooQueryClient
        import time
        import traceback
        
        # Initialize clients
        clients = {}
        client_init_status = {}
        
        try:
            yf_client = YahooFinanceClient()
            clients["yfinance"] = yf_client
            client_init_status["yfinance"] = "success"
        except Exception as e:
            client_init_status["yfinance"] = {
                "status": "error",
                "error": str(e)
            }
        
        try:
            direct_client = DirectYahooFinanceClient()
            clients["direct_yahoo"] = direct_client
            client_init_status["direct_yahoo"] = "success"
        except Exception as e:
            client_init_status["direct_yahoo"] = {
                "status": "error",
                "error": str(e)
            }
        
        try:
            yq_client = YahooQueryClient()
            clients["yahooquery"] = yq_client
            client_init_status["yahooquery"] = "success"
        except Exception as e:
            client_init_status["yahooquery"] = {
                "status": "error",
                "error": str(e)
            }
        
        if not clients:
            return {
                "status": "error",
                "message": "Could not initialize any clients",
                "initialization_status": client_init_status
            }
        
        test_tickers = ["AAPL", "MSFT", "GOOG", "AMZN", "META"]
        batch_tickers = test_tickers.copy()
        single_ticker = "AAPL"
        
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "test_configuration": {
                "test_tickers": test_tickers,
                "single_ticker": single_ticker,
                "batch_tickers": batch_tickers,
                "historical_days": 30
            },
            "client_initialization": client_init_status,
            "results_by_method": {},
            "results_by_client": {client: {} for client in clients.keys()},
            "overall_winner": None,
            "method_winners": {}
        }
        
        # Test 1: Get Current Price (Single Ticker)
        method = "get_current_price"
        results["results_by_method"][method] = {}
        
        for client_name, client in clients.items():
            try:
                start_time = time.time()
                price_data = await client.get_current_price(single_ticker)
                elapsed = time.time() - start_time
                
                success = price_data is not None
                price_value = price_data.get("price") if price_data else None
                
                results["results_by_method"][method][client_name] = {
                    "status": "success" if success else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "price": price_value
                }
                
                # Also record in client-specific results
                results["results_by_client"][client_name][method] = {
                    "status": "success" if success else "no_data",
                    "elapsed_seconds": round(elapsed, 4)
                }
            except Exception as e:
                results["results_by_method"][method][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                
                results["results_by_client"][client_name][method] = {
                    "status": "error",
                    "elapsed_seconds": None
                }
        
        # Test 2: Get Batch Prices
        method = "get_batch_prices"
        results["results_by_method"][method] = {}
        
        for client_name, client in clients.items():
            try:
                start_time = time.time()
                batch_data = await client.get_batch_prices(batch_tickers)
                elapsed = time.time() - start_time
                
                tickers_returned = list(batch_data.keys()) if batch_data else []
                success_count = len(tickers_returned)
                
                results["results_by_method"][method][client_name] = {
                    "status": "success" if success_count > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "tickers_returned": tickers_returned,
                    "count": success_count,
                    "pct_success": round((success_count / len(batch_tickers)) * 100, 1) if batch_tickers else 0
                }
                
                # Also record in client-specific results
                results["results_by_client"][client_name][method] = {
                    "status": "success" if success_count > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "count": success_count
                }
            except Exception as e:
                results["results_by_method"][method][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                
                results["results_by_client"][client_name][method] = {
                    "status": "error",
                    "elapsed_seconds": None
                }
        
        # Test 3: Get Company Metrics
        method = "get_company_metrics"
        results["results_by_method"][method] = {}
        
        for client_name, client in clients.items():
            try:
                start_time = time.time()
                metrics = await client.get_company_metrics(single_ticker)
                elapsed = time.time() - start_time
                
                success = metrics is not None and not metrics.get("not_found", False)
                fields_count = len(metrics) if metrics else 0
                
                results["results_by_method"][method][client_name] = {
                    "status": "success" if success else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "fields_count": fields_count,
                    "sample_fields": list(metrics.keys())[:5] if metrics else []
                }
                
                # Also record in client-specific results
                results["results_by_client"][client_name][method] = {
                    "status": "success" if success else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "fields_count": fields_count
                }
            except Exception as e:
                results["results_by_method"][method][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                
                results["results_by_client"][client_name][method] = {
                    "status": "error",
                    "elapsed_seconds": None
                }
        
        # Test 4: Get Historical Prices
        method = "get_historical_prices"
        results["results_by_method"][method] = {}
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        for client_name, client in clients.items():
            try:
                start_time = time.time()
                history = await client.get_historical_prices(single_ticker, start_date, end_date)
                elapsed = time.time() - start_time
                
                data_points = len(history) if history else 0
                
                results["results_by_method"][method][client_name] = {
                    "status": "success" if data_points > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "data_points": data_points,
                    "date_range": {
                        "start": start_date.strftime("%Y-%m-%d"),
                        "end": end_date.strftime("%Y-%m-%d")
                    }
                }
                
                # Also record in client-specific results
                results["results_by_client"][client_name][method] = {
                    "status": "success" if data_points > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "data_points": data_points
                }
            except Exception as e:
                results["results_by_method"][method][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                
                results["results_by_client"][client_name][method] = {
                    "status": "error",
                    "elapsed_seconds": None
                }
        
        # Test 5: Get Batch Historical Prices
        method = "get_batch_historical_prices"
        results["results_by_method"][method] = {}
        
        batch_historical_tickers = batch_tickers[:2]  # Limit to first 2 tickers to save time
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)  # Just 7 days to keep it quick
        
        for client_name, client in clients.items():
            try:
                start_time = time.time()
                batch_history = await client.get_batch_historical_prices(batch_historical_tickers, start_date, end_date)
                elapsed = time.time() - start_time
                
                tickers_returned = list(batch_history.keys()) if batch_history else []
                success_count = len(tickers_returned)
                
                total_data_points = sum(len(data) for data in batch_history.values()) if batch_history else 0
                
                results["results_by_method"][method][client_name] = {
                    "status": "success" if success_count > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "tickers_returned": tickers_returned,
                    "count": success_count,
                    "total_data_points": total_data_points,
                    "pct_success": round((success_count / len(batch_historical_tickers)) * 100, 1) if batch_historical_tickers else 0
                }
                
                # Also record in client-specific results
                results["results_by_client"][client_name][method] = {
                    "status": "success" if success_count > 0 else "no_data",
                    "elapsed_seconds": round(elapsed, 4),
                    "count": success_count,
                    "total_data_points": total_data_points
                }
            except Exception as e:
                results["results_by_method"][method][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                
                results["results_by_client"][client_name][method] = {
                    "status": "error",
                    "elapsed_seconds": None
                }
        
        # Find winners for each method
        for method, method_results in results["results_by_method"].items():
            # Filter only successful results
            successful_clients = {
                client: data for client, data in method_results.items() 
                if data.get("status") == "success"
            }
            
            if successful_clients:
                # Sort by elapsed time
                sorted_clients = sorted(
                    successful_clients.items(), 
                    key=lambda x: x[1].get("elapsed_seconds", float('inf'))
                )
                
                # Record winner
                winner = sorted_clients[0][0]
                winner_time = sorted_clients[0][1].get("elapsed_seconds")
                
                results["method_winners"][method] = {
                    "winner": winner,
                    "elapsed_seconds": winner_time
                }
                
                # Add ranking
                results["results_by_method"][method]["ranking"] = [
                    {"client": client, "elapsed_seconds": data.get("elapsed_seconds")}
                    for client, data in sorted_clients
                ]
        
        # Calculate overall winner
        client_scores = {client: 0 for client in clients.keys()}
        
        for method, winner_info in results["method_winners"].items():
            client_scores[winner_info["winner"]] += 1
        
        max_score = max(client_scores.values()) if client_scores else 0
        best_clients = [client for client, score in client_scores.items() if score == max_score]
        
        results["overall_winner"] = {
            "clients": best_clients,
            "methods_won": {client: client_scores[client] for client in best_clients}
        }
        
        # Create a summary
        results["summary"] = {
            "by_method": {},
            "by_client": {}
        }
        
        for method, method_results in results["results_by_method"].items():
            if "ranking" in method_results:
                ranking = method_results["ranking"]
                results["summary"]["by_method"][method] = {
                    "winner": ranking[0]["client"],
                    "winner_time": ranking[0]["elapsed_seconds"],
                    "all_times": {r["client"]: r["elapsed_seconds"] for r in ranking}
                }
        
        for client_name, client_results in results["results_by_client"].items():
            success_methods = {
                method: data for method, data in client_results.items() 
                if data.get("status") == "success"
            }
            
            avg_time = (
                sum(data.get("elapsed_seconds", 0) for data in success_methods.values()) / 
                len(success_methods)
            ) if success_methods else 0
            
            results["summary"]["by_client"][client_name] = {
                "successful_methods": len(success_methods),
                "average_time": round(avg_time, 4),
                "methods_won": client_scores.get(client_name, 0)
            }
        
        return results
    
    except Exception as e:
        # Provide detailed error information to help diagnose the issue
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

@app.get("/debug/test-metrics-update/{ticker}")
async def test_metrics_update(ticker: str, client_type: str = "direct", current_user: dict = Depends(get_current_user)):
    """
    Test method to debug company metrics update for a specific ticker with different client types.
    
    Args:
        ticker: The ticker symbol to test
        client_type: The client to test (direct, yahooquery, yfinance, or all)
        
    Returns:
        Detailed report of the metrics update operation
    """
    try:
        # Uppercase the ticker
        ticker = ticker.upper()
        
        # Get pre-update security data
        pre_update_query = """
        SELECT 
            ticker, company_name, sector, industry, market_cap,
            current_price, pe_ratio, forward_pe, beta,
            dividend_rate, dividend_yield, eps, forward_eps,
            last_metrics_update
        FROM securities 
        WHERE ticker = :ticker
        """
        pre_update_data = await database.fetch_one(pre_update_query, {"ticker": ticker})
        
        if not pre_update_data:
            return {
                "status": "error",
                "message": f"Ticker {ticker} not found in the database"
            }
        
        # Initialize clients based on type
        clients = {}
        
        if client_type in ["direct", "all"]:
            from backend.api_clients.direct_yahoo_client import DirectYahooFinanceClient
            clients["direct_yahoo"] = DirectYahooFinanceClient()
            
        if client_type in ["yahooquery", "all"]:
            from backend.api_clients.yahooquery_client import YahooQueryClient
            clients["yahooquery"] = YahooQueryClient()
            
        if client_type in ["yfinance", "all"]:
            from backend.api_clients.yahoo_finance_client import YahooFinanceClient
            clients["yahoo_finance"] = YahooFinanceClient()
            
        if not clients:
            return {
                "status": "error",
                "message": f"Invalid client type: {client_type}"
            }
        
        results = {
            "pre_update_data": dict(pre_update_data),
            "clients_tested": list(clients.keys()),
            "client_results": {},
            "post_update_data": None,
            "summary": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Test each client
        for client_name, client in clients.items():
            logger.info(f"Testing {client_name} for ticker {ticker}")
            
            try:
                # Get metrics from client
                metrics = await client.get_company_metrics(ticker)
                
                # Skip if metrics not found
                if not metrics or metrics.get("not_found"):
                    results["client_results"][client_name] = {
                        "status": "not_found",
                        "message": f"Metrics not found for {ticker} using {client_name}"
                    }
                    continue
                
                # Record the raw metrics data from client
                results["client_results"][client_name] = {
                    "status": "success",
                    "raw_metrics": metrics
                }
                
                # Prepare data for database update with safe type handling
                update_values = {
                    "ticker": ticker,
                    "metrics_source": client_name,
                    "last_metrics_update": datetime.utcnow()
                }
                
                # Fields to map and convert safely
                column_mapping = {
                    "company_name": (str, 255),  # Type, max length
                    "sector": (str, 100),
                    "industry": (str, 100),
                    "market_cap": (float, None),
                    "current_price": (float, None),
                    "pe_ratio": (float, None),
                    "forward_pe": (float, None),
                    "beta": (float, None),
                    "dividend_rate": (float, None),
                    "dividend_yield": (float, None),
                    "eps": (float, None),
                    "forward_eps": (float, None)
                }
                
                # Extract and convert fields
                for db_field, (type_func, max_length) in column_mapping.items():
                    value = None
                    
                    # Check if field exists in metrics (using various possible field name variations)
                    possible_fields = [db_field]
                    if db_field == "company_name":
                        possible_fields.extend(["shortName", "longName", "name"])
                        
                    # Try all possible field names
                    for field in possible_fields:
                        if field in metrics and metrics[field] is not None:
                            raw_value = metrics[field]
                            
                            # Handle case where value is in a 'raw' sub-object (common in Yahoo API)
                            if isinstance(raw_value, dict) and 'raw' in raw_value:
                                raw_value = raw_value['raw']
                                
                            # Try to convert to appropriate type
                            try:
                                if type_func == str:
                                    value = str(raw_value)
                                    if max_length and len(value) > max_length:
                                        value = value[:max_length]
                                elif type_func == float:
                                    value = float(raw_value)
                                # Add more type conversions as needed
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert {field} value '{raw_value}' to {type_func.__name__}")
                                value = None
                            
                            # If we got a value, we're done looking for this field
                            if value is not None:
                                break
                    
                    # Only add to update values if not None
                    if value is not None:
                        update_values[db_field] = value
                
                # Log what we're going to update
                results["client_results"][client_name]["update_values"] = update_values
                
                # Construct dynamic SQL update statement
                set_clauses = []
                for field, value in update_values.items():
                    if field != "ticker":  # Skip the ticker as it's for the WHERE clause
                        set_clauses.append(f"{field} = :{field}")
                
                update_query = f"""
                UPDATE securities 
                SET {", ".join(set_clauses)}
                WHERE ticker = :ticker
                """
                
                # Execute the update
                await database.execute(update_query, update_values)
                results["client_results"][client_name]["update_result"] = "success"
                
            except Exception as e:
                logger.error(f"Error testing {client_name} for {ticker}: {str(e)}")
                import traceback
                trace = traceback.format_exc()
                
                results["client_results"][client_name] = {
                    "status": "error",
                    "error": str(e),
                    "traceback": trace
                }
                
        # Get post-update security data
        post_update_data = await database.fetch_one(pre_update_query, {"ticker": ticker})
        results["post_update_data"] = dict(post_update_data) if post_update_data else None
        
        # Compare pre and post data
        if pre_update_data and post_update_data:
            changes = {}
            for field in pre_update_data.keys():
                pre_value = pre_update_data[field]
                post_value = post_update_data[field]
                
                if pre_value != post_value:
                    changes[field] = {
                        "before": pre_value,
                        "after": post_value
                    }
            
            results["summary"]["changes"] = changes
            results["summary"]["changed_fields_count"] = len(changes)
            
        return results
                
    except Exception as e:
        logger.error(f"Error in metrics update test: {str(e)}")
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/debug/test-yahoo-direct")
async def test_yahoo_direct():
    """
    Direct HTTP request test to check if Yahoo Finance APIs are accessible
    """
    import requests
    import time
    import json
    
    results = {
        "status": "running direct test",
        "tests": {}
    }
    
    # Several endpoints to test different aspects of Yahoo connectivity
    test_urls = {
        "yahoo_finance_quote": "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d",
        "yahoo_finance_search": "https://query1.finance.yahoo.com/v1/finance/search?q=AAPL",
        "yahoo_main": "https://finance.yahoo.com/quote/AAPL",
        "google": "https://www.google.com",  # Control test
    }
    
    # Use a browser-like user agent
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }
    
    for name, url in test_urls.items():
        try:
            results["tests"][name] = {
                "url": url,
                "status": "attempting"
            }
            
            start_time = time.time()
            response = requests.get(url, headers=headers, timeout=10)
            elapsed = time.time() - start_time
            
            results["tests"][name].update({
                "status_code": response.status_code,
                "elapsed_seconds": round(elapsed, 2),
                "response_size": len(response.content),
                "headers": dict(response.headers),
            })
            
            # For APIs that return JSON, include a sample
            if "application/json" in response.headers.get("Content-Type", ""):
                try:
                    json_data = response.json()
                    # Just provide a snippet to avoid large responses
                    if isinstance(json_data, dict):
                        results["tests"][name]["json_keys"] = list(json_data.keys())
                    elif isinstance(json_data, list) and len(json_data) > 0:
                        results["tests"][name]["json_sample"] = "Array with " + str(len(json_data)) + " items"
                except:
                    results["tests"][name]["json_parse_error"] = True
            
        except Exception as e:
            results["tests"][name].update({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__
            })
    
    # Test if manual parsing might work better than YFinance
    try:
        manual_result = requests.get("https://finance.yahoo.com/quote/AAPL", headers=headers, timeout=10)
        if manual_result.status_code == 200:
            # Look for the price in the HTML (very crude but effective test)
            html = manual_result.text
            import re
            
            # Try to find the current price in the HTML
            price_pattern = r'data-reactid="\d+">(\d+\.\d+)</span>'
            price_match = re.search(price_pattern, html)
            
            if price_match:
                results["manual_parsing"] = {
                    "success": True,
                    "found_price_pattern": True,
                    "price": price_match.group(1)
                }
            else:
                results["manual_parsing"] = {
                    "success": True,
                    "found_price_pattern": False,
                    "html_sample": html[:500] + "..." # Just a sample
                }
        else:
            results["manual_parsing"] = {
                "success": False,
                "status_code": manual_result.status_code
            }
    except Exception as e:
        results["manual_parsing"] = {
            "success": False,
            "error": str(e)
        }
    
    return results

# Add data consistency endpoints
@app.get("/admin/data-consistency/check")
async def check_data_consistency(current_user: dict = Depends(get_current_user)):
    """Run a data consistency check and return the results"""
    try:
        monitor = DataConsistencyMonitor()
        results = await monitor.check_data_consistency()
        return {
            "message": "Data consistency check completed",
            "issues_count": results["issues_count"],
            "results": results
        }
    except Exception as e:
        logger.error(f"Error checking data consistency: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check data consistency: {str(e)}"
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
            account_id, coin_type, coin_symbol, quantity, purchase_price, current_price, 
            purchase_date, storage_type, exchange_name, wallet_address, notes, tags, is_favorite
        ) VALUES (
            :account_id, :coin_type, :coin_symbol, :quantity, :purchase_price, :current_price,
            :purchase_date, :storage_type, :exchange_name, :wallet_address, :notes, :tags, :is_favorite
        ) RETURNING id
        """
        values = {
            "account_id": account_id,
            "coin_type": position.coin_type,
            "coin_symbol": position.coin_symbol,
            "quantity": position.quantity,
            "purchase_price": position.purchase_price,
            "current_price": position.current_price,
            "purchase_date": datetime.strptime(position.purchase_date, "%Y-%m-%d").date() if position.purchase_date else None,
            "storage_type": position.storage_type,
            "exchange_name": position.exchange_name if position.storage_type == "Exchange" else None,
            "wallet_address": position.wallet_address if position.storage_type != "Exchange" else None,
            "notes": position.notes,
            "tags": tags_value,
            "is_favorite": position.is_favorite
        }
        
        result = await database.fetch_one(query=query, values=values)
        position_id = result["id"]
        
        # Update account balance (optional, if you track balances per account)
        position_value = position.quantity * position.current_price
        update_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] + position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_query)
        
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
        SELECT cp.*, a.user_id, a.balance, a.id as account_id
        FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Calculate old and new values for account balance update
        old_value = position_data["quantity"] * position_data["current_price"]
        new_value = (position.quantity or position_data["quantity"]) * (position.current_price or position_data["current_price"])
        value_difference = new_value - old_value
        
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
            
            # Update account balance (optional)
            if value_difference != 0:
                account_id = position_data["account_id"]
                account_balance = position_data["balance"]
                
                update_account_query = accounts.update().where(
                    accounts.c.id == account_id
                ).values(
                    balance=account_balance + value_difference,
                    updated_at=datetime.utcnow()
                )
                await database.execute(update_account_query)
        
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
        SELECT cp.*, a.user_id, a.balance, a.id as account_id
        FROM crypto_positions cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Calculate value for account balance adjustment
        position_value = position_data["quantity"] * position_data["current_price"]
        
        # Delete the position
        delete_query = """
        DELETE FROM crypto_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Update account balance (optional)
        account_id = position_data["account_id"]
        account_balance = position_data["balance"]
        
        update_account_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account_balance - position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_account_query)
        
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
        
        # Calculate position value
        position_value = position.quantity * position.purchase_price
        
        # Update account balance (optional)
        update_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account["balance"] + position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_query)
        
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
        SELECT mp.*, a.user_id, a.balance, a.id as account_id
        FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id
        WHERE mp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Calculate old and new values for account balance update
        old_value = position_data["quantity"] * position_data["purchase_price"]
        new_purchase_price = position.purchase_price if position.purchase_price is not None else position_data["purchase_price"]
        new_quantity = position.quantity if position.quantity is not None else position_data["quantity"]
        new_value = new_quantity * new_purchase_price
        value_difference = new_value - old_value
        
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
            
            # Update account balance (optional)
            if value_difference != 0:
                account_id = position_data["account_id"]
                account_balance = position_data["balance"]
                
                update_account_query = accounts.update().where(
                    accounts.c.id == account_id
                ).values(
                    balance=account_balance + value_difference,
                    updated_at=datetime.utcnow()
                )
                await database.execute(update_account_query)
        
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
        SELECT mp.*, a.user_id, a.balance, a.id as account_id
        FROM metal_positions mp
        JOIN accounts a ON mp.account_id = a.id
        WHERE mp.id = :position_id
        """
        position_data = await database.fetch_one(query=check_query, values={"position_id": position_id})
        
        if not position_data or position_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or access denied")
        
        # Calculate value for account balance adjustment
        position_value = position_data["quantity"] * position_data["purchase_price"]
        
        # Delete the position
        delete_query = """
        DELETE FROM metal_positions WHERE id = :position_id
        """
        await database.execute(query=delete_query, values={"position_id": position_id})
        
        # Update account balance (optional)
        account_id = position_data["account_id"]
        account_balance = position_data["balance"]
        
        update_account_query = accounts.update().where(
            accounts.c.id == account_id
        ).values(
            balance=account_balance - position_value,
            updated_at=datetime.utcnow()
        )
        await database.execute(update_account_query)
        
        return {"message": "Metal position deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting metal position: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete metal position: {str(e)}")


@app.post("/admin/data-consistency/fix")
async def fix_data_consistency(current_user: dict = Depends(get_current_user)):
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