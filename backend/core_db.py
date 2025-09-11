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
    sqlalchemy.Column("email", sqlalchemy.Text, unique=True, nullable=False),
    sqlalchemy.Column("password_hash", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("first_name", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("last_name", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("is_admin", sqlalchemy.Boolean, nullable=True, server_default=sqlalchemy.text("false")),
    sqlalchemy.Column("phone", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("occupation", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("date_of_birth", sqlalchemy.Date, nullable=True),
    sqlalchemy.Column("bio", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("address", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("city", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("state", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("zip_code", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("country", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime(timezone=True), server_default=sqlalchemy.text("now()")),
    sqlalchemy.Column("subscription_plan", sqlalchemy.Text, nullable=True, server_default=sqlalchemy.text("'basic'::text")),
    sqlalchemy.Column("notification_preferences", sqlalchemy.dialects.postgresql.JSONB, nullable=True,
                      server_default=sqlalchemy.text(
                          '\'{"emailUpdates": true, "marketAlerts": true, "securityAlerts": true, "newsletterUpdates": false, "performanceReports": true}\'::jsonb'
                      )),
    sqlalchemy.Column("clerk_id", sqlalchemy.String, unique=True, nullable=True),
    sqlalchemy.Column("image_url", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("auth_provider", sqlalchemy.String, nullable=True, server_default=sqlalchemy.text("'legacy'::character varying")),
)

