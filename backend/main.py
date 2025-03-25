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
database = databases.Database(DATABASE_URL)
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

# Define Positions Table
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

# Create Database Engine
engine = sqlalchemy.create_engine(DATABASE_URL)
metadata.create_all(engine)

# Initialize FastAPI App
app = FastAPI(title="NestEgg API", description="Investment portfolio tracking API")

# List of allowed origins
allowed_origins = [
    "https://nestegg-prod.vercel.app",  # Your production Vercel app
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

class AccountCreate(BaseModel):
    account_name: str
    institution: Optional[str] = None
    type: Optional[str] = None
    balance: float = 0.0

class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    institution: Optional[str] = None
    type: Optional[str] = None

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


# API Endpoints
@app.get("/")
async def read_root():
    return {"message": "Welcome to NestEgg API!", "version": "1.0.0"}

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

@app.get("/user")
async def get_user_data(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"], 
        "id": current_user["id"]
    }

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