# backend/services/newsletter_service.py
"""
Newsletter generation and sending service.
Generates personalized financial summary emails for users.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import databases
from decimal import Decimal

from backend.services.email_service import email_service

logger = logging.getLogger(__name__)

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")


def format_currency(value: Any) -> str:
    """Format a number as currency."""
    if value is None:
        return "$0.00"
    try:
        num = float(value)
        if num >= 0:
            return f"${num:,.2f}"
        else:
            return f"-${abs(num):,.2f}"
    except (ValueError, TypeError):
        return "$0.00"


def format_percentage(value: Any) -> str:
    """Format a number as percentage."""
    if value is None:
        return "0.00%"
    try:
        num = float(value)
        sign = "+" if num > 0 else ""
        return f"{sign}{num:.2f}%"
    except (ValueError, TypeError):
        return "0.00%"


def format_change(value: Any, is_percentage: bool = False) -> str:
    """Format a change value with color indicator."""
    if value is None:
        return "0.00" if not is_percentage else "0.00%"
    try:
        num = float(value)
        if is_percentage:
            return format_percentage(num)
        else:
            return format_currency(num)
    except (ValueError, TypeError):
        return "0.00" if not is_percentage else "0.00%"


def get_change_color(value: Any) -> str:
    """Get CSS color based on positive/negative value."""
    if value is None:
        return "#9ca3af"  # gray
    try:
        num = float(value)
        if num > 0:
            return "#22c55e"  # green
        elif num < 0:
            return "#ef4444"  # red
        else:
            return "#9ca3af"  # gray
    except (ValueError, TypeError):
        return "#9ca3af"


class NewsletterService:
    """Service for generating and sending financial newsletters."""

    def __init__(self, database: databases.Database):
        self.database = database

    async def get_subscribed_users(self, frequency: str = "daily") -> List[Dict[str, Any]]:
        """
        Get all users subscribed to newsletters with the specified frequency.

        Args:
            frequency: 'daily', 'weekly', or 'monthly'

        Returns:
            List of user dicts with id, email, first_name, notification_preferences
        """
        query = """
        SELECT id, email, first_name, last_name, notification_preferences
        FROM users
        WHERE notification_preferences->>'newsletterUpdates' = 'true'
          AND (notification_preferences->>'newsletterFrequency' = :frequency
               OR (notification_preferences->>'newsletterFrequency' IS NULL AND :frequency = 'weekly'))
        """
        try:
            results = await self.database.fetch_all(query, {"frequency": frequency})
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error fetching subscribed users: {str(e)}")
            return []

    async def get_user_portfolio_summary(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest portfolio summary for a user.

        Args:
            user_id: User ID

        Returns:
            Portfolio summary dict or None
        """
        query = """
        WITH latest_date AS (
            SELECT MAX(snapshot_date) as max_date
            FROM rept_net_worth_trend_summary
            WHERE user_id = :user_id
        )
        SELECT * FROM rept_net_worth_trend_summary
        WHERE user_id = :user_id
          AND snapshot_date = (SELECT max_date FROM latest_date)
        """
        try:
            result = await self.database.fetch_one(query, {"user_id": user_id})
            if result:
                summary = dict(result)
                # Convert Decimal types to float for JSON serialization
                for key, value in summary.items():
                    if isinstance(value, Decimal):
                        summary[key] = float(value)
                return summary
            return None
        except Exception as e:
            logger.error(f"Error fetching portfolio summary for user {user_id}: {str(e)}")
            return None

    async def get_user_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all accounts for a user with their current values.

        Args:
            user_id: User ID

        Returns:
            List of account dicts
        """
        query = """
        SELECT
            a.id,
            a.name,
            a.institution,
            a.account_type,
            a.account_subtype,
            COALESCE(av.total_value, 0) as current_value,
            COALESCE(av.total_cost_basis, 0) as cost_basis,
            COALESCE(av.unrealized_gain_loss, 0) as unrealized_gain,
            COALESCE(av.unrealized_gain_loss_percent, 0) as unrealized_gain_percent
        FROM accounts a
        LEFT JOIN rept_account_value_summary av ON a.id = av.account_id
        WHERE a.user_id = :user_id
        ORDER BY COALESCE(av.total_value, 0) DESC
        """
        try:
            results = await self.database.fetch_all(query, {"user_id": user_id})
            accounts = []
            for row in results:
                account = dict(row)
                for key, value in account.items():
                    if isinstance(value, Decimal):
                        account[key] = float(value)
                accounts.append(account)
            return accounts
        except Exception as e:
            logger.error(f"Error fetching accounts for user {user_id}: {str(e)}")
            return []

    async def get_period_changes(self, user_id: str) -> Dict[str, Any]:
        """
        Get net worth changes over different periods.

        Args:
            user_id: User ID

        Returns:
            Dict with period changes
        """
        periods = {
            "1d": 1,
            "1w": 7,
            "1m": 30,
            "ytd": None  # Special handling
        }

        changes = {}

        try:
            # Get latest and historical snapshots
            for period_name, days in periods.items():
                if period_name == "ytd":
                    # Get first day of year
                    query = """
                    SELECT net_worth, snapshot_date
                    FROM rept_net_worth_trend_summary
                    WHERE user_id = :user_id
                      AND EXTRACT(YEAR FROM snapshot_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                    ORDER BY snapshot_date ASC
                    LIMIT 1
                    """
                else:
                    query = """
                    SELECT net_worth, snapshot_date
                    FROM rept_net_worth_trend_summary
                    WHERE user_id = :user_id
                      AND snapshot_date <= CURRENT_DATE - INTERVAL ':days days'
                    ORDER BY snapshot_date DESC
                    LIMIT 1
                    """.replace(":days", str(days))

                result = await self.database.fetch_one(query, {"user_id": user_id})

                if result:
                    changes[period_name] = {
                        "previous_value": float(result["net_worth"]) if result["net_worth"] else 0,
                        "date": result["snapshot_date"].strftime("%Y-%m-%d") if result["snapshot_date"] else None
                    }
                else:
                    changes[period_name] = None

            return changes
        except Exception as e:
            logger.error(f"Error fetching period changes for user {user_id}: {str(e)}")
            return {}

    def generate_commentary(self, summary: Dict[str, Any], accounts: List[Dict[str, Any]]) -> str:
        """
        Generate dynamic, personalized commentary based on portfolio data.

        Args:
            summary: Portfolio summary dict
            accounts: List of account dicts

        Returns:
            HTML commentary string
        """
        commentaries = []

        net_worth = summary.get("net_worth", 0) or 0
        total_assets = summary.get("total_assets", 0) or 0
        total_liabilities = summary.get("total_liabilities", 0) or 0

        # Net worth commentary
        if net_worth > 1000000:
            commentaries.append("Your net worth has crossed the million-dollar milestone. Keep up the excellent work!")
        elif net_worth > 500000:
            commentaries.append("You're on track toward financial independence with a strong half-million+ net worth.")
        elif net_worth > 100000:
            commentaries.append("Great progress! Your net worth is building a solid foundation for future growth.")

        # Asset allocation commentary
        liquid_assets = summary.get("liquid_assets", 0) or 0
        if total_assets > 0:
            liquid_ratio = (liquid_assets / total_assets) * 100
            if liquid_ratio > 80:
                commentaries.append("Your portfolio is highly liquid, giving you flexibility for opportunities.")
            elif liquid_ratio < 30:
                commentaries.append("Consider reviewing your liquidity - most of your assets are in illiquid holdings.")

        # Liability commentary
        if total_liabilities > 0 and total_assets > 0:
            debt_ratio = (total_liabilities / total_assets) * 100
            if debt_ratio > 50:
                commentaries.append("Your debt-to-asset ratio is elevated. Prioritizing debt reduction could strengthen your position.")
            elif debt_ratio < 20:
                commentaries.append("Excellent debt management - you're maintaining a healthy debt-to-asset ratio.")

        # Unrealized gains commentary
        unrealized_gain = summary.get("liquid_unrealized_gain", 0) or 0
        if unrealized_gain > 10000:
            commentaries.append(f"Your investments have generated {format_currency(unrealized_gain)} in unrealized gains.")
        elif unrealized_gain < -5000:
            commentaries.append("Some of your positions are showing unrealized losses. Consider reviewing your holdings.")

        # Account diversity
        if len(accounts) >= 5:
            commentaries.append(f"You're tracking {len(accounts)} accounts, showing good diversification across institutions.")
        elif len(accounts) == 1:
            commentaries.append("Consider diversifying across multiple accounts and institutions for added security.")

        # Default commentary if none generated
        if not commentaries:
            commentaries.append("Your portfolio is steady. Consistent contributions will help you reach your goals.")

        return " ".join(commentaries[:3])  # Limit to 3 commentaries

    def generate_newsletter_html(
        self,
        user: Dict[str, Any],
        summary: Dict[str, Any],
        accounts: List[Dict[str, Any]],
        commentary: str
    ) -> str:
        """
        Generate the full newsletter HTML.

        Args:
            user: User dict with name and email
            summary: Portfolio summary dict
            accounts: List of account dicts
            commentary: Generated commentary string

        Returns:
            Complete HTML email string
        """
        first_name = user.get("first_name") or "there"

        # Format summary values
        net_worth = format_currency(summary.get("net_worth", 0))
        total_assets = format_currency(summary.get("total_assets", 0))
        total_liabilities = format_currency(summary.get("total_liabilities", 0))
        liquid_assets = format_currency(summary.get("liquid_assets", 0))

        # Period changes
        nw_1d_change = summary.get("net_worth_1d_change", 0) or 0
        nw_1w_change = summary.get("net_worth_1w_change", 0) or 0
        nw_1m_change = summary.get("net_worth_1m_change", 0) or 0

        nw_1d_pct = summary.get("net_worth_1d_change_pct", 0) or 0
        nw_1w_pct = summary.get("net_worth_1w_change_pct", 0) or 0
        nw_1m_pct = summary.get("net_worth_1m_change_pct", 0) or 0

        # Unrealized gains
        unrealized_gain = summary.get("liquid_unrealized_gain", 0) or 0
        unrealized_gain_pct = summary.get("liquid_unrealized_gain_percent", 0) or 0

        # Generate accounts table rows
        accounts_rows = ""
        for acc in accounts[:10]:  # Limit to top 10 accounts
            gain_color = get_change_color(acc.get("unrealized_gain", 0))
            accounts_rows += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #374151;">
                    <strong style="color: #f3f4f6;">{acc.get('name', 'Unknown')}</strong><br>
                    <span style="color: #9ca3af; font-size: 12px;">{acc.get('institution', '')} - {acc.get('account_type', '')}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #374151; text-align: right;">
                    <span style="color: #f3f4f6; font-weight: 600;">{format_currency(acc.get('current_value', 0))}</span><br>
                    <span style="color: {gain_color}; font-size: 12px;">{format_change(acc.get('unrealized_gain', 0))} ({format_percentage(acc.get('unrealized_gain_percent', 0))})</span>
                </td>
            </tr>
            """

        # Get today's date
        today = datetime.now().strftime("%B %d, %Y")

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NestEgg Portfolio Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 1px solid #1e293b;">
            <h1 style="margin: 0; color: #3b82f6; font-size: 28px;">NestEgg</h1>
            <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Your Portfolio Summary for {today}</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 30px 0;">
            <h2 style="margin: 0 0 15px; color: #f3f4f6; font-size: 22px;">Hi {first_name},</h2>
            <p style="margin: 0; color: #cbd5e1; line-height: 1.6;">
                {commentary}
            </p>
        </div>

        <!-- Net Worth Card -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; color: #c4b5fd; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Net Worth</p>
            <h2 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700;">{net_worth}</h2>
            <div style="margin-top: 20px; display: flex; gap: 20px;">
                <div>
                    <p style="margin: 0; color: #c4b5fd; font-size: 12px;">1 Day</p>
                    <p style="margin: 4px 0 0; color: {get_change_color(nw_1d_change)}; font-weight: 600;">{format_change(nw_1d_change)} ({format_percentage(nw_1d_pct)})</p>
                </div>
                <div>
                    <p style="margin: 0; color: #c4b5fd; font-size: 12px;">1 Week</p>
                    <p style="margin: 4px 0 0; color: {get_change_color(nw_1w_change)}; font-weight: 600;">{format_change(nw_1w_change)} ({format_percentage(nw_1w_pct)})</p>
                </div>
                <div>
                    <p style="margin: 0; color: #c4b5fd; font-size: 12px;">1 Month</p>
                    <p style="margin: 4px 0 0; color: {get_change_color(nw_1m_change)}; font-weight: 600;">{format_change(nw_1m_change)} ({format_percentage(nw_1m_pct)})</p>
                </div>
            </div>
        </div>

        <!-- Balance Summary -->
        <div style="background-color: #1e293b; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 20px; color: #f3f4f6; font-size: 18px;">Balance Summary</h3>
            <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #0f172a; border-radius: 8px;">
                    <span style="color: #94a3b8;">Total Assets</span>
                    <span style="color: #22c55e; font-weight: 600;">{total_assets}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #0f172a; border-radius: 8px;">
                    <span style="color: #94a3b8;">Total Liabilities</span>
                    <span style="color: #ef4444; font-weight: 600;">{total_liabilities}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #0f172a; border-radius: 8px;">
                    <span style="color: #94a3b8;">Liquid Assets</span>
                    <span style="color: #3b82f6; font-weight: 600;">{liquid_assets}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #0f172a; border-radius: 8px;">
                    <span style="color: #94a3b8;">Unrealized Gains</span>
                    <span style="color: {get_change_color(unrealized_gain)}; font-weight: 600;">{format_currency(unrealized_gain)} ({format_percentage(unrealized_gain_pct)})</span>
                </div>
            </div>
        </div>

        <!-- Accounts Table -->
        <div style="background-color: #1e293b; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 20px; color: #f3f4f6; font-size: 18px;">Account Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #374151;">Account</th>
                        <th style="padding: 12px; text-align: right; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #374151;">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts_rows}
                </tbody>
            </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; padding: 20px 0;">
            <a href="{os.getenv('FRONTEND_URL', 'https://app.nestegg.com')}/portfolio"
               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Full Portfolio
            </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #1e293b; margin-top: 20px;">
            <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">
                You're receiving this because you subscribed to NestEgg portfolio updates.
            </p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">
                <a href="{os.getenv('FRONTEND_URL', 'https://app.nestegg.com')}/profile" style="color: #3b82f6; text-decoration: none;">Manage preferences</a>
                &nbsp;|&nbsp;
                <a href="{os.getenv('FRONTEND_URL', 'https://app.nestegg.com')}/profile?unsubscribe=newsletter" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
        """

        return html

    async def generate_and_send_newsletter(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate and send a newsletter to a single user.

        Args:
            user: User dict with id, email, first_name

        Returns:
            Result dict with status
        """
        user_id = user["id"]
        email = user["email"]

        try:
            # Get portfolio data
            summary = await self.get_user_portfolio_summary(user_id)
            if not summary:
                logger.info(f"No portfolio data for user {user_id}, skipping newsletter")
                return {"status": "skipped", "reason": "no_data", "user_id": user_id}

            accounts = await self.get_user_accounts(user_id)

            # Generate commentary
            commentary = self.generate_commentary(summary, accounts)

            # Generate HTML
            html = self.generate_newsletter_html(user, summary, accounts, commentary)

            # Send email
            today = datetime.now().strftime("%B %d, %Y")
            subject = f"Your NestEgg Portfolio Summary - {today}"

            result = await email_service.send_email(
                to=email,
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "newsletter"}]
            )

            return {
                "status": result.get("status"),
                "user_id": user_id,
                "email": email,
                "message_id": result.get("id")
            }

        except Exception as e:
            logger.error(f"Error generating newsletter for user {user_id}: {str(e)}")
            return {"status": "error", "error": str(e), "user_id": user_id}

    async def send_newsletters(self, frequency: str = "daily") -> Dict[str, Any]:
        """
        Send newsletters to all subscribed users.

        Args:
            frequency: 'daily', 'weekly', or 'monthly'

        Returns:
            Batch result dict
        """
        logger.info(f"Starting {frequency} newsletter send...")

        # Get subscribed users
        users = await self.get_subscribed_users(frequency)
        logger.info(f"Found {len(users)} users subscribed to {frequency} newsletters")

        if not users:
            return {"status": "completed", "total": 0, "sent": 0, "skipped": 0, "errors": 0}

        results = []
        for user in users:
            result = await self.generate_and_send_newsletter(user)
            results.append(result)

        sent_count = sum(1 for r in results if r.get("status") == "sent")
        skipped_count = sum(1 for r in results if r.get("status") == "skipped")
        error_count = sum(1 for r in results if r.get("status") == "error")

        logger.info(f"Newsletter send completed: {sent_count} sent, {skipped_count} skipped, {error_count} errors")

        return {
            "status": "completed",
            "frequency": frequency,
            "total": len(users),
            "sent": sent_count,
            "skipped": skipped_count,
            "errors": error_count,
            "results": results
        }
