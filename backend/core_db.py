# backend/core_db.py
import os
import databases
import sqlalchemy

DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL, statement_cache_size=0)
metadata = sqlalchemy.MetaData()

users = sqlalchemy.Table(
    "users", metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("email", sqlalchemy.String, unique=True, nullable=False),
    sqlalchemy.Column("password_hash", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("clerk_id", sqlalchemy.String, unique=True, nullable=True),
    sqlalchemy.Column("auth_provider", sqlalchemy.String, nullable=False, server_default="legacy"),
    sqlalchemy.Column("subscription_plan", sqlalchemy.String, nullable=False, server_default="free"),
)
